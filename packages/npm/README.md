# @vs153698/aimux

> **AIMux** — Universal Multi-Account Isolation & Autonomous Handoff Manager for Claude Code & Google Antigravity.

Published on the **GitHub Package Registry**.

## Installation via GitHub Packages

Configure your `.npmrc` to use GitHub Packages for the `@vs153698` scope:

```bash
echo "@vs153698:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

Install globally:

```bash
npm install -g @vs153698/aimux
```

Or run directly with `npx`:

```bash
npx @vs153698/aimux doctor
```

## Features

- **Multi-Account Profile Isolation**: Run work and personal Anthropic Claude Code & Google Antigravity side-by-side with isolated Keychain and config directories.
- **Git & Committer Identity Guard**: Lock author names, emails, and SSH keys per profile to eliminate credential contamination.
- **Autonomous Rate-Limit Failover**: Auto-transfers live task context (`git diff`, branch state, and terminal history) from a stalled AI agent to an available alternative within 5 seconds.
- **Embedded & External PTY Console**: Unified interactive terminal panel with process lifecycle controls.

## GitHub Repository & Documentation

[https://github.com/Vs153698/aimux](https://github.com/Vs153698/aimux)
