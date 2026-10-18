import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Terminal, 
  ExternalLink, 
  X, 
  Check, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { ProfileMetadata } from '../types';
import { api } from '../services/api';

interface LaunchModalProps {
  isOpen: boolean;
  profile: ProfileMetadata | null;
  defaultMode?: 'external' | 'embedded';
  onClose: () => void;
  onLaunch: (
    profile: ProfileMetadata,
    workspace: string,
    external: boolean,
    saveAsDefault: boolean
  ) => Promise<void>;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({
  isOpen,
  profile,
  defaultMode = 'external',
  onClose,
  onLaunch,
}) => {
  const [workspace, setWorkspace] = useState('');
  const [mode, setMode] = useState<'external' | 'embedded'>(defaultMode);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setWorkspace(profile.default_workspace || '');
      setMode(defaultMode);
      setSaveAsDefault(false);
      setError(null);
    }
  }, [profile, defaultMode, isOpen]);

  if (!isOpen || !profile) return null;

  const isClaude = profile.provider === 'claude_code';

  const handlePickDirectory = async () => {
    try {
      const selected = await api.pickDirectory();
      if (selected) {
        setWorkspace(selected);
      }
    } catch (err: any) {
      console.error('Failed to pick directory:', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile) return;

    try {
      setIsLaunching(true);
      setError(null);
      await onLaunch(profile, workspace.trim(), mode === 'external', saveAsDefault);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to launch session');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLaunching) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isLaunching) onClose();
      }}
    >
      <div className="bg-[#0f1219] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#141822]/60">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: profile.color_tag || (isClaude ? '#a855f7' : '#3b82f6') }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">Launch Session</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  {profile.name}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Target Provider: <span className="text-zinc-300 font-medium">{isClaude ? 'Claude Code CLI' : 'Google Antigravity CLI'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLaunching}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Directory Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                Project Working Directory
              </label>
              <span className="text-[11px] text-zinc-500">Directory session will cd into</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                placeholder="Leave blank for home directory (~)"
                className="flex-1 bg-[#090b10] border border-zinc-800 focus:border-zinc-600 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Browse...</span>
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-zinc-500 font-medium">Quick Pick:</span>
              <button
                type="button"
                onClick={() => setWorkspace('')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  workspace === '' 
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-600' 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                Home Directory (~)
              </button>
              {profile.default_workspace && (
                <button
                  type="button"
                  onClick={() => setWorkspace(profile.default_workspace || '')}
                  className={`text-[10px] px-2 py-0.5 rounded border font-mono truncate max-w-[200px] transition-colors ${
                    workspace === profile.default_workspace
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                  title={profile.default_workspace}
                >
                  Default: {profile.default_workspace.split('/').pop() || profile.default_workspace}
                </button>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-200 block mb-2">
              Terminal Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('external')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  mode === 'external'
                    ? 'border-zinc-500 bg-zinc-800/70 text-zinc-100 shadow-sm'
                    : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-medium text-zinc-200">External Window</span>
                  </div>
                  {mode === 'external' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Native macOS Terminal or configured system emulator
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('embedded')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  mode === 'embedded'
                    ? 'border-zinc-500 bg-zinc-800/70 text-zinc-100 shadow-sm'
                    : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-medium text-zinc-200">Embedded Console</span>
                  </div>
                  {mode === 'embedded' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Integrated PTY inside the AIMux window
                </p>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-zinc-200 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-zinc-400">Save directory as default for this profile</span>
            </label>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Isolated Environment</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLaunching}
              className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLaunching}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isLaunching ? (
                <>Launching...</>
              ) : (
                <>
                  <span>Launch Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
