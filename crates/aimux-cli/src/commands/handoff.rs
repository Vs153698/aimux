use std::path::PathBuf;
use colored::Colorize;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::ProfileStore;
use aimux_core::session::SessionSupervisor;

pub async fn run_handoff(
    config: &AimuxConfig,
    to_profile: &str,
    from_profile_or_session: Option<String>,
    custom_cwd: Option<PathBuf>,
    external: bool,
) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let supervisor = SessionSupervisor::new(config.clone());

    let target_profile = store.get(to_profile)?;

    let cwd = match custom_cwd {
        Some(d) => d,
        None => std::env::current_dir()?,
    };

    let mut source_name = "Previous AI Session".to_string();
    let mut source_provider = "AI Provider".to_string();
    let mut source_session_id = None;

    if let Some(from) = from_profile_or_session {
        if let Ok(sess) = supervisor.get_session(&from) {
            source_session_id = Some(sess.session_id.clone());
            if let Ok(prof) = store.get(&sess.profile_id) {
                source_name = prof.name;
                source_provider = prof.provider.display_name().to_string();
            }
        } else if let Ok(prof) = store.get(&from) {
            source_name = prof.name;
            source_provider = prof.provider.display_name().to_string();
            if let Ok(sessions) = supervisor.list_sessions() {
                for s in sessions {
                    if s.profile_id == prof.id && s.status == aimux_core::storage::SessionStatus::Running {
                        source_session_id = Some(s.session_id);
                        break;
                    }
                }
            }
        }
    } else {
        // Detect active session in current directory
        if let Ok(sessions) = supervisor.list_sessions() {
            for s in sessions {
                if s.cwd == cwd && s.status == aimux_core::storage::SessionStatus::Running {
                    source_session_id = Some(s.session_id.clone());
                    if let Ok(prof) = store.get(&s.profile_id) {
                        source_name = prof.name;
                        source_provider = prof.provider.display_name().to_string();
                    }
                    break;
                }
            }
        }
    }

    println!("{}", "=== AIMux Cross-Provider Context Handoff ===".bold().cyan());
    println!("  From:             {} ({})", source_name, source_provider);
    println!("  To:               {} ({})", target_profile.name.bold(), target_profile.provider.display_name().green());
    println!("  Directory:        {}", cwd.display());

    // 1. Generate handoff context (git status + diff + continuation directive)
    let context_markdown = aimux_core::session::generate_handoff_context(
        &cwd,
        &source_name,
        &source_provider,
        "",
        "CLI command handoff / quota failover",
    );

    // 2. Write .aimux-handoff.md
    let handoff_path = cwd.join(".aimux-handoff.md");
    std::fs::write(&handoff_path, &context_markdown)?;
    println!("{} Generated handoff context file: {}", "✔".green().bold(), handoff_path.display().to_string().cyan());

    // 3. Stop old session if active
    if let Some(sid) = source_session_id {
        if let Ok(_) = supervisor.stop_session(&sid) {
            println!("{} Terminated previous session {}", "✔".green().bold(), sid.dimmed());
        }
    }

    // 4. Launch target provider in same directory
    println!("{} Launching target provider: {}", "✔".green().bold(), target_profile.name.bold());
    crate::commands::launch::run_launch(config, &target_profile.name, Some(cwd), external, None).await?;

    Ok(())
}
