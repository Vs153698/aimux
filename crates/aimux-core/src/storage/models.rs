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
