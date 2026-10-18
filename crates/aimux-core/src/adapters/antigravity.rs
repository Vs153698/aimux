use std::path::{Path, PathBuf};
use std::process::Command;
use async_trait::async_trait;
use chrono::Utc;
use serde_json::Value;

use crate::adapters::traits::{
    DiagnosticItem, DiagnosticStatus, InstallationInfo, ProviderAdapter, SessionEnvConfig,
};
use crate::error::{AimuxError, Result};
use crate::security::ProfileKeychainManager;
use crate::storage::models::{ProviderCapabilities, ProviderType, VerifiedIdentity};

#[derive(Default)]
pub struct AntigravityAdapter;

impl AntigravityAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn find_cli_binary() -> Option<PathBuf> {
        let home = std::env::var("HOME").ok().map(PathBuf::from);
        let mut candidates = Vec::new();
        if let Some(h) = home {
            candidates.push(h.join(".local").join("bin").join("agy"));
            candidates.push(h.join(".gemini").join("antigravity").join("bin").join("agy"));
        }
        candidates.push(PathBuf::from("/usr/local/bin/agy"));

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(output) = Command::new("which").arg("agy").output() {
            if output.status.success() {
                let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !s.is_empty() {
                    return Some(PathBuf::from(s));
                }
            }
        }

        None
    }

    pub fn find_desktop_app() -> Option<PathBuf> {
        let paths = [
            PathBuf::from("/Applications/Antigravity.app"),
            PathBuf::from("/Volumes/Antigravity/Antigravity.app"),
        ];

        for p in &paths {
            if p.exists() {
                return Some(p.clone());
            }
        }
        None
    }
}

#[async_trait]
impl ProviderAdapter for AntigravityAdapter {
    fn provider_type(&self) -> ProviderType {
        ProviderType::GoogleAntigravity
    }

    fn display_name(&self) -> &'static str {
        "Google Antigravity"
    }

    async fn detect_installation(&self) -> Result<InstallationInfo> {
        let cli_path = Self::find_cli_binary();
        let app_path = Self::find_desktop_app();

        let is_installed = cli_path.is_some() || app_path.is_some();
        let version = self.get_version().await.ok();

        let details = match (&cli_path, &app_path) {
            (Some(c), Some(a)) => Some(format!("Found agy CLI ({}) and Desktop App ({})", c.display(), a.display())),
            (Some(c), None) => Some(format!("Found agy CLI ({})", c.display())),
            (None, Some(a)) => Some(format!("Found Desktop App ({})", a.display())),
            (None, None) => Some("Neither agy CLI nor Antigravity Desktop App was detected.".into()),
        };

        Ok(InstallationInfo {
            is_installed,
            binary_path: cli_path,
            version,
            details,
        })
    }

    async fn get_version(&self) -> Result<String> {
        let bin = Self::find_cli_binary().ok_or_else(|| AimuxError::BinaryNotFound("agy".into()))?;
        let output = Command::new(&bin)
            .arg("--version")
            .output()
            .map_err(|e| AimuxError::Io(e))?;

        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(ver)
        } else {
            Err(AimuxError::ProviderNotFound("Failed to query agy --version".into()))
        }
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_independent_auth: true,        // Via isolated profile jail
            supports_concurrent_sessions: true,    // Independent CLI terminal sessions
            supports_per_profile_settings: true,
            supports_per_profile_history: true,
            supports_identity_verification: true,
            supports_desktop_app_isolation: false, // Single-instance Electron lock
            supports_automatic_quota: false,
        }
    }

    async fn diagnose(&self) -> Result<Vec<DiagnosticItem>> {
        let mut items = Vec::new();

        // CLI status
        if let Some(bin) = Self::find_cli_binary() {
            items.push(DiagnosticItem {
                category: "CLI Discovery".into(),
                status: DiagnosticStatus::Ok,
                title: "Antigravity CLI (agy)".into(),
                details: format!("Detected binary at: {}", bin.display()),
                remediation: None,
            });

            if let Ok(ver) = self.get_version().await {
                items.push(DiagnosticItem {
                    category: "Version".into(),
                    status: DiagnosticStatus::Ok,
                    title: "agy CLI Version".into(),
                    details: format!("Version: {}", ver),
                    remediation: None,
                });
            }
        } else {
            items.push(DiagnosticItem {
                category: "CLI Discovery".into(),
                status: DiagnosticStatus::Warning,
                title: "agy CLI Missing".into(),
                details: "Could not find `agy` executable.".into(),
                remediation: Some("Install the CLI from https://antigravity.google/docs/cli/install/".into()),
            });
        }

        // Desktop App status
        if let Some(app) = Self::find_desktop_app() {
            items.push(DiagnosticItem {
                category: "Desktop Application".into(),
                status: DiagnosticStatus::Ok,
                title: "Antigravity Desktop App".into(),
                details: format!("Detected at: {}", app.display()),
                remediation: None,
            });

            // Single instance notice
            items.push(DiagnosticItem {
                category: "Single-Instance Boundary".into(),
                status: DiagnosticStatus::Warning,
                title: "Desktop App Single-Instance Lock".into(),
                details: "Electron requestSingleInstanceLock enforces one running desktop GUI window per OS user.".into(),
                remediation: Some("Use AIMux CLI profile launch for independent concurrent sessions, or switch profiles before opening Desktop App.".into()),
            });
        }

        // Keyring jail status
        items.push(DiagnosticItem {
            category: "Authentication Isolation".into(),
            status: DiagnosticStatus::Ok,
            title: "Profile-Jailed Keychain Strategy".into(),
            details: "HOME-redirected keychain search list enables independent concurrent CLI sessions without global keychain collisions.".into(),
            remediation: None,
        });

        Ok(items)
    }

    async fn init_profile(&self, profile_dir: &Path) -> Result<()> {
        let gemini_dir = profile_dir.join(".gemini");
        std::fs::create_dir_all(&gemini_dir)?;
        ProfileKeychainManager::setup_profile_keychain(profile_dir)?;
        Ok(())
    }

    async fn verify_identity(&self, profile_dir: &Path) -> Result<Option<VerifiedIdentity>> {
        let accounts_json_path = profile_dir.join(".gemini").join("google_accounts.json");
        if accounts_json_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&accounts_json_path) {
                if let Ok(val) = serde_json::from_str::<Value>(&content) {
                    if let Some(active) = val.get("active").and_then(|v| v.as_str()) {
                        return Ok(Some(VerifiedIdentity {
                            email: Some(active.to_string()),
                            display_name: Some(active.to_string()),
                            organization: None,
                            plan_tier: Some("Google AI Subscription".into()),
                            verified_at: Utc::now().timestamp(),
                        }));
                    }
                }
            }
        }

        // Probe agy models with isolated HOME
        if let Some(bin) = Self::find_cli_binary() {
            let output = Command::new(&bin)
                .env("HOME", profile_dir)
                .arg("models")
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    return Ok(Some(VerifiedIdentity {
                        email: None,
                        display_name: Some("Authenticated Google Account".into()),
                        organization: None,
                        plan_tier: Some("Active".into()),
                        verified_at: Utc::now().timestamp(),
                    }));
                }
            }
        }

        Ok(None)
    }

    async fn build_session_env(
        &self,
        profile_dir: &Path,
        cwd: &Path,
        custom_command: Option<Vec<String>>,
    ) -> Result<SessionEnvConfig> {
        let mut env_vars = Vec::new();

        // Forward basic safe environment variables
        let safe_inherit = ["PATH", "USER", "SHELL", "TERM", "LANG", "LC_ALL"];
        for key in &safe_inherit {
            if let Ok(val) = std::env::var(key) {
                env_vars.push((key.to_string(), val));
            }
        }

        // Jail HOME to profile directory
        env_vars.push(("HOME".to_string(), profile_dir.display().to_string()));

        let command = custom_command.unwrap_or_else(|| vec!["agy".to_string()]);

        Ok(SessionEnvConfig {
            env_vars,
            working_dir: cwd.to_path_buf(),
            command,
        })
    }
}
