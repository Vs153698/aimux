export type ProviderType = 'claude_code' | 'google_antigravity';

export interface VerifiedIdentity {
  email?: string;
  display_name?: string;
  organization?: string;
  plan_tier?: string;
  verified_at: number;
}

export interface ProfileMetadata {
  id: string;
  name: string;
  provider: ProviderType;
  created_at: number;
  last_used_at: number;
  default_workspace?: string;
  profile_dir: string;
  verified_identity?: VerifiedIdentity;
  color_tag?: string;
}

export type SessionStatus = 'running' | 'exited' | 'failed';
export type TerminalMode = 'embedded' | 'external';

export interface SessionMetadata {
  session_id: string;
  profile_id: string;
  provider: ProviderType;
  pid: number;
  cwd: string;
  command: string;
  started_at: number;
  status: SessionStatus;
  exit_code?: number;
  terminal_mode: TerminalMode;
}

export type DiagnosticStatus = 'ok' | 'warning' | 'error';

export interface DiagnosticItem {
  category: string;
  status: DiagnosticStatus;
  title: string;
  details: string;
  remediation?: string;
}

export interface InstallationInfo {
  is_installed: boolean;
  binary_path?: string;
  version?: string;
  details?: string;
}

export interface ProviderCapabilityInfo {
  supports_independent_auth: boolean;
  supports_concurrent_sessions: boolean;
  supports_per_profile_settings: boolean;
  supports_per_profile_history: boolean;
  supports_identity_verification: boolean;
  supports_desktop_app_isolation: boolean;
  supports_automatic_quota: boolean;
}
