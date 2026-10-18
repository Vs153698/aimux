use std::path::PathBuf;
use colored::Colorize;
use chrono::DateTime;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::{ProfileStore, ProviderType};
use aimux_core::adapters::get_adapter;

pub async fn list_profiles(config: &AimuxConfig) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let profiles = store.list()?;

    if profiles.is_empty() {
        println!("{}", "No profiles found. Create one with `aimux profiles add`.".yellow());
        return Ok(());
    }

    println!("{:<36} {:<20} {:<18} {:<30}", "ID".bold(), "NAME".bold(), "PROVIDER".bold(), "VERIFIED IDENTITY".bold());
    println!("{}", "-".repeat(110));

    for p in profiles {
        let identity_str = match &p.verified_identity {
            Some(id) => {
                let email = id.email.as_deref().unwrap_or("No Email");
                let plan = id.plan_tier.as_deref().unwrap_or("");
                if plan.is_empty() {
                    email.green().to_string()
                } else {
                    format!("{} ({})", email.green(), plan.cyan())
                }
            }
            None => "Unverified / Not Connected".yellow().to_string(),
        };

        println!(
            "{:<36} {:<20} {:<18} {:<30}",
            p.id.dimmed(),
            p.name.bold(),
            p.provider.display_name(),
            identity_str
        );
    }

    Ok(())
}

pub async fn add_profile(
    config: &AimuxConfig,
    provider_str: &str,
    name: &str,
    workspace: Option<PathBuf>,
    color: Option<String>,
    git_name: Option<String>,
    git_email: Option<String>,
    ssh_key: Option<PathBuf>,
) -> anyhow::Result<()> {
    let provider = ProviderType::parse(provider_str)
        .ok_or_else(|| anyhow::anyhow!("Unknown provider '{}'. Supported: 'claude', 'antigravity'", provider_str))?;

    let store = ProfileStore::new(config.clone());
    let mut profile = store.create(name, provider, workspace, color)?;

    let mut changed = false;
    if let Some(gn) = git_name {
        profile.git_name = Some(gn);
        changed = true;
    }
    if let Some(ge) = git_email {
        profile.git_email = Some(ge);
        changed = true;
    }
    if let Some(sk) = ssh_key {
        profile.ssh_key_path = Some(sk);
        changed = true;
    }
    if changed {
        store.update(&profile)?;
    }

    // Initialize provider-specific directory structures and keychains
    let adapter = get_adapter(profile.provider);
    adapter.init_profile(&profile.profile_dir).await?;

    println!("{} Created profile '{}' ({})", "✔".green().bold(), profile.name.bold(), profile.id.dimmed());
    println!("  Provider:   {}", profile.provider.display_name());
    println!("  Directory:  {}", profile.profile_dir.display());
    if let Some(ref email) = profile.git_email {
        println!("  Git Email:  {}", email.cyan());
    }
    if let Some(ref name) = profile.git_name {
        println!("  Git Name:   {}", name.cyan());
    }
    if let Some(ref ssh) = profile.ssh_key_path {
        println!("  SSH Key:    {}", ssh.display().to_string().cyan());
    }

    Ok(())
}

pub async fn show_profile(config: &AimuxConfig, id_or_name: &str) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let p = store.get(id_or_name)?;

    println!("{}", format!("Profile: {}", p.name).bold().cyan());
    println!("  ID:               {}", p.id);
    println!("  Provider:         {}", p.provider.display_name());
    println!("  Directory:        {}", p.profile_dir.display());
    if let Some(ws) = &p.default_workspace {
        println!("  Default Workspace: {}", ws.display());
    }
    if let Some(ref email) = p.git_email {
        println!("  Git Email:        {}", email.cyan());
    }
    if let Some(ref name) = p.git_name {
        println!("  Git Name:         {}", name.cyan());
    }
    if let Some(ref ssh) = p.ssh_key_path {
        println!("  SSH Key:          {}", ssh.display().to_string().cyan());
    }
    
    let created = DateTime::from_timestamp(p.created_at, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "unknown".into());
    println!("  Created At:       {}", created);

    println!("\n  Authentication & Identity:");
    match &p.verified_identity {
        Some(id) => {
            println!("    Status:         {}", "Verified".green().bold());
            if let Some(email) = &id.email {
                println!("    Email:          {}", email);
            }
            if let Some(name) = &id.display_name {
                println!("    Display Name:   {}", name);
            }
            if let Some(org) = &id.organization {
                println!("    Organization:   {}", org);
            }
            if let Some(tier) = &id.plan_tier {
                println!("    Plan Tier:      {}", tier);
            }
        }
        None => {
            println!("    Status:         {}", "Unverified / Not Connected".yellow());
            println!("    Run `aimux launch {}` to authenticate the profile.", p.name);
        }
    }

    Ok(())
}

pub async fn verify_profile(config: &AimuxConfig, id_or_name: &str) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let mut p = store.get(id_or_name)?;

    println!("Querying authentication identity for profile '{}'...", p.name.bold());
    let adapter = get_adapter(p.provider);
    
    match adapter.verify_identity(&p.profile_dir).await? {
        Some(identity) => {
            p.verified_identity = Some(identity.clone());
            store.update(&p)?;
            println!("{} Identity successfully verified!", "✔".green().bold());
            if let Some(email) = &identity.email {
                println!("  Account: {}", email.green());
            }
            if let Some(org) = &identity.organization {
                println!("  Organization: {}", org);
            }
            if let Some(tier) = &identity.plan_tier {
                println!("  Tier: {}", tier);
            }
        }
        None => {
            println!("{} Could not verify active login. Launch the profile CLI to complete authentication.", "⚠".yellow().bold());
        }
    }

    Ok(())
}

pub async fn remove_profile(config: &AimuxConfig, id_or_name: &str, purge: bool) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let removed = store.remove(id_or_name, purge)?;
    println!("{} Removed profile '{}' ({})", "✔".green().bold(), removed.name.bold(), removed.id.dimmed());
    if purge {
        println!("  Purged profile storage directory: {}", removed.profile_dir.display());
    }
    Ok(())
}

pub async fn edit_git_profile(
    config: &AimuxConfig,
    id_or_name: &str,
    git_name: Option<String>,
    git_email: Option<String>,
    ssh_key: Option<PathBuf>,
) -> anyhow::Result<()> {
    let store = ProfileStore::new(config.clone());
    let mut profile = store.get(id_or_name)?;

    if let Some(gn) = git_name {
        profile.git_name = if gn.is_empty() { None } else { Some(gn) };
    }
    if let Some(ge) = git_email {
        profile.git_email = if ge.is_empty() { None } else { Some(ge) };
    }
    if let Some(sk) = ssh_key {
        profile.ssh_key_path = Some(sk);
    }

    store.update(&profile)?;
    println!("{} Updated Git identity for profile '{}'", "✔".green().bold(), profile.name.bold());
    if let Some(ref email) = profile.git_email {
        println!("  Git Email:  {}", email.cyan());
    }
    if let Some(ref name) = profile.git_name {
        println!("  Git Name:   {}", name.cyan());
    }
    if let Some(ref ssh) = profile.ssh_key_path {
        println!("  SSH Key:    {}", ssh.display().to_string().cyan());
    }
    Ok(())
}

