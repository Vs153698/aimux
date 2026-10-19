# @vs153698/aimux

> **AIMux** — Universal Multi-Account Isolation & Autonomous Handoff Manager for Claude Code & Google Antigravity.

[![npm version](https://img.shields.io/npm/v/@vs153698/aimux.svg)](https://www.npmjs.com/package/@vs153698/aimux)
[![License](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](https://github.com/Vs153698/aimux)

## Zero-Config Quick Start (Any System with Node.js)

Run directly with `npx` (no installation required):

```bash
npx @vs153698/aimux doctor
```

Or install globally:

```bash
npm install -g @vs153698/aimux
aimux doctor
```

## Features

- **Concurrent Multi-Account Isolation**: Run work and personal Anthropic Claude Code & Google Antigravity side-by-side with isolated Keychain and configuration directories.
- **Git & Committer Identity Guard**: Lock author names, emails, and SSH keys per profile to eliminate corporate vs personal credential contamination.
- **Autonomous Rate-Limit Failover**: Auto-transfers live task context (`git diff`, branch state, and terminal history) from a stalled AI agent to an available alternative within 5 seconds.
- **Interactive PTY Console**: Unified embedded terminal panel with process lifecycle controls.

## GitHub Repository & Desktop App

Download the macOS GUI App and full source:
[https://github.com/Vs153698/aimux](https://github.com/Vs153698/aimux)
