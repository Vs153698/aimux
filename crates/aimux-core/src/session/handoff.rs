use std::path::Path;
use std::process::Command;

/// Check if text contains known provider rate limit or quota exhaustion signatures.
pub fn detect_rate_limit(text: &str) -> Option<&'static str> {
    let lower = text.to_lowercase();

    // Anthropic Claude Code signatures
    if lower.contains("reached your current message limit")
        || lower.contains("reached your message limit")
        || lower.contains("approaching rate limit")
        || lower.contains("out of extra usage")
        || lower.contains("rate_limit_error")
        || (lower.contains("rate limit") && lower.contains("exceeded"))
        || (lower.contains("rate limit") && lower.contains("resets"))
        || (lower.contains("429") && lower.contains("too many requests"))
    {
        return Some("Claude Code rate limit / message capacity reached");
    }

    // Google Antigravity signatures
    if lower.contains("quota exceeded for quota metric")
        || lower.contains("resource has been exhausted")
        || lower.contains("rate limit reached")
        || (lower.contains("quota") && lower.contains("exhausted"))
        || (lower.contains("rate limit") && lower.contains("quota"))
    {
        return Some("Google Antigravity quota threshold reached");
    }

    None
}

/// Strip ANSI terminal escape codes from raw PTY text
pub fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_escape = false;
    for c in s.chars() {
        if c == '\x1b' {
            in_escape = true;
        } else if in_escape {
            if c.is_ascii_alphabetic() {
                in_escape = false;
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Extract git status and diff stat from the working directory
pub fn get_git_status(cwd: &Path) -> (Option<String>, Option<String>) {
    let status_out = Command::new("git")
        .args(["status", "--short"])
        .current_dir(cwd)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if !s.is_empty() { Some(s) } else { None }
            } else {
                None
            }
        });

    let diff_out = Command::new("git")
        .args(["diff", "--stat"])
        .current_dir(cwd)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if !s.is_empty() { Some(s) } else { None }
            } else {
                None
            }
        });

    (status_out, diff_out)
}

/// Generate structured Handoff Bridge Context markdown
pub fn generate_handoff_context(
    cwd: &Path,
    source_profile_name: &str,
    source_provider: &str,
    pty_history: &str,
    reason: &str,
) -> String {
    let clean_history = strip_ansi(pty_history);
    let lines: Vec<&str> = clean_history
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with("[AIMux"))
        .collect();

    let recent_slice = if lines.len() > 30 {
        &lines[lines.len() - 30..]
    } else {
        &lines[..]
    };
    let recent_log = recent_slice.join("\n");

    let (git_status, git_diff) = get_git_status(cwd);

    let mut context = String::new();
    context.push_str("=== AIMUX CROSS-PROVIDER HANDOFF CONTEXT ===\n");
    context.push_str(&format!("Source Profile: {} ({})\n", source_profile_name, source_provider));
    context.push_str(&format!("Working Directory: {}\n", cwd.display()));
    context.push_str(&format!("Handoff Reason: {}\n\n", reason));

    context.push_str("### 1. Repository State & Uncommitted Changes\n");
    if let Some(status) = git_status {
        context.push_str("```\n");
        context.push_str(&status);
        context.push_str("\n```\n");
    } else {
        context.push_str("Clean working tree (no uncommitted changes).\n");
    }

    if let Some(diff) = git_diff {
        context.push_str("\nDiff Summary:\n```\n");
        context.push_str(&diff);
        context.push_str("\n```\n");
    }

    context.push_str("\n### 2. Recent Ongoing Conversation & Task Context\n");
    if !recent_log.is_empty() {
        context.push_str("```text\n");
        context.push_str(&recent_log);
        context.push_str("\n```\n");
    } else {
        context.push_str("No prior session history captured.\n");
    }

    context.push_str("\n### 3. Continuation Directive\n");
    context.push_str("You are continuing the work above that was previously started under another AI provider account that hit a rate limit. ");
    context.push_str("Review the repository files and recent task log, and seamlessly resume where the previous agent left off.\n");
    context.push_str("============================================\n");

    context
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_detect_rate_limit_claude() {
        assert!(detect_rate_limit("You've reached your current message limit until 3pm").is_some());
        assert!(detect_rate_limit("Error: 429 Too Many Requests").is_some());
        assert!(detect_rate_limit("System: Normal operational response").is_none());
    }

    #[test]
    fn test_detect_rate_limit_antigravity() {
        assert!(detect_rate_limit("Resource has been exhausted (quota exceeded)").is_some());
        assert!(detect_rate_limit("Error: rate limit reached on model").is_some());
        assert!(detect_rate_limit("Normal build output").is_none());
    }

    #[test]
    fn test_strip_ansi() {
        let input = "\x1b[31mRed text\x1b[0m normal";
        let output = strip_ansi(input);
        assert_eq!(output, "Red text normal");
    }

    #[test]
    fn test_generate_handoff_context() {
        let dummy_cwd = PathBuf::from("/tmp");
        let ctx = generate_handoff_context(
            &dummy_cwd,
            "Claude Work",
            "Claude Code",
            "echo hello\nbuilding project...",
            "429 rate limit exceeded",
        );
        assert!(ctx.contains("=== AIMUX CROSS-PROVIDER HANDOFF CONTEXT ==="));
        assert!(ctx.contains("Source Profile: Claude Work (Claude Code)"));
        assert!(ctx.contains("Continuation Directive"));
    }
}
