# AIMux Security Policy & Threat Model

## 1. Zero Secrets Storage Policy

AIMux adheres to a strict, uncompromising **Zero Token Storage Policy**:
- **No Token Persistence**: AIMux database (`~/.aimux/profiles.json`) NEVER stores API tokens, bearer tokens, passwords, cookies, or refresh tokens.
- **Provider Managed Keys**: Authentication tokens remain entirely inside the system keychain or provider-managed files (`.claude.json`, `~/.aimux/profiles/<uuid>/.claude.json`).
- **No Credential Interception**: AIMux does not act as an MITM HTTP proxy or inspect TLS traffic.
- **No Private Key Extraction**: AIMux will never export or dump raw keychain items.

---

## 2. Token Redaction Engine

Any subprocess output, diagnostics probe, or log processed by AIMux passes through `aimux_core::security::redactor::TokenRedactor`.

### Redaction Rules
1. **HTTP Bearer Tokens**:
   `Bearer [A-Za-z0-9_\-\.]{16,}` $\rightarrow$ `Bearer [REDACTED_TOKEN]`
2. **Anthropic API Keys**:
   `sk-ant-[A-Za-z0-9_\-]{20,}` $\rightarrow$ `sk-ant-[REDACTED_ANTHROPIC_KEY]`
3. **Google API Keys**:
   `AIza[0-9A-Za-z_\-]{35}` $\rightarrow$ `AIza[REDACTED_GOOGLE_API_KEY]`
4. **Google OAuth Tokens**:
   `ya29\.[0-9A-Za-z_\-]{20,}` $\rightarrow$ `ya29.[REDACTED_GOOGLE_OAUTH_TOKEN]`

---

## 3. Threat Model & Mitigations

| Threat | Description | AIMux Mitigation |
| :--- | :--- | :--- |
| **Token Collision** | Two Claude sessions overwrite each other's credentials in the macOS keychain. | Dynamic SHA-256 keychain service derivation per `CLAUDE_CONFIG_DIR`. |
| **Hardcoded Keychain Interception** | `agy` Go CLI reads a static keychain entry (`-s gemini -a antigravity`). | Jailed keychain search list under dedicated profile `$HOME`. |
| **Privilege Escalation** | Rogue scripts attempt to inspect another user's AIMux profiles. | Strict POSIX permissions: directory `0700` (rwx------), files `0600` (rw-------). |
| **Path Traversal Attacks** | Malicious profile names attempting `../../etc/shadow`. | Strict validation rejecting `/`, `\`, and `..` with canonicalized base directory checks. |
| **Race Conditions** | Concurrent CLI and Desktop GUI updates to `profiles.json`. | Cross-process advisory file lock (`fs2::FileExt::lock_exclusive`) on `~/.aimux/.aimux.lock`. |
| **Accidental Data Loss** | Profile deletion wiping user code repositories. | Deletion operates exclusively on profile metadata. Profile configuration directories are only purged with explicit `--purge` flag. Workspace code is NEVER touched. |
