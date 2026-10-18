import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Folder, 
  ChevronDown, 
  ChevronUp,
  Cpu
} from 'lucide-react';
import { ProfileMetadata, SessionMetadata, HandoffPreview } from '../types';
import { api } from '../services/api';

interface HandoffModalProps {
  isOpen: boolean;
  sessionId: string | null;
  profiles: ProfileMetadata[];
  alertReason?: string;
  onClose: () => void;
  onSuccess: (newSession: SessionMetadata) => void;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({
  isOpen,
  sessionId,
  profiles,
  alertReason,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<HandoffPreview | null>(null);
  const [targetProfileId, setTargetProfileId] = useState<string>('');
  const [contextMarkdown, setContextMarkdown] = useState<string>('');
  const [showRawContext, setShowRawContext] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadPreview(sessionId);
    } else {
      setPreview(null);
      setError(null);
      setContextMarkdown('');
      setTargetProfileId('');
    }
  }, [isOpen, sessionId]);

  const loadPreview = async (sid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.prepareHandoffContext(sid);
      setPreview(data);
      setContextMarkdown(data.context_markdown);

      // Auto-select best target: prioritize opposite provider first
      const oppositeProvider = data.source_provider === 'claude_code' 
        ? 'google_antigravity' 
        : 'claude_code';
      
      const candidate = data.available_target_profiles.find((p) => p.provider === oppositeProvider) 
        || data.available_target_profiles[0]
        || profiles.find((p) => p.id !== data.source_profile_id);

      if (candidate) {
        setTargetProfileId(candidate.id);
      }
    } catch (err: any) {
      console.error('Failed to prepare handoff context:', err);
      setError(err?.message || 'Failed to analyze session and prepare handoff context');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!sessionId || !targetProfileId) return;

    try {
      setIsTransferring(true);
      setError(null);
      const newSession = await api.executeHandoff(
        sessionId,
        targetProfileId,
        contextMarkdown
      );
      onSuccess(newSession);
      onClose();
    } catch (err: any) {
      console.error('Handoff execution failed:', err);
      setError(err?.message || 'Failed to complete provider handoff');
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  const targetProfile = profiles.find((p) => p.id === targetProfileId);
  const isTargetClaude = targetProfile?.provider === 'claude_code';
  const isSourceClaude = preview?.source_provider === 'claude_code';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTransferring) onClose();
      }}
    >
      <div className="bg-[#0f1219] border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#141822]/70">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Cross-Provider Handoff Bridge
              </h2>
              <p className="text-[11px] text-zinc-400">
                Seamlessly transfer session context & git status when quota is nearly exhausted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isTransferring}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {alertReason && (
            <div className="flex items-start gap-2.5 p-3 text-xs text-amber-300 bg-amber-950/20 border border-amber-800/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-200">Rate Limit / Quota Threshold Alert:</span>
                <span className="text-[11px] opacity-90">{alertReason}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Analyzing git status and compiling handoff context...</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Source -> Target Provider Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#090b10] border border-zinc-800/80 rounded-lg">
                {/* Source Info */}
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                    Source Session
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                        isSourceClaude
                          ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                          : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                      }`}
                    >
                      {isSourceClaude ? 'Claude Code' : 'Antigravity'}
                    </span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {preview.source_profile_name}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">
                    ID: {preview.source_session_id.slice(0, 8)}
                  </div>
                </div>

                {/* Target Profile Selector */}
                <div className="space-y-1.5 sm:border-l sm:border-zinc-800/80 sm:pl-3">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                    Target Failover Profile
                  </span>
                  <select
                    value={targetProfileId}
                    onChange={(e) => setTargetProfileId(e.target.value)}
                    className="w-full bg-[#10131b] border border-zinc-700/80 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {preview.available_target_profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.provider === 'claude_code' ? 'Claude' : 'Antigravity'})
                      </option>
                    ))}
                  </select>
                  {targetProfile && (
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-zinc-500" />
                      <span>
                        Switching to {isTargetClaude ? 'Claude Code' : 'Google Antigravity'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Working Directory */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0c10] border border-zinc-800/60 rounded-md text-xs font-mono text-zinc-400 truncate">
                <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{preview.cwd}</span>
              </div>

              {/* Context Summary & Markdown Accordion */}
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#0a0c10]">
                <button
                  type="button"
                  onClick={() => setShowRawContext(!showRawContext)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-300">
                      Generated Handoff Bridge Context (`.aimux-handoff.md`)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <span>{showRawContext ? 'Hide' : 'Review / Edit'}</span>
                    {showRawContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showRawContext ? (
                  <div className="p-3 border-t border-zinc-800 bg-[#090b10]">
                    <textarea
                      value={contextMarkdown}
                      onChange={(e) => setContextMarkdown(e.target.value)}
                      rows={10}
                      className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-zinc-700 rounded p-2.5 text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none"
                    />
                    <div className="mt-1.5 text-[10px] text-zinc-500">
                      This markdown will be saved to <code className="text-zinc-400">.aimux-handoff.md</code> in the repository root for the new AI to resume your exact task state.
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 py-2 text-[11px] text-zinc-400 border-t border-zinc-800/60 bg-[#0c0e14]/40 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">
                      Includes Git branch, staged/unstaged file diffs, and latest task goal.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-[#141822]/60 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Terminates exhausted session & launches target provider cleanly.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isTransferring}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isTransferring || !targetProfileId || loading}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isTransferring ? 'Transferring...' : 'Transfer & Resume'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
