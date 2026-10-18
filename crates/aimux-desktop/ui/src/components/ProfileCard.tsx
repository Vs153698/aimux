import React from 'react';
import { 
  ExternalLink, 
  Trash2, 
  Folder, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Play
} from 'lucide-react';
import { ProfileMetadata } from '../types';

interface ProfileCardProps {
  profile: ProfileMetadata;
  isVerifying?: boolean;
  onLaunchPrompt: (profile: ProfileMetadata, defaultMode: 'external' | 'embedded') => void;
  onVerify: (profile: ProfileMetadata) => void;
  onDelete: (profile: ProfileMetadata) => void;
  onPickDirectory?: (profile: ProfileMetadata) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isVerifying = false,
  onLaunchPrompt,
  onVerify,
  onDelete,
  onPickDirectory,
}) => {
  const isClaude = profile.provider === 'claude_code';
  const identity = profile.verified_identity;

  return (
    <div className="bg-[#10131b] border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md">
      <div>
        {/* Top Header: Indicator + Name + Provider + Delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: profile.color_tag || (isClaude ? '#a855f7' : '#3b82f6') }}
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
                {profile.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                    isClaude
                      ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                      : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                  }`}
                >
                  {isClaude ? 'Claude Code' : 'Antigravity'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  #{profile.id.slice(0, 6)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onDelete(profile)}
            className="text-zinc-500 hover:text-rose-400 p-1 rounded-md hover:bg-zinc-800/60 transition-colors opacity-70 group-hover:opacity-100"
            title="Delete Profile"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Identity & Status */}
        <div className="mt-3.5 px-3 py-2.5 rounded-lg bg-[#0a0c10] border border-zinc-800/80">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-zinc-500 font-medium">Provider Identity</span>
            <button
              onClick={() => onVerify(profile)}
              disabled={isVerifying}
              className="text-zinc-400 hover:text-zinc-200 disabled:opacity-50 flex items-center gap-1 transition-colors"
              title="Verify active account status"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isVerifying ? 'animate-spin text-zinc-200' : ''}`} />
              <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
            </button>
          </div>

          {identity ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{identity.email || identity.display_name || 'Active Account'}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 pl-5">
                {identity.organization && <span>Org: {identity.organization}</span>}
                {identity.plan_tier && (
                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                    {identity.plan_tier}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-amber-400/90 py-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Unverified. Sign in via terminal.</span>
              </div>
              <button
                onClick={() => onLaunchPrompt(profile, 'embedded')}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline font-mono flex-shrink-0 ml-1"
                title="Launch embedded terminal to authenticate"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Project Directory / Workspace */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0 text-zinc-400 font-mono text-[11px]">
            <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <span 
              className="truncate" 
              title={profile.default_workspace || 'Default: Home directory (~)'}
            >
              {profile.default_workspace || '~ (Home)'}
            </span>
          </div>

          {onPickDirectory && (
            <button
              onClick={() => onPickDirectory(profile)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium ml-2 px-1.5 py-0.5 rounded hover:bg-zinc-800/60 transition-colors flex-shrink-0"
              title="Set default directory"
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
        <button
          onClick={() => onLaunchPrompt(profile, 'external')}
          className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-zinc-700/60 hover:border-zinc-600"
          title="Prompt directory and launch in external terminal"
        >
          <ExternalLink className="w-3 h-3 text-zinc-400" />
          <span>Terminal</span>
        </button>

        <button
          onClick={() => onLaunchPrompt(profile, 'embedded')}
          className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          title="Prompt directory and launch in embedded console"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch PTY</span>
        </button>
      </div>
    </div>
  );
};
