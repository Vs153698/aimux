use colored::Colorize;
use chrono::DateTime;
use aimux_core::config::AimuxConfig;
use aimux_core::session::SessionSupervisor;
use aimux_core::storage::SessionStatus;

pub async fn list_sessions(config: &AimuxConfig) -> anyhow::Result<()> {
    let supervisor = SessionSupervisor::new(config.clone());
    let sessions = supervisor.list_sessions()?;

    if sessions.is_empty() {
        println!("{}", "No active or recorded sessions found.".yellow());
        return Ok(());
    }

    println!("{:<36} {:<10} {:<12} {:<30} {:<15}", "SESSION ID".bold(), "PID".bold(), "STATUS".bold(), "WORKING DIR".bold(), "COMMAND".bold());
    println!("{}", "-".repeat(110));

    for s in sessions {
        let status_colored = match s.status {
            SessionStatus::Running => "Running".green().bold(),
            SessionStatus::Exited => "Exited".dimmed(),
            SessionStatus::Failed => "Failed".red().bold(),
        };

        println!(
            "{:<36} {:<10} {:<12} {:<30} {:<15}",
            s.session_id.dimmed(),
            s.pid,
            status_colored,
            s.cwd.display().to_string().chars().take(28).collect::<String>(),
            s.command
        );
    }

    Ok(())
}

pub async fn show_session(config: &AimuxConfig, session_id: &str) -> anyhow::Result<()> {
    let supervisor = SessionSupervisor::new(config.clone());
    let s = supervisor.get_session(session_id)?;

    println!("{}", format!("Session: {}", s.session_id).bold().cyan());
    println!("  Profile ID:   {}", s.profile_id);
    println!("  Provider:     {}", s.provider.display_name());
    println!("  PID:          {}", s.pid);
    println!("  Status:       {:?}", s.status);
    if let Some(code) = s.exit_code {
        println!("  Exit Code:    {}", code);
    }
    println!("  Terminal Mode: {:?}", s.terminal_mode);
    println!("  Working Dir:  {}", s.cwd.display());
    println!("  Command:      {}", s.command);

    let started = DateTime::from_timestamp(s.started_at, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "unknown".into());
    println!("  Started At:   {}", started);

    Ok(())
}

pub async fn stop_session(config: &AimuxConfig, session_id: &str) -> anyhow::Result<()> {
    let supervisor = SessionSupervisor::new(config.clone());
    let s = supervisor.stop_session(session_id)?;
    println!("{} Session {} terminated (Status: {:?})", "✔".green().bold(), s.session_id.dimmed(), s.status);
    Ok(())
}
