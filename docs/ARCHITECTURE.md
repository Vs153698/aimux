# AIMux Architecture & Technical Design

## 1. System Overview

`AIMux` (AI Account Multiplexer) is a local, secure account management platform designed specifically for multi-account concurrent operation with **Anthropic Claude Code** (`claude`) and **Google Antigravity** (`agy` CLI and `Antigravity.app`).

Unlike generic multi-account managers, AIMux was built on direct reverse-engineering of provider authentication binaries and system keychain interactions, guaranteeing true concurrent account isolation without token collisions or security leaks.

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

---

## 2. Profile Isolation Engineering

### 2.1 Claude Code CLI (`claude`)
- **Key Discovery**: Claude Code CLI computes its system keychain service name dynamically:
  $$\text{Service Name} = \text{"Claude Code-credentials-"} + \text{SHA256}(\text{CLAUDE\_CONFIG\_DIR})[0..8]$$
- **Isolation Mechanism**: By provisioning each profile its own directory under `~/.aimux/profiles/<uuid>` and launching `claude` with `CLAUDE_CONFIG_DIR=~/.aimux/profiles/<uuid>`, Claude Code automatically reads and writes to a completely distinct system keychain entry.
- **Concurrency**: Multiple terminal sessions pointing to different profiles run 100% concurrently without session corruption or account switching.

### 2.2 Google Antigravity CLI (`agy`)
- **Key Discovery**: The `agy` Go binary calls `/usr/bin/security find-generic-password -s gemini -a antigravity -w` with a hardcoded un-namespaced service and account name.
- **Isolation Mechanism**: On macOS, AIMux constructs a dedicated profile-jailed keychain inside `~/.aimux/profiles/<uuid>/Library/Keychains/login.keychain-db` and prepends it to the user's keychain search list when launching under `HOME=~/.aimux/profiles/<uuid>`. This confines `agy`'s credential reads and writes strictly to the profile's dedicated keychain.
- **Concurrency**: Concurrent `agy` sessions operate simultaneously under independent Google identities.

### 2.3 Antigravity Desktop App (`Antigravity.app`)
- **Finding**: Electron's `app.requestSingleInstanceLock()` prevents two instances of the GUI application from running under the same OS user.
- **AIMux Policy**: AIMux clearly reflects this in the GUI and CLI (Doctor status shows an advisory with clear explanation). For concurrent workflows, AIMux executes multiple isolated CLI sessions. Profile switching for the desktop app is safely orchestrated without credential corruption.

---

## 3. Storage Hierarchy & Permissions

All local configuration and profile state is stored under strictly secured directories:

```
~/.aimux/                               (0700: Owner only)
├── .aimux.lock                         (Advisory cross-process file lock)
├── profiles.json                       (0600: Profile metadata & verified identity)
├── profiles/
│   ├── <profile-uuid-1>/               (0700: Jailed isolated directory)
│   │   ├── .claude.json / agy auth
│   │   └── Library/Keychains/          (macOS isolated keychain)
│   └── <profile-uuid-2>/
└── sessions/
    ├── <session-uuid-1>.json           (Active process PID, mode, cwd)
    └── <session-uuid-2>.json
```

- **Atomic File Writing**: `profiles.json` updates write first to a `.profiles.json.tmp.<uuid>` file, execute `fsync()`, and atomically rename to the target path.
- **Non-Destructive Cleanup**: Deleting a profile from AIMux retains workspace code. Purging only removes the provider's configuration subfolder if explicitly confirmed.

---

## 4. Zero Secrets Principle

1. **No Tokens in AIMux Database**: `profiles.json` contains metadata only:
   - Friendly name
   - Provider identifier
   - Creation and last-used timestamps
   - Default workspace directory
   - Non-sensitive verified identity (email, display name, plan tier)
2. **Never Touch Tokens**: Authentication tokens remain solely within provider-managed keychains or authorized config files.
3. **Log & Diagnostic Redaction**: All stderr/stdout logs passed through the doctor or diagnostic engine are stripped using regex-based token redactors (`Bearer`, `sk-ant-`, `AIza`, `ya29`).
