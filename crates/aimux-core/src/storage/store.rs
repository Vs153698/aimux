use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;

use crate::config::AimuxConfig;
use crate::error::{AimuxError, Result};
use crate::security::AimuxLock;
use crate::storage::models::{ProfileMetadata, ProviderType};

pub struct ProfileStore {
    config: AimuxConfig,
}

impl ProfileStore {
    pub fn new(config: AimuxConfig) -> Self {
        Self { config }
    }

    /// Validate profile friendly name
    pub fn validate_profile_name(name: &str) -> Result<()> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(AimuxError::InvalidProfileName(
                name.into(),
                "Profile name cannot be empty".into(),
            ));
        }
        if trimmed.len() > 64 {
            return Err(AimuxError::InvalidProfileName(
                name.into(),
                "Profile name exceeds maximum length of 64 characters".into(),
            ));
        }
        if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
            return Err(AimuxError::InvalidProfileName(
                name.into(),
                "Profile name cannot contain path separators or parent directory traversal sequences".into(),
            ));
        }
        // Allow alphanumeric, spaces, hyphens, underscores, dots
        if !trimmed.chars().all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' || c == '.') {
            return Err(AimuxError::InvalidProfileName(
                name.into(),
                "Profile name contains disallowed special characters".into(),
            ));
        }
        Ok(())
    }

    /// Load all profiles from profiles.json
    pub fn list(&self) -> Result<Vec<ProfileMetadata>> {
        let _lock = AimuxLock::acquire(&self.config.lock_file())?;
        let file_path = self.config.profiles_file();
        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&file_path)?;
        if content.trim().is_empty() {
            return Ok(Vec::new());
        }

        let profiles: Vec<ProfileMetadata> = serde_json::from_str(&content)?;
        Ok(profiles)
    }

    /// Get profile by UUID or exact friendly name
    pub fn get(&self, id_or_name: &str) -> Result<ProfileMetadata> {
        let profiles = self.list()?;
        profiles
            .into_iter()
            .find(|p| p.id == id_or_name || p.name.eq_ignore_ascii_case(id_or_name))
            .ok_or_else(|| AimuxError::ProfileNotFound(id_or_name.to_string()))
    }

    /// Save full profile list atomically
    fn save_atomic(&self, profiles: &[ProfileMetadata]) -> Result<()> {
        let file_path = self.config.profiles_file();
        let tmp_path = self.config.base_dir.join(format!("profiles.json.tmp.{}", Uuid::new_v4()));

        let json_bytes = serde_json::to_vec_pretty(profiles)?;

        {
            let mut file = File::create(&tmp_path)?;
            file.write_all(&json_bytes)?;
            file.sync_all()?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&tmp_path, fs::Permissions::from_mode(0o600));
            }
        }

        fs::rename(&tmp_path, &file_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&file_path, fs::Permissions::from_mode(0o600));
        }

        Ok(())
    }

    /// Create and persist a new profile
    pub fn create(
        &self,
        name: &str,
        provider: ProviderType,
        default_workspace: Option<PathBuf>,
        color_tag: Option<String>,
    ) -> Result<ProfileMetadata> {
        Self::validate_profile_name(name)?;

        let validated_workspace = if let Some(ws) = default_workspace {
            if !ws.exists() {
                return Err(AimuxError::InvalidPath(
                    ws.display().to_string(),
                    "Workspace directory does not exist".into(),
                ));
            }
            if !ws.is_dir() {
                return Err(AimuxError::InvalidPath(
                    ws.display().to_string(),
                    "Workspace path is not a directory".into(),
                ));
            }
            Some(dunce::canonicalize(&ws)?)
        } else {
            None
        };

        let _lock = AimuxLock::acquire(&self.config.lock_file())?;
        let mut profiles = self.list_internal()?;

        if profiles.iter().any(|p| p.name.eq_ignore_ascii_case(name)) {
            return Err(AimuxError::ProfileAlreadyExists(name.to_string()));
        }

        let id = Uuid::new_v4().to_string();
        let profile_dir = self.config.profiles_dir().join(&id);
        fs::create_dir_all(&profile_dir)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&profile_dir, fs::Permissions::from_mode(0o700));
        }

        let now = Utc::now().timestamp();
        let metadata = ProfileMetadata {
            id,
            name: name.trim().to_string(),
            provider,
            created_at: now,
            last_used_at: now,
            default_workspace: validated_workspace,
            profile_dir,
            verified_identity: None,
            color_tag,
            git_name: None,
            git_email: None,
            ssh_key_path: None,
        };

        profiles.push(metadata.clone());
        self.save_atomic(&profiles)?;

        Ok(metadata)
    }

    /// Update an existing profile
    pub fn update(&self, updated: &ProfileMetadata) -> Result<()> {
        let _lock = AimuxLock::acquire(&self.config.lock_file())?;
        let mut profiles = self.list_internal()?;

        let pos = profiles
            .iter()
            .position(|p| p.id == updated.id)
            .ok_or_else(|| AimuxError::ProfileNotFound(updated.id.clone()))?;

        // Check if renamed to an existing profile name
        if profiles.iter().any(|p| p.id != updated.id && p.name.eq_ignore_ascii_case(&updated.name)) {
            return Err(AimuxError::ProfileAlreadyExists(updated.name.clone()));
        }

        profiles[pos] = updated.clone();
        self.save_atomic(&profiles)?;
        Ok(())
    }

    /// Remove a profile and optionally its directory
    pub fn remove(&self, id_or_name: &str, purge_files: bool) -> Result<ProfileMetadata> {
        let _lock = AimuxLock::acquire(&self.config.lock_file())?;
        let mut profiles = self.list_internal()?;

        let pos = profiles
            .iter()
            .position(|p| p.id == id_or_name || p.name.eq_ignore_ascii_case(id_or_name))
            .ok_or_else(|| AimuxError::ProfileNotFound(id_or_name.to_string()))?;

        let removed = profiles.remove(pos);
        self.save_atomic(&profiles)?;

        if purge_files && removed.profile_dir.exists() {
            // Safety check: only delete if path is strictly inside profiles_dir
            if removed.profile_dir.starts_with(&self.config.profiles_dir()) {
                let _ = fs::remove_dir_all(&removed.profile_dir);
            }
        }

        Ok(removed)
    }

    fn list_internal(&self) -> Result<Vec<ProfileMetadata>> {
        let file_path = self.config.profiles_file();
        if !file_path.exists() {
            return Ok(Vec::new());
        }
        let content = fs::read_to_string(&file_path)?;
        if content.trim().is_empty() {
            return Ok(Vec::new());
        }
        let profiles: Vec<ProfileMetadata> = serde_json::from_str(&content)?;
        Ok(profiles)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_profile_crud_operations() {
        let temp_dir = TempDir::new().unwrap();
        let config = AimuxConfig::custom(temp_dir.path()).unwrap();
        let store = ProfileStore::new(config);

        // Validation
        assert!(ProfileStore::validate_profile_name("").is_err());
        assert!(ProfileStore::validate_profile_name("../traversal").is_err());
        assert!(ProfileStore::validate_profile_name("valid-name_1").is_ok());

        // Create
        let prof1 = store.create("Personal", ProviderType::ClaudeCode, None, Some("#3b82f6".into())).unwrap();
        assert_eq!(prof1.name, "Personal");
        assert_eq!(prof1.provider, ProviderType::ClaudeCode);

        // Duplicate name rejected
        assert!(store.create("personal", ProviderType::GoogleAntigravity, None, None).is_err());

        // List
        let list = store.list().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, prof1.id);

        // Get by name
        let fetched = store.get("personal").unwrap();
        assert_eq!(fetched.id, prof1.id);

        // Remove
        let removed = store.remove("Personal", true).unwrap();
        assert_eq!(removed.id, prof1.id);
        assert_eq!(store.list().unwrap().len(), 0);
    }
}
