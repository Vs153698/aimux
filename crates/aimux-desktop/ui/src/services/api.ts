import { DiagnosticItem, ProfileMetadata, SessionMetadata } from '../types';

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
    name: 'Google Personal',
    provider: 'google_antigravity',
    created_at: Date.now() - 172800000,
    last_used_at: Date.now() - 7200000,
    profile_dir: '~/.aimux/profiles/google-personal',
    default_workspace: '/Users/me/Personal/experiments',
    color_tag: '#3b82f6',
    verified_identity: {
      email: 'alex.personal@gmail.com',
      display_name: 'Alex P.',
      plan_tier: 'Google AI Pro',
      verified_at: Date.now() - 7200000,
    },
  },
];

let mockSessions: SessionMetadata[] = [];

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
  }): Promise<ProfileMetadata> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('create_profile', data);
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
    };
    mockProfiles.push(newProf);
    return newProf;
  },

  async removeProfile(id: string, purge: boolean = false): Promise<void> {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('remove_profile', { id, purge });
    }
    mockProfiles = mockProfiles.filter((p) => p.id !== id);
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
      sess.exit_code = 143;
    }
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
        title: 'Antigravity Desktop Single-Instance Lock',
        details: 'Electron single-instance lock restricts simultaneous GUI windows per OS user. Use independent CLI sessions.',
        remediation: 'Use AIMux CLI profile launcher for concurrent isolated sessions.',
      },
    ];
  },
};
