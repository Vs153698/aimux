import React from 'react';
import { Activity, Trash2, Folder } from 'lucide-react';
import { SessionMetadata } from '../types';

interface SessionListProps {
  sessions: SessionMetadata[];
  onStopSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearExited?: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onStopSession,
  onDeleteSession,
  onClearExited,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-14 bg-[#10131b] border border-zinc-800 rounded-xl">
        <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-zinc-300">No Active Sessions</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
          Launch a terminal or PTY session from the Profiles tab to start an isolated session.
        </p>
      </div>
    );
  }

  const runningCount = sessions.filter((s) => s.status === 'running').length;
  const exitedCount = sessions.length - runningCount;

  return (
    <div className="bg-[#10131b] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header / Title */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-[#141822]/40">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-xs text-zinc-100">Process Monitor</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {runningCount} active
          </span>
        </div>

        <div className="flex items-center gap-3">
          {exitedCount > 0 && onClearExited && (
            <button
              onClick={onClearExited}
              className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090b10] hover:bg-zinc-800/60 border border-zinc-800 transition-colors"
              title="Purge all exited session history"
            >
              <Trash2 className="w-3 h-3 text-zinc-500" />
              <span>Clear Exited ({exitedCount})</span>
            </button>
          )}
          <span className="text-[11px] text-zinc-500 font-mono">{sessions.length} total</span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 bg-[#0c0e14]/50">
              <th className="py-2.5 px-4 font-medium">Status / PID</th>
              <th className="py-2.5 px-4 font-medium">Command</th>
              <th className="py-2.5 px-4 font-medium">Provider</th>
              <th className="py-2.5 px-4 font-medium">Working Directory</th>
              <th className="py-2.5 px-4 font-medium">Started</th>
              <th className="py-2.5 px-4 font-medium">Mode</th>
              <th className="py-2.5 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono text-[11px]">
            {sessions.map((s) => {
              const isRunning = s.status === 'running';
              const isClaude = s.provider === 'claude_code';

              return (
                <tr key={s.session_id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                        }`}
                      />
                      <span className="text-zinc-200 font-semibold">{s.pid}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-medium text-zinc-100">
                    {s.command}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        isClaude
                          ? 'bg-purple-950/30 text-purple-300 border-purple-800/40'
                          : 'bg-blue-950/30 text-blue-300 border-blue-800/40'
                      }`}
                    >
                      {isClaude ? 'Claude' : 'Antigravity'}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-[220px] truncate" title={s.cwd}>
                    {s.cwd}
                  </td>

                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(s.started_at).toLocaleTimeString()}
                  </td>

                  <td className="py-3 px-4 text-zinc-400">
                    {s.terminal_mode === 'external' ? 'External' : 'PTY'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {isRunning ? (
                      <button
                        onClick={() => onStopSession(s.session_id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 px-2.5 py-1 rounded transition-colors"
                        title="Force kill running session process"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Kill</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-zinc-500 font-sans text-[10px]">
                          Exited ({s.exit_code ?? 0})
                        </span>
                        {onDeleteSession && (
                          <button
                            onClick={() => onDeleteSession(s.session_id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-zinc-800/60 transition-colors"
                            title="Delete session record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden divide-y divide-zinc-800/60">
        {sessions.map((s) => {
          const isRunning = s.status === 'running';
          const isClaude = s.provider === 'claude_code';

          return (
            <div key={s.session_id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                    }`}
                  />
                  <span className="font-mono text-xs font-semibold text-zinc-100">
                    PID {s.pid}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] border font-mono ${
                      isClaude
                        ? 'bg-purple-950/30 text-purple-300 border-purple-800/40'
                        : 'bg-blue-950/30 text-blue-300 border-blue-800/40'
                    }`}
                  >
                    {isClaude ? 'Claude' : 'Antigravity'}
                  </span>
                </div>

                {isRunning ? (
                  <button
                    onClick={() => onStopSession(s.session_id)}
                    className="flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-800/40 px-2 py-0.5 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Kill</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[10px]">Exited</span>
                    {onDeleteSession && (
                      <button
                        onClick={() => onDeleteSession(s.session_id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded"
                        title="Delete session record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs font-mono text-zinc-300">{s.command}</div>

              <div className="text-[11px] font-mono text-zinc-400 truncate flex items-center gap-1">
                <Folder className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{s.cwd}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
