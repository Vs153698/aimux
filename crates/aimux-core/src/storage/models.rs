use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    ClaudeCode,
    GoogleAntigravity,
}

impl ProviderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProviderType::ClaudeCode => "claude_code",
            ProviderType::GoogleAntigravity => "google_antigravity",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            ProviderType::ClaudeCode => "Anthropic Claude Code",
            ProviderType::GoogleAntigravity => "Google Antigravity",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().trim() {
            "claude" | "claude_code" | "claude-code" => Some(ProviderType::ClaudeCode),
            "antigravity" | "google_antigravity" | "agy" | "google" => Some(ProviderType::GoogleAntigravity),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedIdentity {
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub organization: Option<String>,
    pub plan_tier: Option<String>,
    pub verified_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileMetadata {
    pub id: String,
    pub name: String,
    pub provider: ProviderType,
    pub created_at: i64,
    pub last_used_at: i64,
    pub default_workspace: Option<PathBuf>,
    pub profile_dir: PathBuf,
    pub verified_identity: Option<VerifiedIdentity>,
    pub color_tag: Option<String>,
    #[serde(default)]
    pub git_name: Option<String>,
    #[serde(default)]
    pub git_email: Option<String>,
    #[serde(default)]
    pub ssh_key_path: Option<PathBuf>,
}

impl ProfileMetadata {
    pub fn inject_git_env(&self, env_vars: &mut Vec<(String, String)>) {
        if let Some(ref email) = self.git_email {
            if !email.trim().is_empty() {
                env_vars.push(("GIT_AUTHOR_EMAIL".to_string(), email.trim().to_string()));
                env_vars.push(("GIT_COMMITTER_EMAIL".to_string(), email.trim().to_string()));
            }
        }
        if let Some(ref name) = self.git_name {
            if !name.trim().is_empty() {
                env_vars.push(("GIT_AUTHOR_NAME".to_string(), name.trim().to_string()));
                env_vars.push(("GIT_COMMITTER_NAME".to_string(), name.trim().to_string()));
            }
        }
        if let Some(ref key) = self.ssh_key_path {
            let key_str = key.to_string_lossy();
            if !key_str.trim().is_empty() {
                env_vars.push((
                    "GIT_SSH_COMMAND".to_string(),
                    format!("ssh -i \"{}\" -o IdentitiesOnly=yes", key_str.trim()),
                ));
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Running,
    Exited,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TerminalMode {
    Embedded,
    External,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub session_id: String,
    pub profile_id: String,
    pub provider: ProviderType,
    pub pid: u32,
    pub cwd: PathBuf,
    pub command: String,
    pub started_at: i64,
    pub status: SessionStatus,
    pub exit_code: Option<i32>,
    pub terminal_mode: TerminalMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderCapabilities {
    pub supports_independent_auth: bool,
    pub supports_concurrent_sessions: bool,
    pub supports_per_profile_settings: bool,
    pub supports_per_profile_history: bool,
    pub supports_identity_verification: bool,
    pub supports_desktop_app_isolation: bool,
    pub supports_automatic_quota: bool,
}
