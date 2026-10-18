use std::path::PathBuf;
use tempfile::TempDir;
use aimux_core::config::AimuxConfig;
use aimux_core::storage::{ProfileStore, ProviderType, TerminalMode};
use aimux_core::adapters::get_adapter;
use aimux_core::session::SessionSupervisor;

#[tokio::test]
async fn test_adapter_environment_isolation() {
    let temp_dir = TempDir::new().unwrap();
    let config = AimuxConfig::custom(temp_dir.path()).unwrap();
    let store = ProfileStore::new(config.clone());

    // Create Claude Code Profile
    let claude_profile = store
        .create("Claude Work", ProviderType::ClaudeCode, None, None)
        .unwrap();
    let claude_adapter = get_adapter(ProviderType::ClaudeCode);
    claude_adapter.init_profile(&claude_profile.profile_dir).await.unwrap();

    let cwd = PathBuf::from("/tmp");
    let claude_env = claude_adapter
        .build_session_env(&claude_profile.profile_dir, &cwd, None)
        .await
        .unwrap();

    let has_claude_config = claude_env
        .env_vars
        .iter()
        .any(|(k, v)| k == "CLAUDE_CONFIG_DIR" && v == claude_profile.profile_dir.to_str().unwrap());
    assert!(has_claude_config, "Claude session must have CLAUDE_CONFIG_DIR set to profile dir");

    // Create Google Antigravity Profile
    let agy_profile = store
        .create("Google Personal", ProviderType::GoogleAntigravity, None, None)
        .unwrap();
    let agy_adapter = get_adapter(ProviderType::GoogleAntigravity);
    agy_adapter.init_profile(&agy_profile.profile_dir).await.unwrap();

    let agy_env = agy_adapter
        .build_session_env(&agy_profile.profile_dir, &cwd, None)
        .await
        .unwrap();

    let has_home_jail = agy_env
        .env_vars
        .iter()
        .any(|(k, v)| k == "HOME" && v == agy_profile.profile_dir.to_str().unwrap());
    assert!(has_home_jail, "Antigravity session must have HOME jailed to profile dir");
}

#[tokio::test]
async fn test_session_supervisor_lifecycle() {
    let temp_dir = TempDir::new().unwrap();
    let config = AimuxConfig::custom(temp_dir.path()).unwrap();
    let store = ProfileStore::new(config.clone());
    let supervisor = SessionSupervisor::new(config.clone());

    let profile = store
        .create("Echo Test Profile", ProviderType::ClaudeCode, None, None)
        .unwrap();

    // Launch an embedded PTY session running an echo command
    let session = supervisor
        .launch_session(
            &profile,
            Some(temp_dir.path().to_path_buf()),
            Some(vec!["echo".into(), "hello from aimux".into()]),
            TerminalMode::Embedded,
        )
        .await
        .unwrap();

    assert_eq!(session.profile_id, profile.id);
    assert_eq!(session.terminal_mode, TerminalMode::Embedded);

    // Verify session metadata persisted
    let loaded = supervisor.get_session(&session.session_id).unwrap();
    assert_eq!(loaded.session_id, session.session_id);

    // List sessions
    let list = supervisor.list_sessions().unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].session_id, session.session_id);
}
