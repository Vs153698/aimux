use colored::Colorize;
use aimux_core::adapters::get_adapter;
use aimux_core::storage::ProviderType;

pub async fn run_providers() -> anyhow::Result<()> {
    println!("{}", "Supported AI Development Providers".bold().cyan());
    println!("{}", "==================================".cyan());

    let providers = [ProviderType::ClaudeCode, ProviderType::GoogleAntigravity];

    for provider in &providers {
        let adapter = get_adapter(*provider);
        let info = adapter.detect_installation().await?;
        let caps = adapter.capabilities();

        println!("\n{} ({})", adapter.display_name().bold(), provider.as_str().cyan());
        
        let status = if info.is_installed {
            format!("Installed ({})", info.version.unwrap_or_else(|| "version unknown".into())).green()
        } else {
            "Not Installed".red()
        };
        println!("  Status:       {}", status);
        if let Some(path) = info.binary_path {
            println!("  Binary:       {}", path.display());
        }

        println!("  Capabilities:");
        println!("    • Independent Authentication: {}", bool_fmt(caps.supports_independent_auth));
        println!("    • Concurrent Terminal Sessions: {}", bool_fmt(caps.supports_concurrent_sessions));
        println!("    • Per-Profile Settings:       {}", bool_fmt(caps.supports_per_profile_settings));
        println!("    • Per-Profile History:        {}", bool_fmt(caps.supports_per_profile_history));
        println!("    • Identity Verification:      {}", bool_fmt(caps.supports_identity_verification));
        println!("    • Desktop App Multi-Instance: {}", bool_fmt(caps.supports_desktop_app_isolation));
    }

    Ok(())
}

fn bool_fmt(b: bool) -> colored::ColoredString {
    if b {
        "Supported".green()
    } else {
        "Not Supported / Restricted".yellow()
    }
}
