use std::fs::{File, OpenOptions};
use std::path::Path;
use fs2::FileExt;
use crate::error::{AimuxError, Result};

pub struct AimuxLock {
    file: File,
}

impl AimuxLock {
    pub fn acquire(lock_path: &Path) -> Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(lock_path)
            .map_err(|e| AimuxError::LockError(format!("Failed to open lockfile {}: {}", lock_path.display(), e)))?;

        file.lock_exclusive()
            .map_err(|e| AimuxError::LockError(format!("Failed to acquire exclusive lock: {}", e)))?;

        Ok(Self { file })
    }
}

impl Drop for AimuxLock {
    fn drop(&mut self) {
        let _ = self.file.unlock();
    }
}
