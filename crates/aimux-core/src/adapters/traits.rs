use std::path::{Path, PathBuf};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::storage::models::{ProviderCapabilities, ProviderType, VerifiedIdentity};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationInfo {
    pub is_installed: bool,
    pub binary_path: Option<PathBuf>,
    pub version: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticItem {
    pub category: String,
    pub status: DiagnosticStatus,
    pub title: String,
    pub details: String,
    pub remediation: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticStatus {
    Ok,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEnvConfig {
    pub env_vars: Vec<(String, String)>,
    pub working_dir: PathBuf,
    pub command: Vec<String>,
}

#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    fn provider_type(&self) -> ProviderType;
    fn display_name(&self) -> &'static str;

    async fn detect_installation(&self) -> Result<InstallationInfo>;
    async fn get_version(&self) -> Result<String>;
    fn capabilities(&self) -> ProviderCapabilities;
    async fn diagnose(&self) -> Result<Vec<DiagnosticItem>>;

    async fn init_profile(&self, profile_dir: &Path) -> Result<()>;
    async fn verify_identity(&self, profile_dir: &Path) -> Result<Option<VerifiedIdentity>>;
    
    async fn build_session_env(
        &self,
        profile_dir: &Path,
        cwd: &Path,
        custom_command: Option<Vec<String>>,
    ) -> Result<SessionEnvConfig>;
}
