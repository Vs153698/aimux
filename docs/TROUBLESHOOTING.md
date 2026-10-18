# AIMux Troubleshooting & Diagnostics Guide

This document describes how to troubleshoot common environment issues and interpret diagnostic findings produced by `aimux doctor` or the Desktop Doctor view.

---

## 1. Running Diagnostics

### Via CLI
```bash
aimux doctor
```

### Via Desktop App
Navigate to the **Doctor & Diagnostics** tab in the navigation bar. Click **Run Diagnostics** to perform an on-demand system scan.

---

## 2. Common Diagnostics & Remediation

### 2.1 Antigravity Desktop Single-Instance Advisory
- **Status**: Warning
- **Cause**: Electron's `app.requestSingleInstanceLock()` prevents two GUI instances from running under the same operating system user.
- **Remediation**:
  1. For concurrent isolated workflows, launch multiple terminal sessions using `aimux launch <profile>` or embedded PTYs.
  2. For GUI desktop isolation, execute under separate OS user accounts (`sudo -u work_user open -a Antigravity.app`), or allow AIMux to switch profiles sequentially before launching the desktop window.

### 2.2 Claude Code CLI Not Found
- **Status**: Error
- **Cause**: The `claude` binary is not located in standard system PATH locations (`/usr/local/bin`, `/opt/homebrew/bin`, `~/.npm-global/bin`).
- **Remediation**:
  Install the official Claude Code CLI via npm:
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```
  Ensure `/opt/homebrew/bin` or your npm global bin is included in your login shell PATH.

### 2.3 Antigravity CLI (`agy`) Not Found
- **Status**: Error
- **Cause**: The `agy` binary is not found in PATH or standard directories (`~/.local/bin`, `~/.agy/bin`).
- **Remediation**:
  Install the official CLI using the official Google Antigravity installation instructions:
  https://antigravity.google/docs/cli/install/

### 2.4 macOS Keychain Permission Prompts
- **Status**: Expected Behavior on Initial Profile Launch
- **Cause**: On macOS, when `agy` accesses a newly initialized profile-jailed keychain for the first time, macOS Security framework prompts: `"agy wants access to key gemini in your keychain"`.
- **Remediation**:
  Click **Always Allow** to permit `agy` to read and write tokens in its dedicated profile keychain without repeated prompts.

### 2.5 Corrupted Lock File
- **Status**: Error ("Failed to acquire lock")
- **Cause**: An abnormal system reboot or hard SIGKILL left an open file handle or stale advisory lock on `~/.aimux/.aimux.lock`.
- **Remediation**:
  Ensure no AIMux sessions are running, then remove the lock file:
  ```bash
  rm ~/.aimux/.aimux.lock
  ```
