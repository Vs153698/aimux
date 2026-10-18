use std::path::PathBuf;
use std::process::Command;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::ProfileStore;
use aimux_core::adapters::get_adapter;

pub async fn run_in_current_terminal(
    config: &AimuxConfig,
    id_or_name: &str,
    cmd_args: &[String],
    cwd: Option<PathBuf>,
) -> anyhow::Result<()> {
    if cmd_args.is_empty() {
        anyhow::bail!("No command specified. Usage: aimux run <profile> -- <command...>");
    }

    let store = ProfileStore::new(config.clone());
    let profile = store.get(id_or_name)?;

    let target_cwd = cwd
        .or_else(|| profile.default_workspace.clone())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let adapter = get_adapter(profile.provider);
    let session_env = adapter
        .build_session_env(&profile.profile_dir, &target_cwd, Some(cmd_args.to_vec()))
        .await?;

    let mut proc = Command::new(&session_env.command[0]);
    if session_env.command.len() > 1 {
        proc.args(&session_env.command[1..]);
    }
    proc.current_dir(&session_env.working_dir);

    for (k, v) in &session_env.env_vars {
        proc.env(k, v);
    }

    let status = proc.status()?;
    std::process::exit(status.code().unwrap_or(1));
}
