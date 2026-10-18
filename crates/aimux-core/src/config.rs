use std::path::{Path, PathBuf};
use std::fs;
use crate::error::{AimuxError, Result};

#[derive(Debug, Clone)]
pub struct AimuxConfig {
    pub base_dir: PathBuf,
}

impl AimuxConfig {
    pub fn default_location() -> Result<Self> {
        let base_dir = if let Ok(val) = std::env::var("AIMUX_HOME") {
            PathBuf::from(val)
        } else if let Some(user_dirs) = directories::BaseDirs::new() {
            user_dirs.home_dir().join(".aimux")
        } else {
            return Err(AimuxError::InvalidPath(
                "HOME".into(),
                "Cannot resolve home directory".into(),
            ));
        };

        let cfg = Self { base_dir };
        cfg.ensure_dirs()?;
        Ok(cfg)
    }

    pub fn custom(base_dir: impl AsRef<Path>) -> Result<Self> {
        let cfg = Self {
            base_dir: base_dir.as_ref().to_path_buf(),
        };
        cfg.ensure_dirs()?;
        Ok(cfg)
    }

    pub fn profiles_file(&self) -> PathBuf {
        self.base_dir.join("profiles.json")
    }

    pub fn lock_file(&self) -> PathBuf {
        self.base_dir.join("profiles.lock")
    }

    pub fn profiles_dir(&self) -> PathBuf {
        self.base_dir.join("profiles")
    }

    pub fn sessions_dir(&self) -> PathBuf {
        self.base_dir.join("sessions")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.base_dir.join("logs")
    }

    pub fn backups_dir(&self) -> PathBuf {
        self.base_dir.join("backups")
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        let dirs = [
            &self.base_dir,
            &self.profiles_dir(),
            &self.sessions_dir(),
            &self.logs_dir(),
            &self.backups_dir(),
        ];

        for d in dirs {
            if !d.exists() {
                fs::create_dir_all(d)?;
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = fs::set_permissions(d, fs::Permissions::from_mode(0o700));
                }
            }
        }

        Ok(())
    }
}
