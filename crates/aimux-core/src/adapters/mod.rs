pub mod traits;
pub mod claude;
pub mod antigravity;

pub use traits::*;
pub use claude::ClaudeCodeAdapter;
pub use antigravity::AntigravityAdapter;

use crate::storage::models::ProviderType;

pub fn get_adapter(provider: ProviderType) -> Box<dyn ProviderAdapter> {
    match provider {
        ProviderType::ClaudeCode => Box::new(ClaudeCodeAdapter::new()),
        ProviderType::GoogleAntigravity => Box::new(AntigravityAdapter::new()),
    }
}
