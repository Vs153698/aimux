use colored::Colorize;
use aimux_core::adapters::{get_adapter, DiagnosticStatus};
use aimux_core::storage::ProviderType;

pub async fn run_doctor() -> anyhow::Result<()> {
    println!("{}", "AIMux System & Provider Diagnostic Report".bold().cyan());
    println!("{}", "==========================================".cyan());

    let providers = [ProviderType::ClaudeCode, ProviderType::GoogleAntigravity];

    for provider in &providers {
        let adapter = get_adapter(*provider);
        println!("\n{} {}", "▶ Provider:".bold(), adapter.display_name().bold());
        
        let diagnostics = adapter.diagnose().await?;
        for diag in diagnostics {
            let symbol = match diag.status {
                DiagnosticStatus::Ok => "✔".green(),
                DiagnosticStatus::Warning => "⚠".yellow(),
                DiagnosticStatus::Error => "✖".red(),
            };

            let title_colored = match diag.status {
                DiagnosticStatus::Ok => diag.title.green(),
                DiagnosticStatus::Warning => diag.title.yellow(),
                DiagnosticStatus::Error => diag.title.red(),
            };

            println!("  {} [{}] {}", symbol, diag.category.dimmed(), title_colored.bold());
            println!("      {}", diag.details);
            if let Some(rem) = diag.remediation {
                println!("      {} {}", "Recommendation:".italic().cyan(), rem);
            }
        }
    }

    println!("\n{}", "Diagnostic scan complete.".bold().green());
    Ok(())
}
