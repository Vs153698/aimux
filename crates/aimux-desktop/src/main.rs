#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;

use aimux_core::adapters::{get_adapter, DiagnosticItem};
use aimux_core::config::AimuxConfig;
use aimux_core::session::pty::PtySession;
use aimux_core::session::SessionSupervisor;
use aimux_core::storage::{ProfileMetadata, ProfileStore, ProviderType, SessionMetadata, SessionStatus, TerminalMode};
use portable_pty::{Child, MasterPty};
use tauri::{AppHandle, Emitter, State};

struct PtySessionHandle {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    child: Arc<Mutex<Box<dyn Child + Send>>>,
    history: Arc<Mutex<Vec<u8>>>,
}

#[allow(dead_code)]
struct AppState {
    config: AimuxConfig,
    store: ProfileStore,
    supervisor: SessionSupervisor,
    embedded_ptys: Mutex<HashMap<String, PtySessionHandle>>,
}

#[tauri::command]
fn list_profiles(state: State<'_, AppState>) -> Result<Vec<ProfileMetadata>, String> {
    state.store.list().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_profile(
    state: State<'_, AppState>,
    name: String,
    provider: String,
    default_workspace: Option<String>,
    color_tag: Option<String>,
    git_name: Option<String>,
    git_email: Option<String>,
    ssh_key_path: Option<String>,
) -> Result<ProfileMetadata, String> {
    let provider_type = match provider.to_lowercase().as_str() {
        "claude_code" | "claude" => ProviderType::ClaudeCode,
        "google_antigravity" | "antigravity" | "agy" => ProviderType::GoogleAntigravity,
        _ => return Err(format!("Unsupported provider '{}'", provider)),
    };

    let ws = default_workspace.map(PathBuf::from);
    let mut profile = state
        .store
        .create(&name, provider_type, ws, color_tag)
        .map_err(|e| e.to_string())?;

    let mut changed = false;
    if let Some(gn) = git_name.filter(|s| !s.trim().is_empty()) {
        profile.git_name = Some(gn);
        changed = true;
    }
    if let Some(ge) = git_email.filter(|s| !s.trim().is_empty()) {
        profile.git_email = Some(ge);
        changed = true;
    }
    if let Some(sk) = ssh_key_path.filter(|s| !s.trim().is_empty()).map(PathBuf::from) {
        profile.ssh_key_path = Some(sk);
        changed = true;
    }

    if changed {
        state.store.update(&profile).map_err(|e| e.to_string())?;
    }

    Ok(profile)
}

#[tauri::command]
fn update_profile_git(
    state: State<'_, AppState>,
    id: String,
    git_name: Option<String>,
    git_email: Option<String>,
    ssh_key_path: Option<String>,
) -> Result<ProfileMetadata, String> {
    let mut profile = state.store.get(&id).map_err(|e| e.to_string())?;
    profile.git_name = git_name.filter(|s| !s.trim().is_empty());
    profile.git_email = git_email.filter(|s| !s.trim().is_empty());
    profile.ssh_key_path = ssh_key_path.filter(|s| !s.trim().is_empty()).map(PathBuf::from);
    state.store.update(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
fn remove_profile(state: State<'_, AppState>, id: String, purge: Option<bool>) -> Result<(), String> {
    state.store.remove(&id, purge.unwrap_or(false)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_profile_workspace(
    state: State<'_, AppState>,
    id: String,
    workspace: Option<String>,
) -> Result<ProfileMetadata, String> {
    let mut profile = state.store.get(&id).map_err(|e| e.to_string())?;
    profile.default_workspace = workspace.filter(|w| !w.trim().is_empty()).map(PathBuf::from);
    state.store.update(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
async fn verify_profile(state: State<'_, AppState>, id: String) -> Result<ProfileMetadata, String> {
    let mut profile = state.store.get(&id).map_err(|e| e.to_string())?;

    let adapter = get_adapter(profile.provider);
    let identity = adapter
        .verify_identity(&profile.profile_dir)
        .await
        .map_err(|e| e.to_string())?;

    profile.verified_identity = identity;
    profile.last_used_at = chrono::Utc::now().timestamp();

    state.store.update(&profile).map_err(|e| e.to_string())?;

    Ok(profile)
}

#[tauri::command]
fn list_sessions(state: State<'_, AppState>) -> Result<Vec<SessionMetadata>, String> {
    state.supervisor.list_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_session(app: AppHandle, state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.supervisor.stop_session(&session_id).map_err(|e| e.to_string())?;

    let mut ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = ptys.remove(&session_id) {
        if let Ok(mut child) = handle.child.lock() {
            let _ = child.kill();
        }
    }
    let _ = app.emit(&format!("pty-output-{}", session_id), "\r\n\x1b[31m[Session terminated by user]\x1b[0m\r\n".to_string());
    Ok(())
}

#[tauri::command]
fn delete_session(app: AppHandle, state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let _ = state.supervisor.stop_session(&session_id);

    let mut ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = ptys.remove(&session_id) {
        if let Ok(mut child) = handle.child.lock() {
            let _ = child.kill();
        }
    }
    let _ = app.emit(&format!("pty-output-{}", session_id), "\r\n\x1b[31m[Session removed]\x1b[0m\r\n".to_string());
    state.supervisor.delete_session(&session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_exited_sessions(state: State<'_, AppState>) -> Result<(), String> {
    state.supervisor.clear_exited_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
async fn launch_session(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    workspace: Option<String>,
    external: Option<bool>,
    custom_command: Option<Vec<String>>,
) -> Result<SessionMetadata, String> {
    let profile = state.store.get(&profile_id).map_err(|e| e.to_string())?;

    let cwd = if let Some(ws) = workspace {
        let p = PathBuf::from(&ws);
        if ws.trim().is_empty() || p == PathBuf::from("/") {
            profile.default_workspace.clone().unwrap_or_else(|| {
                directories::BaseDirs::new()
                    .map(|d| d.home_dir().to_path_buf())
                    .unwrap_or_else(|| PathBuf::from("."))
            })
        } else {
            p
        }
    } else if let Some(ref d) = profile.default_workspace {
        d.clone()
    } else {
        directories::BaseDirs::new()
            .map(|d| d.home_dir().to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."))
    };

    let is_external = external.unwrap_or(false);

    if is_external {
        state
            .supervisor
            .launch_session(&profile, Some(cwd), custom_command, TerminalMode::External)
            .await
            .map_err(|e| e.to_string())
    } else {
        // Embedded PTY session
        let adapter = get_adapter(profile.provider);
        let mut session_env = adapter
            .build_session_env(&profile.profile_dir, &cwd, custom_command)
            .await
            .map_err(|e| e.to_string())?;
        profile.inject_git_env(&mut session_env.env_vars);

        let pty = PtySession::spawn(&session_env.command, &session_env.env_vars, &session_env.working_dir, 30, 100)
            .map_err(|e| e.to_string())?;
        let pid = pty.process_id().unwrap_or(0);
        let session_id = uuid::Uuid::new_v4().to_string();

        let writer = pty.take_writer().map_err(|e| e.to_string())?;
        let mut reader = pty.try_clone_reader().map_err(|e| e.to_string())?;
        let child = pty.child;
        let master = pty.master;

        let history = Arc::new(Mutex::new(Vec::<u8>::new()));
        let history_clone = history.clone();

        let session_handle = PtySessionHandle {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(master)),
            child: Arc::new(Mutex::new(child)),
            history: history.clone(),
        };

        let session = SessionMetadata {
            session_id: session_id.clone(),
            profile_id: profile.id.clone(),
            provider: profile.provider,
            pid,
            cwd: session_env.working_dir,
            command: session_env.command.join(" "),
            started_at: chrono::Utc::now().timestamp(),
            status: SessionStatus::Running,
            exit_code: None,
            terminal_mode: TerminalMode::Embedded,
        };

        {
            state.supervisor.save_session(&session).map_err(|e| e.to_string())?;

            let mut ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
            ptys.insert(session_id.clone(), session_handle);
        }

        // Spawn async reader thread to buffer output and emit PTY events to Tauri frontend
        let event_name = format!("pty-output-{}", session_id);
        let app_handle = app.clone();
        let session_id_clone = session_id.clone();
        let profile_id_clone = profile.id.clone();
        let profile_name_clone = profile.name.clone();
        let provider_clone = profile.provider;
        let cwd_str_clone = cwd.to_string_lossy().to_string();

        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            let mut rate_limit_alerted = false;
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let bytes = &buffer[..n];
                        if let Ok(mut hist) = history_clone.lock() {
                            hist.extend_from_slice(bytes);
                            if hist.len() > 1_048_576 {
                                let start = hist.len() - 1_048_576;
                                *hist = hist[start..].to_vec();
                            }
                        }
                        let text = String::from_utf8_lossy(bytes).to_string();
                        let _ = app_handle.emit(&event_name, &text);

                        if !rate_limit_alerted {
                            if let Some(reason) = aimux_core::session::detect_rate_limit(&text) {
                                rate_limit_alerted = true;
                                let alert_payload = serde_json::json!({
                                    "session_id": session_id_clone,
                                    "profile_id": profile_id_clone,
                                    "profile_name": profile_name_clone,
                                    "provider": provider_clone.as_str(),
                                    "reason": reason,
                                    "cwd": cwd_str_clone,
                                });
                                let _ = app_handle.emit("rate-limit-detected", alert_payload);
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(session)
    }
}

#[tauri::command]
fn read_pty_history(state: State<'_, AppState>, session_id: String) -> Result<String, String> {
    let ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = ptys.get(&session_id) {
        let hist = handle.history.lock().map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&hist).to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn write_pty_input(state: State<'_, AppState>, session_id: String, input: String) -> Result<(), String> {
    let ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = ptys.get(&session_id) {
        let mut writer = handle.writer.lock().map_err(|e| e.to_string())?;
        writer.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("No embedded PTY session found for ID '{}'", session_id))
    }
}

#[tauri::command]
fn resize_pty(state: State<'_, AppState>, session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = ptys.get(&session_id) {
        let master = handle.master.lock().map_err(|e| e.to_string())?;
        master
            .resize(portable_pty::PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("No embedded PTY session found for ID '{}'", session_id))
    }
}

#[tauri::command]
async fn get_diagnostics() -> Result<Vec<DiagnosticItem>, String> {
    let claude = get_adapter(ProviderType::ClaudeCode);
    let antigravity = get_adapter(ProviderType::GoogleAntigravity);

    let mut items = Vec::new();
    if let Ok(c_diag) = claude.diagnose().await {
        items.extend(c_diag);
    }
    if let Ok(a_diag) = antigravity.diagnose().await {
        items.extend(a_diag);
    }
    Ok(items)
}

#[tauri::command]
async fn pick_directory() -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Select Project Directory")
        .pick_folder()
        .await;
    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[derive(serde::Serialize, serde::Deserialize)]
struct HandoffPreview {
    source_session_id: String,
    source_profile_id: String,
    source_profile_name: String,
    source_provider: String,
    cwd: String,
    context_markdown: String,
    available_target_profiles: Vec<ProfileMetadata>,
}

#[tauri::command]
fn prepare_handoff_context(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<HandoffPreview, String> {
    let session = state.supervisor.get_session(&session_id).map_err(|e| e.to_string())?;
    let profile = state.store.get(&session.profile_id).map_err(|e| e.to_string())?;

    let pty_history = {
        let ptys = state.embedded_ptys.lock().map_err(|e| e.to_string())?;
        if let Some(h) = ptys.get(&session_id) {
            if let Ok(hist) = h.history.lock() {
                String::from_utf8_lossy(&hist).to_string()
            } else {
                String::new()
            }
        } else {
            String::new()
        }
    };

    let context_markdown = aimux_core::session::generate_handoff_context(
        &session.cwd,
        &profile.name,
        profile.provider.display_name(),
        &pty_history,
        "Capacity threshold reached / user initiated handoff",
    );

    let all_profiles = state.store.list().map_err(|e| e.to_string())?;
    let available_target_profiles = all_profiles
        .into_iter()
        .filter(|p| p.id != profile.id)
        .collect();

    Ok(HandoffPreview {
        source_session_id: session_id,
        source_profile_id: profile.id,
        source_profile_name: profile.name,
        source_provider: profile.provider.as_str().to_string(),
        cwd: session.cwd.to_string_lossy().to_string(),
        context_markdown,
        available_target_profiles,
    })
}

#[tauri::command]
async fn execute_handoff(
    app: AppHandle,
    state: State<'_, AppState>,
    source_session_id: String,
    target_profile_id: String,
    context_markdown: String,
) -> Result<SessionMetadata, String> {
    let source_session = state.supervisor.get_session(&source_session_id).map_err(|e| e.to_string())?;
    let cwd = source_session.cwd.clone();

    // 1. Terminate old rate-limited session
    let _ = stop_session(app.clone(), state.clone(), source_session_id);

    // 2. Launch target profile in same working directory
    let new_session = launch_session(
        app.clone(),
        state.clone(),
        target_profile_id,
        Some(cwd.to_string_lossy().to_string()),
        Some(false), // embedded mode
        None,
    ).await?;

    // 3. Save handoff context to `.aimux-handoff.md` in repository
    let handoff_file = cwd.join(".aimux-handoff.md");
    let _ = std::fs::write(&handoff_file, &context_markdown);

    // 4. Inject notification banner into target PTY stream after 600ms
    let session_id_clone = new_session.session_id.clone();
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(600)).await;
        let banner = format!(
            "\r\n\x1b[1;36m[AIMux Cross-Provider Handoff Active]\x1b[0m\r\n\x1b[90mContext saved to .aimux-handoff.md. Repository diff & goals preserved.\x1b[0m\r\n\r\n"
        );
        let _ = app_clone.emit(&format!("pty-output-{}", session_id_clone), banner);
    });

    Ok(new_session)
}

fn main() {
    let config = AimuxConfig::default_location().expect("Failed to load AIMux configuration");
    let store = ProfileStore::new(config.clone());
    let supervisor = SessionSupervisor::new(config.clone());

    let app_state = AppState {
        config,
        store,
        supervisor,
        embedded_ptys: Mutex::new(HashMap::new()),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            list_profiles,
            create_profile,
            remove_profile,
            update_profile_workspace,
            update_profile_git,
            verify_profile,
            list_sessions,
            stop_session,
            delete_session,
            clear_exited_sessions,
            launch_session,
            read_pty_history,
            write_pty_input,
            resize_pty,
            get_diagnostics,
            pick_directory,
            prepare_handoff_context,
            execute_handoff,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AIMux desktop application");
}
