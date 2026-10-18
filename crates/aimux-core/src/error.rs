use thiserror::Error;

#[derive(Error, Debug)]
pub enum AimuxError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Profile not found: {0}")]
    ProfileNotFound(String),

    #[error("Profile already exists with name: {0}")]
    ProfileAlreadyExists(String),

    #[error("Invalid profile name '{0}': {1}")]
    InvalidProfileName(String, String),

    #[error("Invalid path '{0}': {1}")]
    InvalidPath(String, String),

    #[error("Provider not found or unsupported: {0}")]
    ProviderNotFound(String),

    #[error("Provider binary not found on system: {0}")]
    BinaryNotFound(String),

    #[error("PTY execution error: {0}")]
    PtyError(String),

    #[error("Security or keychain error: {0}")]
    SecurityError(String),

    #[error("Lock acquisition error: {0}")]
    LockError(String),

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("Session error: {0}")]
    SessionError(String),

    #[error("Unsupported operation: {0}")]
    Unsupported(String),
}

pub type Result<T> = std::result::Result<T, AimuxError>;
