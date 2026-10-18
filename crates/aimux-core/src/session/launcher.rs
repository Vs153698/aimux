use std::path::{Path, PathBuf};
use std::process::Command;
use crate::error::{AimuxError, Result};

pub struct ExternalLauncher;

impl ExternalLauncher {
    /// Launches an external terminal running the specified AIMux command line
    #[cfg(target_os = "macos")]
    pub fn launch(
        _command_title: &str,
        working_dir: &Path,
        env_vars: &[(String, String)],
        cmd_args: &[String],
    ) -> Result<u32> {
        let temp_dir = std::env::temp_dir();
        let path: PathBuf = temp_dir.join(format!("aimux_term_{}.sh", uuid::Uuid::new_v4()));

        let mut script_content = String::from("#!/bin/bash\n");
        script_content.push_str(&format!("cd \"{}\" || exit\n", working_dir.display()));
        for (k, v) in env_vars {
            script_content.push_str(&format!("export {}=\"{}\"\n", k, v.replace('"', "\\\"")));
        }
        
        let quoted_cmd = cmd_args
            .iter()
            .map(|arg| format!("\"{}\"", arg.replace('"', "\\\"")))
            .collect::<Vec<_>>()
            .join(" ");

        script_content.push_str(&format!("{}\n", quoted_cmd));
        script_content.push_str("echo ''\n");
        script_content.push_str("echo '[AIMux Session Ended. Press Enter to close]'\n");
        script_content.push_str("read -r\n");

        std::fs::write(&path, script_content)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions::<&Path>(&path, std::fs::Permissions::from_mode(0o755));
        }

        // Prefer Terminal.app using AppleScript to open and run
        let apple_script = format!(
            "tell application \"Terminal\" to do script \"bash '{}'\"",
            path.display()
        );

        let status = Command::new("osascript")
            .args(["-e", &apple_script])
            .status()
            .map_err(|e| AimuxError::PtyError(format!("Failed to open Terminal.app: {}", e)))?;

        if !status.success() {
            return Err(AimuxError::PtyError(format!(
                "osascript failed to launch Terminal with status {:?}",
                status.code()
            )));
        }

        // Return placeholder PID (Terminal.app launches it in an asynchronous tab)
        Ok(0)
    }

    #[cfg(target_os = "linux")]
    pub fn launch(
        _command_title: &str,
        working_dir: &Path,
        env_vars: &[(String, String)],
        cmd_args: &[String],
    ) -> Result<u32> {
        let term = std::env::var("TERMINAL").unwrap_or_else(|_| "x-terminal-emulator".into());
        let mut cmd = Command::new(term);
        cmd.current_dir(working_dir);
        for (k, v) in env_vars {
            cmd.env(k, v);
        }
        cmd.args(["-e"]).args(cmd_args);
        let child = cmd.spawn().map_err(|e| AimuxError::PtyError(e.to_string()))?;
        Ok(child.id())
    }

    #[cfg(target_os = "windows")]
    pub fn launch(
        command_title: &str,
        working_dir: &Path,
        env_vars: &[(String, String)],
        cmd_args: &[String],
    ) -> Result<u32> {
        let mut cmd = Command::new("cmd.exe");
        cmd.current_dir(working_dir);
        for (k, v) in env_vars {
            cmd.env(k, v);
        }
        cmd.args(["/c", "start", command_title]).args(cmd_args);
        let child = cmd.spawn().map_err(|e| AimuxError::PtyError(e.to_string()))?;
        Ok(child.id())
    }
}
