use std::path::PathBuf;
use clap::{Parser, Subcommand};
use aimux_core::config::AimuxConfig;

mod commands;

#[derive(Parser)]
#[command(
    name = "aimux",
    author = "AIMux Contributors",
    version,
    about = "Secure, locally operated AI Account Manager for Google Antigravity & Claude Code"
)]
struct Cli {
    #[arg(long, global = true, help = "Custom AIMux configuration/home directory")]
    config_dir: Option<PathBuf>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "Check system health, provider CLIs, and isolation mechanisms")]
    Doctor,

    #[command(about = "List supported providers and installed versions")]
    Providers,

    #[command(about = "Manage AI account profiles")]
    Profiles {
        #[command(subcommand)]
        action: ProfileAction,
    },

    #[command(about = "Launch a terminal session for a profile")]
    Launch {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,

        #[arg(long, help = "Working directory for the session")]
        cwd: Option<PathBuf>,

        #[arg(long, help = "Launch in an external terminal window")]
        external: bool,

        #[arg(last = true, help = "Optional custom command to run")]
        command: Vec<String>,
    },

    #[command(about = "Run a command in current terminal under the profile's environment")]
    Run {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,

        #[arg(long, help = "Working directory for the command")]
        cwd: Option<PathBuf>,

        #[arg(last = true, required = true, help = "Command and arguments to execute")]
        command: Vec<String>,
    },

    #[command(about = "Inspect and manage active terminal sessions")]
    Sessions {
        #[command(subcommand)]
        action: SessionAction,
    },

    #[command(about = "Transfer session context and failover to another AI profile")]
    Handoff {
        #[arg(short, long, help = "Target profile to switch to")]
        to: String,

        #[arg(short, long, help = "Source profile or session ID (optional, auto-detected from cwd)")]
        from: Option<String>,

        #[arg(long, help = "Working directory (defaults to current dir)")]
        cwd: Option<PathBuf>,

        #[arg(long, help = "Launch in external terminal window")]
        external: bool,
    },

    #[command(about = "Show AIMux storage paths and configuration")]
    Config,

    #[command(about = "Create a non-secret backup of profiles and settings")]
    Backup {
        #[arg(long, help = "Custom output path for backup file")]
        out: Option<PathBuf>,
    },

    #[command(about = "Restore profiles from a backup file")]
    Restore {
        #[arg(help = "Path to backup file")]
        file: PathBuf,
    },
}

#[derive(Subcommand)]
enum ProfileAction {
    #[command(about = "List all configured profiles")]
    List,

    #[command(about = "Add a new account profile")]
    Add {
        #[arg(short, long, help = "Provider: 'claude' or 'antigravity'")]
        provider: String,

        #[arg(short, long, help = "Friendly profile name (e.g. 'Google Work')")]
        name: String,

        #[arg(short, long, help = "Default project/workspace directory")]
        workspace: Option<PathBuf>,

        #[arg(long, help = "Optional color tag (hex or name)")]
        color: Option<String>,

        #[arg(long, help = "Git author and committer name for this profile")]
        git_name: Option<String>,

        #[arg(long, help = "Git author and committer email for this profile")]
        git_email: Option<String>,

        #[arg(long, help = "Path to SSH private key for this profile")]
        ssh_key: Option<PathBuf>,
    },

    #[command(about = "Show details of a profile")]
    Show {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,
    },

    #[command(about = "Query and verify active provider identity for a profile")]
    Verify {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,
    },

    #[command(about = "Update Git author/committer identity and SSH key for a profile")]
    EditGit {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,

        #[arg(long, help = "Git author and committer name")]
        git_name: Option<String>,

        #[arg(long, help = "Git author and committer email")]
        git_email: Option<String>,

        #[arg(long, help = "Path to SSH private key")]
        ssh_key: Option<PathBuf>,
    },

    #[command(about = "Remove an account profile")]
    Remove {
        #[arg(help = "Profile friendly name or UUID")]
        profile: String,

        #[arg(long, help = "Purge profile directory and cached files")]
        purge: bool,
    },
}

#[derive(Subcommand)]
enum SessionAction {
    #[command(about = "List running and recent sessions")]
    List,

    #[command(about = "Show details of a session")]
    Show {
        #[arg(help = "Session UUID")]
        session_id: String,
    },

    #[command(about = "Stop/terminate a running session")]
    Stop {
        #[arg(help = "Session UUID")]
        session_id: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    let config = if let Some(custom) = cli.config_dir {
        AimuxConfig::custom(custom)?
    } else {
        AimuxConfig::default_location()?
    };

    match cli.command {
        Commands::Doctor => commands::doctor::run_doctor().await?,
        Commands::Providers => commands::providers::run_providers().await?,
        Commands::Handoff { to, from, cwd, external } => {
            commands::handoff::run_handoff(&config, &to, from, cwd, external).await?;
        }
        Commands::Profiles { action } => match action {
            ProfileAction::List => commands::profiles::list_profiles(&config).await?,
            ProfileAction::Add { provider, name, workspace, color, git_name, git_email, ssh_key } => {
                commands::profiles::add_profile(&config, &provider, &name, workspace, color, git_name, git_email, ssh_key).await?;
            }
            ProfileAction::EditGit { profile, git_name, git_email, ssh_key } => {
                commands::profiles::edit_git_profile(&config, &profile, git_name, git_email, ssh_key).await?;
            }
            ProfileAction::Show { profile } => commands::profiles::show_profile(&config, &profile).await?,
            ProfileAction::Verify { profile } => commands::profiles::verify_profile(&config, &profile).await?,
            ProfileAction::Remove { profile, purge } => commands::profiles::remove_profile(&config, &profile, purge).await?,
        },
        Commands::Launch { profile, cwd, external, command } => {
            let cmd_opt = if command.is_empty() { None } else { Some(command) };
            commands::launch::run_launch(&config, &profile, cwd, external, cmd_opt).await?;
        }
        Commands::Run { profile, cwd, command } => {
            commands::run::run_in_current_terminal(&config, &profile, &command, cwd).await?;
        }
        Commands::Sessions { action } => match action {
            SessionAction::List => commands::sessions::list_sessions(&config).await?,
            SessionAction::Show { session_id } => commands::sessions::show_session(&config, &session_id).await?,
            SessionAction::Stop { session_id } => commands::sessions::stop_session(&config, &session_id).await?,
        },
        Commands::Config => commands::config_cmd::show_config(&config)?,
        Commands::Backup { out } => commands::backup::create_backup(&config, out)?,
        Commands::Restore { file } => commands::backup::restore_backup(&config, &file)?,
    }

    Ok(())
}
