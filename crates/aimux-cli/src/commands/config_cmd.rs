use colored::Colorize;
use aimux_core::config::AimuxConfig;

pub fn show_config(config: &AimuxConfig) -> anyhow::Result<()> {
    println!("{}", "AIMux Storage & Configuration Paths".bold().cyan());
    println!("{}", "===================================".cyan());

    println!("  Base Directory:      {}", config.base_dir.display());
    println!("  Profiles File:       {}", config.profiles_file().display());
    println!("  Lock File:           {}", config.lock_file().display());
    println!("  Profiles Directory:  {}", config.profiles_dir().display());
    println!("  Sessions Directory:  {}", config.sessions_dir().display());
    println!("  Logs Directory:      {}", config.logs_dir().display());
    println!("  Backups Directory:   {}", config.backups_dir().display());

    Ok(())
}
