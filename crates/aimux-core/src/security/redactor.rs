use regex::Regex;
use std::sync::OnceLock;

static REDACT_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();

fn get_patterns() -> &'static [Regex] {
    REDACT_PATTERNS.get_or_init(|| {
        vec![
            // Anthropic API keys (sk-ant-...)
            Regex::new(r"sk-ant-[a-zA-Z0-9_\-]{20,}").unwrap(),
            // Bearer tokens (JWTs or standard tokens)
            Regex::new(r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}").unwrap(),
            // Google OAuth tokens
            Regex::new(r"ya29\.[a-zA-Z0-9_\-]{20,}").unwrap(),
            // Google API keys
            Regex::new(r"AIza[0-9A-Za-z\-_]{20,}").unwrap(),
            // Generic authorization header values
            Regex::new(r"(?i)(authorization|api-key|x-api-key):\s*([^\s]{8,})").unwrap(),
            // Password fields in URLs or parameters
            Regex::new(r"(?i)(password|token|secret|access_token|refresh_token)=([^\s&]+)").unwrap(),
        ]
    })
}

/// Redacts sensitive keys, tokens, and secrets from a string.
pub fn redact_secrets(input: &str) -> String {
    let mut sanitized = input.to_string();
    for regex in get_patterns() {
        sanitized = regex.replace_all(&sanitized, "[REDACTED_SECRET]").to_string();
    }
    sanitized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_anthropic_api_key() {
        let text = "Using key sk-ant-api03-abcdef1234567890abcdef1234567890 in session";
        let red = redact_secrets(text);
        assert!(!red.contains("sk-ant-"));
        assert!(red.contains("[REDACTED_SECRET]"));
    }

    #[test]
    fn test_redact_bearer_token() {
        let text = "Header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdef1234567890";
        let red = redact_secrets(text);
        assert!(!red.contains("eyJhbGci"));
        assert!(red.contains("[REDACTED_SECRET]"));
    }

    #[test]
    fn test_redact_google_tokens() {
        let text = "OAuth ya29.a0AfH6SMB_1234567890abcdefghijklmnopqrstuvwxyz and key AIzaSyA1234567890abcdefghijklmnopqrstu";
        let red = redact_secrets(text);
        assert!(!red.contains("ya29."));
        assert!(!red.contains("AIzaSyA"));
    }
}
