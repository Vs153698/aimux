use std::path::Path;
use std::process::Command;
use crate::error::{AimuxError, Result};

pub struct ProfileKeychainManager;

impl ProfileKeychainManager {
    /// On macOS, creates an isolated login.keychain-db inside the profile jail
    /// and configures that jail's search list so `/usr/bin/security` calls
    /// within that profile's session resolve strictly to the profile's keychain.
    #[cfg(target_os = "macos")]
    pub fn setup_profile_keychain(profile_home: &Path) -> Result<()> {
        let keychains_dir = profile_home.join("Library").join("Keychains");
        let prefs_dir = profile_home.join("Library").join("Preferences");
        std::fs::create_dir_all(&keychains_dir)?;
        std::fs::create_dir_all(&prefs_dir)?;

        let kc_path = keychains_dir.join("login.keychain-db");
        if !kc_path.exists() {
            // Generate a random internal password for the profile's isolated keychain
            let dummy_pass = uuid::Uuid::new_v4().to_string();
            let status = Command::new("security")
                .args(["create-keychain", "-p", &dummy_pass, kc_path.to_str().unwrap()])
                .status()
                .map_err(|e| AimuxError::SecurityError(format!("Failed to execute security create-keychain: {}", e)))?;

            if !status.success() {
                return Err(AimuxError::SecurityError(format!(
                    "security create-keychain exited with status {:?}",
                    status.code()
                )));
            }

            // Bind the search list for this profile home
            let list_status = Command::new("security")
                .env("HOME", profile_home)
                .args(["list-keychains", "-s", kc_path.to_str().unwrap()])
                .status()
                .map_err(|e| AimuxError::SecurityError(format!("Failed to set profile keychain search list: {}", e)))?;

            if !list_status.success() {
                return Err(AimuxError::SecurityError(format!(
                    "security list-keychains exited with status {:?}",
                    list_status.code()
                )));
            }
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    pub fn setup_profile_keychain(_profile_home: &Path) -> Result<()> {
        // On Linux / Windows, profile environment isolation is handled via XDG / user directories
        Ok(())
    }
}
