import { DiagnosticItem, ProfileMetadata, SessionMetadata, HandoffPreview } from '../types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
};

let mockProfiles: ProfileMetadata[] = [
  {
    id: 'mock-1',
    name: 'Claude Work',
    provider: 'claude_code',
    created_at: Date.now() - 86400000,
    last_used_at: Date.now() - 3600000,
    profile_dir: '~/.aimux/profiles/claude-work',
    default_workspace: '/Users/me/Projects/api-backend',
    color_tag: '#8b5cf6',
    git_name: 'Alex Developer',
    git_email: 'alex@enterprise-ai.com',
    ssh_key_path: '~/.ssh/id_ed25519_corp',
    verified_identity: {
      email: 'alex@enterprise-ai.com',
      display_name: 'Alex Developer',
      organization: 'Enterprise AI Lab',
      plan_tier: 'Team',
      verified_at: Date.now() - 3600000,
    },
  },
  {
    id: 'mock-2',
    name: 'Google Antigravity Work',
    provider: 'google_antigravity',
    created_at: Date.now() - 172800000,
    last_used_at: Date.now() - 7200000,
    profile_dir: '~/.aimux/profiles/google-work',
    default_workspace: '/Users/me/Projects/api-backend',
    color_tag: '#3b82f6',
    git_name: 'Alex Developer',
    git_email: 'alex.work@enterprise.com',
    ssh_key_path: '~/.ssh/id_ed25519_work',
    verified_identity: {
      email: 'alex.work@enterprise.com',
      display_name: 'Alex D.',
      organization: 'Enterprise AI Lab',
      plan_tier: 'Google AI Pro',
      verified_at: Date.now() - 7200000,
    },
  },
  {
    id: 'mock-3',
    name: 'Personal Claude',
    provider: 'claude_code',
    created_at: Date.now() - 259200000,
    last_used_at: Date.now() - 1800000,
    profile_dir: '~/.aimux/profiles/personal-claude',
    default_workspace: '/Users/me/Personal/experiments',
    color_tag: '#10b981',
    git_name: 'Alex Personal',
    git_email: 'alex.personal@gmail.com',
    verified_identity: {
      email: 'alex.personal@gmail.com',
      display_name: 'Alex P.',
      plan_tier: 'Pro',
      verified_at: Date.now() - 1800000,
    },
  },
];

let mockSessions: SessionMetadata[] = [
  {
    session_id: 'sess-84f92a10',
    profile_id: 'mock-1',
    provider: 'claude_code',
    pid: 38492,
    cwd: '/Users/me/Projects/api-backend',
    command: 'claude',
    started_at: Date.now() - 420000,
    status: 'running',
    terminal_mode: 'embedded',
  },
];

export const api = {
  async listProfiles(): Promise<ProfileMetadata[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('list_profiles');
    }
    return [...mockProfiles];
  },

  async createProfile(data: {
    name: string;
    provider: string;
    default_workspace?: string;
    color_tag?: string;
    git_name?: string;
    git_email?: string;
    ssh_key_path?: string;
  }): Promise<ProfileMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('create_profile', {
        name: data.name,
        provider: data.provider,
        defaultWorkspace: data.default_workspace,
        colorTag: data.color_tag,
        gitName: data.git_name,
        gitEmail: data.git_email,
        sshKeyPath: data.ssh_key_path,
      });
    }
    const newProf: ProfileMetadata = {
      id: `mock-${Date.now()}`,
      name: data.name,
      provider: data.provider as any,
      created_at: Date.now(),
      last_used_at: Date.now(),
      default_workspace: data.default_workspace,
      profile_dir: `~/.aimux/profiles/${data.name.toLowerCase().replace(/\s+/g, '-')}`,
      color_tag: data.color_tag || '#3b82f6',
      git_name: data.git_name,
      git_email: data.git_email,
      ssh_key_path: data.ssh_key_path,
    };
    mockProfiles.push(newProf);
    return newProf;
  },

  async updateProfileGit(
    id: string,
    git_name?: string,
    git_email?: string,
    ssh_key_path?: string
  ): Promise<ProfileMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('update_profile_git', {
        id,
        gitName: git_name,
        gitEmail: git_email,
        sshKeyPath: ssh_key_path,
      });
    }
    const prof = mockProfiles.find((p) => p.id === id);
    if (prof) {
      prof.git_name = git_name;
      prof.git_email = git_email;
      prof.ssh_key_path = ssh_key_path;
      return { ...prof };
    }
    throw new Error('Profile not found');
  },

  async removeProfile(id: string, purge: boolean = false): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('remove_profile', { id, purge });
    }
    mockProfiles = mockProfiles.filter((p) => p.id !== id);
  },

  async updateProfileWorkspace(id: string, workspace?: string): Promise<ProfileMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('update_profile_workspace', { id, workspace });
    }
    const prof = mockProfiles.find((p) => p.id === id);
    if (prof) {
      prof.default_workspace = workspace;
      return { ...prof };
    }
    throw new Error('Profile not found');
  },

  async pickDirectory(): Promise<string | null> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('pick_directory');
    }
    return prompt('Enter project directory path:', '/Users/developer/Projects/my-app');
  },

  async verifyProfile(id: string): Promise<ProfileMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('verify_profile', { id });
    }
    const prof = mockProfiles.find((p) => p.id === id);
    if (prof) {
      prof.verified_identity = {
        email: `${prof.name.toLowerCase().replace(/\s+/g, '')}@verified.io`,
        display_name: prof.name,
        verified_at: Date.now(),
      };
      return { ...prof };
    }
    throw new Error('Profile not found');
  },

  async launchSession(
    profileId: string,
    workspace?: string,
    external: boolean = false,
    customCommand?: string[]
  ): Promise<SessionMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('launch_session', {
        profileId,
        workspace,
        external,
        customCommand,
      });
    }

    const prof = mockProfiles.find((p) => p.id === profileId);
    const newSession: SessionMetadata = {
      session_id: `sess-${Date.now()}`,
      profile_id: profileId,
      provider: prof ? prof.provider : 'claude_code',
      pid: Math.floor(Math.random() * 50000) + 1000,
      cwd: workspace || prof?.default_workspace || '/Users/me/Projects',
      command: customCommand ? customCommand.join(' ') : (prof?.provider === 'google_antigravity' ? 'agy' : 'claude'),
      started_at: Date.now(),
      status: 'running',
      terminal_mode: external ? 'external' : 'embedded',
    };
    mockSessions.unshift(newSession);
    return newSession;
  },

  async listSessions(): Promise<SessionMetadata[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('list_sessions');
    }
    return [...mockSessions];
  },

  async stopSession(sessionId: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('stop_session', { sessionId });
    }
    const sess = mockSessions.find((s) => s.session_id === sessionId);
    if (sess) {
      sess.status = 'exited';
      sess.exit_code = 137;
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('delete_session', { sessionId });
    }
    mockSessions = mockSessions.filter((s) => s.session_id !== sessionId);
  },

  async clearExitedSessions(): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('clear_exited_sessions');
    }
    mockSessions = mockSessions.filter((s) => s.status === 'running');
  },

  async getDiagnostics(): Promise<DiagnosticItem[]> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('get_diagnostics');
    }
    return [
      {
        category: 'Binary Discovery',
        status: 'ok',
        title: 'Claude Code CLI',
        details: 'Found binary at /opt/homebrew/bin/claude (v2.1.172)',
      },
      {
        category: 'Authentication Isolation',
        status: 'ok',
        title: 'CLAUDE_CONFIG_DIR Support',
        details: 'Dynamic SHA-256 Keychain service isolation confirmed active.',
      },
      {
        category: 'CLI Discovery',
        status: 'ok',
        title: 'Antigravity CLI (agy)',
        details: 'Found binary at /Users/vaibhavsingh/.local/bin/agy (v1.4.2)',
      },
      {
        category: 'Desktop Application',
        status: 'warning',
        title: 'Antigravity Desktop SingleInstance Lock',
        details: 'Electron single-instance lock restricts simultaneous GUI windows per OS user. Use independent CLI sessions.',
        remediation: 'Use AIMux CLI profile launcher for concurrent isolated sessions.',
      },
    ];
  },

  async prepareHandoffContext(sessionId: string): Promise<HandoffPreview> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('prepare_handoff_context', { sessionId });
    }
    return {
      source_session_id: sessionId,
      source_profile_id: 'mock-1',
      source_profile_name: 'Claude Work',
      source_provider: 'claude_code',
      cwd: '/Users/me/Projects/api-backend',
      context_markdown: '=== AIMUX CROSS-PROVIDER HANDOFF CONTEXT ===\nResuming previous session work.\n',
      available_target_profiles: mockProfiles.filter((p) => p.id !== 'mock-1'),
    };
  },

  async executeHandoff(
    sourceSessionId: string,
    targetProfileId: string,
    contextMarkdown: string
  ): Promise<SessionMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('execute_handoff', {
        sourceSessionId,
        targetProfileId,
        contextMarkdown,
      });
    }
    const newSess: SessionMetadata = {
      session_id: `sess-${Date.now()}`,
      profile_id: targetProfileId,
      provider: 'google_antigravity',
      pid: Math.floor(Math.random() * 50000) + 1000,
      cwd: '/Users/me/Projects/api-backend',
      command: 'agy',
      started_at: Date.now(),
      status: 'running',
      terminal_mode: 'embedded',
    };
    mockSessions.unshift(newSess);
    return newSess;
  },
};
