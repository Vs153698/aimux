import React, { useState } from 'react';
import { X, Layers, AlertCircle, FolderOpen } from 'lucide-react';
import { ProviderType } from '../types';
import { api } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    provider: ProviderType;
    default_workspace?: string;
    color_tag?: string;
  }) => Promise<void>;
}

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ProviderType>('claude_code');
  const [workspace, setWorkspace] = useState('');
  const [colorTag, setColorTag] = useState(COLOR_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePickDirectory = async () => {
    try {
      const selected = await api.pickDirectory();
      if (selected) {
        setWorkspace(selected);
      }
    } catch (e) {
      console.error('Directory browse failed:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a profile name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        provider,
        default_workspace: workspace.trim() || undefined,
        color_tag: colorTag,
      });
      setName('');
      setWorkspace('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSubmitting) onClose();
      }}
    >
      <div className="bg-[#0f1219] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-[#141822]/60">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h2 className="text-sm font-semibold text-zinc-100">Add Account Profile</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Provider Platform
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setProvider('claude_code')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  provider === 'claude_code'
                    ? 'border-purple-500/80 bg-purple-950/20 ring-1 ring-purple-500/30'
                    : 'border-zinc-800 bg-[#0a0c10] hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-100">Claude Code</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Anthropic CLI</div>
                <div className="text-[10px] text-purple-400 mt-1 font-mono">Isolated Config Dir</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('google_antigravity')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  provider === 'google_antigravity'
                    ? 'border-blue-500/80 bg-blue-950/20 ring-1 ring-blue-500/30'
                    : 'border-zinc-800 bg-[#0a0c10] hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-xs text-zinc-100">Antigravity</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Google `agy` CLI</div>
                <div className="text-[10px] text-blue-400 mt-1 font-mono">Isolated Keychain List</div>
              </button>
            </div>
          </div>

          {/* Profile Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Profile Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal, Work, Client A"
              className="w-full bg-[#090b10] border border-zinc-800 focus:border-zinc-600 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
              required
              autoFocus
            />
          </div>

          {/* Default Workspace */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Default Project Directory <span className="text-zinc-500">(Optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                placeholder="/path/to/project (leave blank for home)"
                className="flex-1 bg-[#090b10] border border-zinc-800 focus:border-zinc-600 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorTag(c)}
                  className={`w-5 h-5 rounded-full transition-all ${
                    colorTag === c ? 'scale-125 ring-2 ring-zinc-300 ring-offset-2 ring-offset-[#0f1219]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
