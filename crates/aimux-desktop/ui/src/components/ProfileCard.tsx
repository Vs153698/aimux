import React from 'react';
import { Terminal, ExternalLink, ShieldCheck, AlertCircle, Trash2, Folder, CheckCircle2, RefreshCw } from 'lucide-react';
import { ProfileMetadata } from '../types';

interface ProfileCardProps {
  profile: ProfileMetadata;
  onLaunch: (profile: ProfileMetadata, external: boolean) => void;
  onVerify: (profile: ProfileMetadata) => void;
  onDelete: (profile: ProfileMetadata) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onLaunch,
  onVerify,
  onDelete,
}) => {
  const isClaude = profile.provider === 'claude_code';
  const identity = profile.verified_identity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: profile.color_tag || (isClaude ? '#8b5cf6' : '#3b82f6') }}
            />
            <div>
              <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                {profile.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isClaude
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                      : 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                  }`}
                >
                  {isClaude ? 'Claude Code' : 'Google Antigravity'}
                </span>
                <span className="text-xs text-slate-500">• ID: {profile.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onDelete(profile)}
            className="text-slate-500 hover:text-red-400 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
            title="Delete Profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Identity & Status */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Authenticated Identity</span>
            <button
              onClick={() => onVerify(profile)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              title="Re-check authentication status"
            >
              <RefreshCw className="w-3 h-3" />
              Verify
            </button>
          </div>

          {identity ? (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{identity.email || identity.display_name || 'Active Account'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-5.5">
                {identity.organization && <span>Org: {identity.organization}</span>}
                {identity.plan_tier && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/40">
                    {identity.plan_tier}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/20 p-2 rounded border border-amber-800/30">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Unverified. Launch a terminal session to complete provider sign-in.</span>
            </div>
          )}
        </div>

        {/* Workspace directory */}
        <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 truncate">
          <Folder className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="truncate" title={profile.default_workspace || 'Current directory'}>
            Workspace: {profile.default_workspace || 'Current Directory'}
          </span>
        </div>

        {!isClaude && (
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span>Profile-jailed Keychain isolation active</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2">
        <button
          onClick={() => onLaunch(profile, true)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-slate-700 hover:border-slate-600"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          Open Terminal
        </button>

        <button
          onClick={() => onLaunch(profile, false)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/90 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm shadow-blue-600/20"
        >
          <Terminal className="w-3.5 h-3.5" />
          Embedded PTY
        </button>
      </div>
    </div>
  );
};
