import React, { useState } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { ProviderType } from '../types';

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
  '#8b5cf6', // purple
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a friendly profile name');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">Add Account Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Provider Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('claude_code')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'claude_code'
                    ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/50'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="font-medium text-sm text-white">Claude Code</div>
                <div className="text-xs text-slate-400 mt-0.5">Anthropic CLI</div>
                <div className="text-[10px] text-purple-400 mt-2 font-medium">Native SHA-256 Isolation</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('google_antigravity')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'google_antigravity'
                    ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/50'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="font-medium text-sm text-white">Antigravity</div>
                <div className="text-xs text-slate-400 mt-0.5">Google `agy` CLI</div>
                <div className="text-[10px] text-blue-400 mt-2 font-medium">Profile-Jailed Keychain</div>
              </button>
            </div>
          </div>

          {/* Profile Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Friendly Profile Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Personal, Claude Work, Client Corp"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          {/* Workspace Path */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Project / Workspace Directory <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              placeholder="/Users/username/Projects/my-app"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorTag(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    colorTag === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110 opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-blue-600/20 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
