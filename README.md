# AIMux — AI Account Manager

[![CI](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)]()

**AIMux** (AI Account Multiplexer) is a secure, open-source, locally operated desktop application and command-line interface for managing multiple concurrent Google Antigravity accounts (`agy` CLI and `Antigravity.app`) and Anthropic Claude Code accounts (`claude` CLI).

AIMux guarantees **true concurrent account isolation**: you can run multiple independent terminal sessions under different profiles simultaneously without credential collisions, token leakage, or session corruption.

---

## Key Features

- **Concurrent Multi-Account Isolation**:
  - **Claude Code**: Native keychain namespace isolation via dynamic SHA-256 derivation with `CLAUDE_CONFIG_DIR`.
  - **Google Antigravity**: Dedicated profile-jailed keychain search list and isolated home directory.
  - Run `Google Personal`, `Google Work`, `Claude Personal`, and `Claude Work` side-by-side.
- **Dual Interfaces**:
  - **Desktop GUI**: Sleek dark-mode interface built with Tauri v2, React 18, Tailwind CSS, and embedded Xterm.js PTY console.
  - **Headless CLI (`aimux`)**: Full-featured standalone CLI that runs independently of the GUI.
- **Zero Raw Secrets Stored**:
  - The AIMux database stores **zero** API tokens, bearer tokens, passwords, or cookies.
  - Tokens remain solely inside the system keyring or provider-managed configuration.
  - Real-time token redactor scrubs any accidental credential leakage from diagnostics and logs.
- **Truth in Status & UI**:
  - Never marks a profile as "isolated" if it is merely renamed.
  - Accurately reports single-instance constraints (e.g. Electron single-instance lock on Antigravity desktop).
- **Process Supervisor & PTY**:
  - Real-time session supervisor tracking process liveness, PIDs, working directories, and exit codes.
  - Launch external terminal windows or embedded interactive PTY sessions.
- **Non-Destructive Storage**:
  - Profile deletion never touches project repositories or workspace code.
  - Atomic JSON persistence with cross-process file locking.

---

## Profile Setup & Authentication Workflow (Step-by-Step)

AIMux does **not** intercept, proxy, or extract your private credentials. Authentication occurs directly through the provider's official CLI inside an isolated sandbox.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. New Profile  │ ───►  │ 2. Launch PTY   │ ───►  │ 3. Sign In in   │ ───►  │ 4. Click Verify │
│ Pick Provider   │       │ Select Folder & │       │ Terminal via    │       │ Shows Loader &  │
│ & Friendly Name │       │ Open Console    │       │ Official OAuth  │       │ Confirms Email  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Step 1: Create a Profile in the GUI
1. Open **AIMux** from `/Applications/AIMux.app` (or launch `aimux-desktop`).
2. Click **+ New Profile** in the top right corner.
3. Select your provider platform:
   - **Anthropic Claude Code**: Uses isolated `CLAUDE_CONFIG_DIR` with dynamic SHA-256 keychain namespacing.
   - **Google Antigravity**: Uses profile-jailed keychain search list and isolated configuration context.
4. Enter a friendly profile name (e.g. `Claude Personal`, `Google Work`, `Client Alpha`).
5. *(Optional)* Select a default project directory (or leave blank for home `~`) and pick a color tag.
6. Click **Create Profile**. Your new profile will appear on the dashboard marked as `Unverified`.

### Step 2: Launch the Embedded Terminal (`Launch PTY`)
1. On the profile card, click the **Launch PTY** button (or click the **Sign In** shortcut link).
2. The **Launch Session** modal will prompt you for the working directory:
   - Keep the default directory, type any project path, or click **Browse...** to pick a folder via native Finder dialog.
   - Select **Embedded Console** mode.
   - *(Optional)* Check *"Save directory as default for this profile"* if you want AIMux to remember it.
   - Click **Launch Session** (or press `Enter`).
3. The embedded terminal panel opens inside AIMux, running the official provider CLI (`claude` or `agy`) in an isolated sandbox.

### Step 3: Complete Sign-In Inside the Terminal
1. Follow the provider's standard interactive authentication prompt displayed in the terminal:
   - For **Claude Code**: The CLI displays a login URL or opens the browser for Anthropic OAuth sign-in. Confirm access in your browser.
   - For **Google Antigravity**: The `agy` CLI displays the Google sign-in prompt or browser link to authorize your Google Account / Google AI Pro subscription.
2. Complete the authentication flow until the CLI confirms you are logged in.

### Step 4: Click Verify (With Live Loading Feedback)
1. On the profile card, click the **Verify** button.
2. The button will immediately display a spinning loader with **`Verifying...`** while AIMux queries the isolated provider credentials.
3. Once verified, the profile card displays:
   - A green **Active Account** checkmark (`✓`)
   - Your verified account email and display name
   - Your organization and subscription plan tier (e.g. `Google AI Pro`, `Team`, `Pro`)
4. Any terminal session launched under this profile will now use this authenticated account independently of other profiles.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             AIMux Desktop              │
                      │       (Tauri v2 + React 18 UI)         │
                      └──────────────────┬─────────────────────┘
                                         │ Tauri IPC Commands
                      ┌──────────────────▼─────────────────────┐
                      │               AIMux CLI                │
                      │           (Clap Derive v4)             │
                      └──────────────────┬─────────────────────┘
                                         │
                      ┌──────────────────▼─────────────────────┐
                      │              aimux-core                │
                      ├────────────────────────────────────────┤
                      │ • Profile Store (Atomic JSON + Locks)  │
                      │ • Session Supervisor & Process Monitor │
                      │ • Redactor & Zero-Token Sanitizer      │
                      │ • Provider Adapters (Claude / AGY)     │
                      │ • Portable PTY & External Terminal     │
                      └──────────────┬─────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────┐            ┌──────────────────────────────┐
│     Claude Code Adapter      │            │     Antigravity Adapter      │
│  • Dynamic SHA-256 Keychain  │            │  • Profile-Jailed Keychain   │
│  • CLAUDE_CONFIG_DIR Jailing │            │  • Isolated HOME / Config    │
│  • Zero Credential Overlap   │            │  • Real-Time Token Redaction │
└──────────────────────────────┘            └──────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical specifications.

---

## Quick Global Installation (No Manual Building Required)

### Option A: One-Line Installer (CLI + Desktop GUI)

Install the standalone `aimux` CLI globally into `~/.local/bin` and the `AIMux.app` desktop application into `/Applications`:

```bash
curl -fsSL https://raw.githubusercontent.com/Vs153698/aimux/main/install.sh | bash
```

### Option B: Install CLI Globally via Cargo

If you have Rust installed and only want the headless CLI tool available system-wide:

```bash
cargo install --git https://github.com/Vs153698/aimux.git aimux-cli
```

### Option C: Download Prebuilt Releases

Download precompiled standalone binaries or the macOS `.app` bundle from [GitHub Releases](https://github.com/Vs153698/aimux/releases):
- **macOS Desktop App**: `AIMux.app.tar.gz` (extract and drag to `/Applications`)
- **macOS CLI (Apple Silicon)**: `aimux-Darwin-arm64`
- **macOS CLI (Intel)**: `aimux-Darwin-x86_64`
- **Linux CLI**: `aimux-Linux-x86_64`
- **Windows CLI**: `aimux-Windows-x86_64.exe`

---

## Building from Source (Developers)

### Prerequisites

- **Rust**: Version 1.75+ (`rustc` and `cargo`)
- **Node.js**: Version 18+ and `npm`
- **Platform Dependencies**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - **Windows**: Microsoft Visual Studio C++ Build Tools & WebView2 Runtime

### One-Command Package & Install (macOS)

Build both the CLI and Desktop UI, package `AIMux.app`, and install directly into `/Applications` and `~/.local/bin`:

```bash
./scripts/package-macos.sh --install
```

### 1. Build Desktop GUI & Web Assets

```bash
# Build React frontend
cd crates/aimux-desktop/ui
npm install
npm run build
cd ../../..

# Build Tauri desktop app
cargo build --release -p aimux-desktop
```

The compiled desktop executable will be located at:
- `target/release/aimux-desktop` (or `target/debug/aimux-desktop` for debug builds)

### 2. Build Headless CLI

```bash
cargo build --release -p aimux-cli
```

The compiled CLI executable will be located at:
- `target/release/aimux`

You can symlink or copy `aimux` to your `PATH` (e.g. `/usr/local/bin` or `~/.local/bin`):
```bash
cp target/release/aimux ~/.local/bin/aimux
```

---

## CLI Reference

### Environment Diagnostics
```bash
# Probe system health, verify provider CLI binaries, check isolation mechanisms
aimux doctor

# List provider adapters and installed versions
aimux providers
```

### Profile Management
```bash
# List all configured profiles with verification status
aimux profiles list

# Add a new account profile
aimux profiles add --provider claude --name "Claude Work" --workspace ~/Projects/api
aimux profiles add --provider antigravity --name "Google Personal" --workspace ~/Personal

# Inspect details of a specific profile
aimux profiles show "Claude Work"

# Verify provider authenticated identity
aimux profiles verify "Claude Work"

# Remove a profile (preserves workspace files)
aimux profiles remove "Claude Work"
aimux profiles remove "Claude Work" --purge # also cleans profile config dir
```

### Session Execution
```bash
# Launch profile in an external terminal window
aimux launch "Claude Work" --external

# Launch in a specific project directory
aimux launch "Google Personal" --cwd ~/Projects/my-app

# Run custom commands in the profile's isolated environment
aimux run "Google Personal" -- agy
aimux run "Claude Work" -- claude doctor
```

### Active Session Supervision
```bash
# List all active and recent sessions
aimux sessions list

# Show details of a specific session
aimux sessions show <session-id>

# Terminate a running session safely
aimux sessions stop <session-id>
```

### Backup & Restore
```bash
# Export non-secret configuration backup
aimux backup --out ./aimux-backup.json

# Restore profiles from backup
aimux restore ./aimux-backup.json
```

---

## Security Model & Threat Guarantees

1. **Zero Credential Storage**: Neither API keys, bearer tokens, nor cookies are ever saved in AIMux configuration.
2. **Keyring Isolation**:
   - Claude Code uses distinct keychain service names computed from `CLAUDE_CONFIG_DIR`.
   - Antigravity uses dedicated profile-jailed keychains.
3. **Strict Permissions**:
   - Configuration root: `0700` (`rwx------`)
   - Profile JSON database: `0600` (`rw-------`)
4. **Advisory File Locking**: High-concurrency atomic writes using `fs2` advisory file locks protect against concurrent GUI and CLI race conditions.
5. **Real-Time Token Redaction**: Automatic regex scrubbing of `Bearer`, `sk-ant-`, `AIza`, and `ya29` credentials from all diagnostics and logs.

See [docs/SECURITY.md](docs/SECURITY.md) for our full threat model and mitigations.

---

## Running the Test Suite

```bash
cargo test --workspace
```

All 6 core engine and integration tests cover:
- Real-time token redactor (Bearer, Anthropic, Google tokens).
- Atomic profile CRUD and filesystem traversal defense.
- Process supervisor lifecycle and liveness monitoring.
- Environment variable injection and isolation boundaries.

---

## License

This project is dual-licensed under either:
- **MIT License** ([LICENSE](LICENSE) or http://opensource.org/licenses/MIT)
- **Apache License, Version 2.0** (http://www.apache.org/licenses/LICENSE-2.0)

at your option.
