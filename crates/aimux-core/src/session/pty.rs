use std::path::Path;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, Child, PtySize};
use crate::error::{AimuxError, Result};

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn Child + Send>,
}

impl PtySession {
    pub fn spawn(
        command: &[String],
        env_vars: &[(String, String)],
        cwd: &Path,
        rows: u16,
        cols: u16,
    ) -> Result<Self> {
        if command.is_empty() {
            return Err(AimuxError::PtyError("Command vector is empty".into()));
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AimuxError::PtyError(format!("Failed to open PTY: {}", e)))?;

        let mut cmd = CommandBuilder::new(&command[0]);
        for arg in &command[1..] {
            cmd.arg(arg);
        }
        cmd.cwd(cwd);

        for (k, v) in env_vars {
            cmd.env(k, v);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AimuxError::PtyError(format!("Failed to spawn command in PTY: {}", e)))?;

        Ok(Self {
            master: pair.master,
            child,
        })
    }

    pub fn take_writer(&self) -> Result<Box<dyn std::io::Write + Send>> {
        self.master
            .take_writer()
            .map_err(|e| AimuxError::PtyError(format!("Failed to take PTY writer: {}", e)))
    }

    pub fn try_clone_reader(&self) -> Result<Box<dyn std::io::Read + Send>> {
        self.master
            .try_clone_reader()
            .map_err(|e| AimuxError::PtyError(format!("Failed to clone PTY reader: {}", e)))
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<()> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AimuxError::PtyError(format!("Failed to resize PTY: {}", e)))
    }

    pub fn process_id(&self) -> Option<u32> {
        self.child.process_id()
    }
}

