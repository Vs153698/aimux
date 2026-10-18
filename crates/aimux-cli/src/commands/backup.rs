use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use colored::Colorize;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::{ProfileMetadata, ProfileStore};

pub fn create_backup(config: &AimuxConfig, out_path: Option<PathBuf>) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let profiles = store.list()?;

    let backup_file = out_path.unwrap_or_else(|| {
        config.backups_dir().join(format!("aimux_backup_{}.json", Utc::now().format("%Y%m%d_%H%M%S")))
    });

    let json_bytes = serde_json::to_vec_pretty(&profiles)?;
    fs::write(&backup_file, json_bytes)?;

    println!("{} Successfully created backup!", "✔".green().bold());
    println!("  Profiles backed up: {}", profiles.len());
    println!("  Backup location:    {}", backup_file.display());
    println!("  Note: Per security guidelines, raw credentials and tokens are excluded from backups.");

    Ok(())
}

pub fn restore_backup(config: &AimuxConfig, backup_file: &Path) -> anyhow::Result<()> {
    if !backup_file.exists() {
        anyhow::bail!("Backup file does not exist: {}", backup_file.display());
    }

    let content = fs::read_to_string(backup_file)?;
    let profiles: Vec<ProfileMetadata> = serde_json::from_str(&content)
        .map_err(|e| anyhow::anyhow!("Invalid backup file format: {}", e))?;

    let store = ProfileStore::new(config.clone());
    for p in profiles {
        // Re-create each profile in store if it doesn't already exist
        if store.get(&p.id).is_err() && store.get(&p.name).is_err() {
            let created = store.create(&p.name, p.provider, p.default_workspace, p.color_tag)?;
            println!("  Restored profile: {} ({})", created.name.bold(), created.provider.display_name());
        } else {
            println!("  Skipping existing profile: {}", p.name.dimmed());
        }
    }

    println!("{} Backup restore complete!", "✔".green().bold());
    Ok(())
}
