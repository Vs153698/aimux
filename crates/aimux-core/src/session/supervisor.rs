use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;

use crate::config::AimuxConfig;
use crate::error::{AimuxError, Result};
use crate::session::launcher::ExternalLauncher;
use crate::session::pty::PtySession;
use crate::storage::models::{ProfileMetadata, SessionMetadata, SessionStatus, TerminalMode};
use crate::adapters::get_adapter;

pub struct SessionSupervisor {
    config: AimuxConfig,
}

impl SessionSupervisor {
    pub fn new(config: AimuxConfig) -> Self {
        Self { config }
    }

    /// Launch a new terminal session for the given profile
    pub async fn launch_session(
        &self,
        profile: &ProfileMetadata,
        workspace_dir: Option<PathBuf>,
        custom_command: Option<Vec<String>>,
        mode: TerminalMode,
    ) -> Result<SessionMetadata> {
        let cwd = if let Some(ws) = workspace_dir {
            ws
        } else if let Some(ref def) = profile.default_workspace {
            def.clone()
        } else {
            std::env::current_dir()?
        };

        let adapter = get_adapter(profile.provider);
        let session_env = adapter
            .build_session_env(&profile.profile_dir, &cwd, custom_command)
            .await?;

        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let (pid, cmd_str) = match mode {
            TerminalMode::External => {
                let cmd_str = session_env.command.join(" ");
                let pid = ExternalLauncher::launch(
                    &format!("AIMux: {}", profile.name),
                    &session_env.working_dir,
                    &session_env.env_vars,
                    &session_env.command,
                )?;
                (pid, cmd_str)
            }
            TerminalMode::Embedded => {
                let cmd_str = session_env.command.join(" ");
                let pty_session = PtySession::spawn(
                    &session_env.command,
                    &session_env.env_vars,
                    &session_env.working_dir,
                    24,
                    80,
                )?;
                let pid = pty_session.child.process_id().unwrap_or(0);
                (pid, cmd_str)
            }
        };

        let metadata = SessionMetadata {
            session_id: session_id.clone(),
            profile_id: profile.id.clone(),
            provider: profile.provider,
            pid,
            cwd: session_env.working_dir,
            command: cmd_str,
            started_at: now,
            status: SessionStatus::Running,
            exit_code: None,
            terminal_mode: mode,
        };

        self.save_session(&metadata)?;
        Ok(metadata)
    }

    pub fn save_session(&self, session: &SessionMetadata) -> Result<()> {
        let path = self.config.sessions_dir().join(format!("{}.json", session.session_id));
        let bytes = serde_json::to_vec_pretty(session)?;
        let mut file = File::create(&path)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        Ok(())
    }

    pub fn get_session(&self, session_id: &str) -> Result<SessionMetadata> {
        let path = self.config.sessions_dir().join(format!("{}.json", session_id));
        if !path.exists() {
            return Err(AimuxError::SessionError(format!("Session {} not found", session_id)));
        }
        let content = fs::read_to_string(path)?;
        let mut session: SessionMetadata = serde_json::from_str(&content)?;
        self.refresh_session_liveness(&mut session);
        Ok(session)
    }

    pub fn list_sessions(&self) -> Result<Vec<SessionMetadata>> {
        let mut list = Vec::new();
        let dir = self.config.sessions_dir();
        if !dir.exists() {
            return Ok(list);
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(mut session) = serde_json::from_str::<SessionMetadata>(&content) {
                        self.refresh_session_liveness(&mut session);
                        list.push(session);
                    }
                }
            }
        }

        list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        Ok(list)
    }

    pub fn stop_session(&self, session_id: &str) -> Result<SessionMetadata> {
        let mut session = self.get_session(session_id)?;
        if session.status == SessionStatus::Running && session.pid > 0 {
            #[cfg(unix)]
            {
                unsafe {
                    let pid = session.pid as i32;
                    // First try SIGTERM on process and process group
                    let _ = libc::kill(-pid, libc::SIGTERM);
                    let _ = libc::kill(pid, libc::SIGTERM);

                    std::thread::sleep(std::time::Duration::from_millis(50));

                    // If process is still alive, force kill with SIGKILL
                    if libc::kill(pid, 0) == 0 {
                        let _ = libc::kill(-pid, libc::SIGKILL);
                        let _ = libc::kill(pid, libc::SIGKILL);
                    }
                }
            }
            #[cfg(windows)]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/PID", &session.pid.to_string(), "/T", "/F"])
                    .status();
            }
            session.status = SessionStatus::Exited;
            session.exit_code = Some(137); // 128 + 9 (SIGKILL)
            self.save_session(&session)?;
        }
        Ok(session)
    }

    pub fn delete_session(&self, session_id: &str) -> Result<()> {
        let _ = self.stop_session(session_id);
        let path = self.config.sessions_dir().join(format!("{}.json", session_id));
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }

    pub fn clear_exited_sessions(&self) -> Result<()> {
        let dir = self.config.sessions_dir();
        if !dir.exists() {
            return Ok(());
        }
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(mut session) = serde_json::from_str::<SessionMetadata>(&content) {
                        self.refresh_session_liveness(&mut session);
                        if session.status != SessionStatus::Running {
                            let _ = fs::remove_file(&path);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn refresh_session_liveness(&self, session: &mut SessionMetadata) {
        if session.status == SessionStatus::Running && session.pid > 0 {
            #[cfg(unix)]
            {
                // Check if process still exists via kill(pid, 0)
                let exists = unsafe { libc::kill(session.pid as i32, 0) == 0 };
                if !exists {
                    session.status = SessionStatus::Exited;
                    let _ = self.save_session(session);
                }
            }
        }
    }
}
