use std::path::PathBuf;
use colored::Colorize;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::{ProfileStore, TerminalMode};
use aimux_core::session::SessionSupervisor;

pub async fn run_launch(
    config: &AimuxConfig,
    id_or_name: &str,
    cwd: Option<PathBuf>,
    external: bool,
    command: Option<Vec<String>>,
) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let profile = store.get(id_or_name)?;

    let mode = if external {
        TerminalMode::External
    } else {
        // By default on macOS CLI, launching an external terminal gives the user
        // an interactive shell window. For embedded we can use portable-pty.
        TerminalMode::External
    };

    println!("Launching session for profile '{}' ({}) in {:?} mode...", profile.name.bold(), profile.provider.display_name(), mode);

    let supervisor = SessionSupervisor::new(config.clone());
    let session = supervisor.launch_session(&profile, cwd, command, mode).await?;

    println!("{} Session started successfully!", "✔".green().bold());
    println!("  Session ID:  {}", session.session_id.dimmed());
    println!("  Working Dir: {}", session.cwd.display());
    println!("  Command:     {}", session.command.cyan());

    Ok(())
}
