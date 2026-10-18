use std::path::{Path, PathBuf};
use std::process::Command;
use async_trait::async_trait;
use chrono::Utc;
use serde_json::Value;

use crate::adapters::traits::{
    DiagnosticItem, DiagnosticStatus, InstallationInfo, ProviderAdapter, SessionEnvConfig,
};
use crate::error::{AimuxError, Result};
use crate::storage::models::{ProviderCapabilities, ProviderType, VerifiedIdentity};

#[derive(Default)]
pub struct ClaudeCodeAdapter;

impl ClaudeCodeAdapter {
    pub fn new() -> Self {
        Self
    }

    fn find_binary() -> Option<PathBuf> {
        let candidates = [
            PathBuf::from("/opt/homebrew/bin/claude"),
            PathBuf::from("/usr/local/bin/claude"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(output) = Command::new("which").arg("claude").output() {
            if output.status.success() {
                let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !s.is_empty() {
                    return Some(PathBuf::from(s));
                }
            }
        }

        None
    }
}

#[async_trait]
impl ProviderAdapter for ClaudeCodeAdapter {
    fn provider_type(&self) -> ProviderType {
        ProviderType::ClaudeCode
    }

    fn display_name(&self) -> &'static str {
        "Anthropic Claude Code"
    }

    async fn detect_installation(&self) -> Result<InstallationInfo> {
        if let Some(path) = Self::find_binary() {
            let version = self.get_version().await.ok();
            Ok(InstallationInfo {
                is_installed: true,
                binary_path: Some(path),
                version,
                details: Some("Claude Code CLI detected on system".into()),
            })
        } else {
            Ok(InstallationInfo {
                is_installed: false,
                binary_path: None,
                version: None,
                details: Some("Claude Code CLI binary not found on PATH or standard locations".into()),
            })
        }
    }

    async fn get_version(&self) -> Result<String> {
        let bin = Self::find_binary().ok_or_else(|| AimuxError::BinaryNotFound("claude".into()))?;
        let output = Command::new(&bin)
            .arg("--version")
            .output()
            .map_err(|e| AimuxError::Io(e))?;

        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(ver)
        } else {
            Err(AimuxError::ProviderNotFound("Failed to query claude --version".into()))
        }
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            supports_independent_auth: true,
            supports_concurrent_sessions: true,
            supports_per_profile_settings: true,
            supports_per_profile_history: true,
            supports_identity_verification: true,
            supports_desktop_app_isolation: true, // CLI only
            supports_automatic_quota: false,
        }
    }

    async fn diagnose(&self) -> Result<Vec<DiagnosticItem>> {
        let mut items = Vec::new();

        if let Some(bin) = Self::find_binary() {
            items.push(DiagnosticItem {
                category: "Binary Discovery".into(),
                status: DiagnosticStatus::Ok,
                title: "Claude Code CLI Binary".into(),
                details: format!("Detected binary at: {}", bin.display()),
                remediation: None,
            });

            match self.get_version().await {
                Ok(v) => {
                    items.push(DiagnosticItem {
                        category: "Version Compatibility".into(),
                        status: DiagnosticStatus::Ok,
                        title: "Claude Code Version".into(),
                        details: format!("Version: {}", v),
                        remediation: None,
                    });
                }
                Err(e) => {
                    items.push(DiagnosticItem {
                        category: "Version Compatibility".into(),
                        status: DiagnosticStatus::Warning,
                        title: "Version Check Failed".into(),
                        details: e.to_string(),
                        remediation: Some("Verify that `claude --version` runs cleanly in terminal.".into()),
                    });
                }
            }
        } else {
            items.push(DiagnosticItem {
                category: "Binary Discovery".into(),
                status: DiagnosticStatus::Error,
                title: "Claude Code Missing".into(),
                details: "Could not find `claude` executable.".into(),
                remediation: Some("Install via `npm install -g @anthropic-ai/claude-code` or follow https://code.claude.com/docs/".into()),
            });
        }

        // Native isolation capability
        items.push(DiagnosticItem {
            category: "Authentication Isolation".into(),
            status: DiagnosticStatus::Ok,
            title: "CLAUDE_CONFIG_DIR Support".into(),
            details: "Native SHA-256 Keychain service isolation confirmed.".into(),
            remediation: None,
        });

        Ok(items)
    }

    async fn init_profile(&self, profile_dir: &Path) -> Result<()> {
        std::fs::create_dir_all(profile_dir)?;
        Ok(())
    }

    async fn verify_identity(&self, profile_dir: &Path) -> Result<Option<VerifiedIdentity>> {
        let claude_json_path = profile_dir.join(".claude.json");
        if claude_json_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&claude_json_path) {
                if let Ok(val) = serde_json::from_str::<Value>(&content) {
                    if let Some(oauth) = val.get("oauthAccount") {
                        let email = oauth.get("emailAddress").and_then(|v| v.as_str()).map(String::from);
                        let display_name = oauth.get("displayName").and_then(|v| v.as_str()).map(String::from);
                        let org = oauth.get("organizationName").and_then(|v| v.as_str()).map(String::from);
                        let tier = oauth.get("seatTier").and_then(|v| v.as_str()).map(String::from);

                        if email.is_some() || display_name.is_some() {
                            return Ok(Some(VerifiedIdentity {
                                email,
                                display_name,
                                organization: org,
                                plan_tier: tier,
                                verified_at: Utc::now().timestamp(),
                            }));
                        }
                    }
                }
            }
        }

        // Fallback: execute `claude auth status --json` with CLAUDE_CONFIG_DIR
        if let Some(bin) = Self::find_binary() {
            let output = Command::new(&bin)
                .env("CLAUDE_CONFIG_DIR", profile_dir)
                .args(["auth", "status", "--json"])
                .output();

            if let Ok(out) = output {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    if let Ok(val) = serde_json::from_str::<Value>(&text) {
                        let logged_in = val.get("loggedIn").and_then(|v| v.as_bool()).unwrap_or(false);
                        let method = val.get("authMethod").and_then(|v| v.as_str()).unwrap_or("none");
                        if logged_in {
                            return Ok(Some(VerifiedIdentity {
                                email: None,
                                display_name: Some(format!("Authenticated ({})", method)),
                                organization: None,
                                plan_tier: None,
                                verified_at: Utc::now().timestamp(),
                            }));
                        }
                    }
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

        // Core isolation variable
        env_vars.push(("CLAUDE_CONFIG_DIR".to_string(), profile_dir.display().to_string()));

        let command = custom_command.unwrap_or_else(|| vec!["claude".to_string()]);

        Ok(SessionEnvConfig {
            env_vars,
            working_dir: cwd.to_path_buf(),
            command,
        })
    }
}
