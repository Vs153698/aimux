import React from 'react';
import { Activity, Square, Terminal, ExternalLink, Clock, Folder } from 'lucide-react';
import { SessionMetadata } from '../types';

interface SessionListProps {
  sessions: SessionMetadata[];
  onStopSession: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onStopSession,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No Active Sessions</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Launch a terminal session from the Profiles tab to start an isolated AI agent workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-white text-sm">Active & Recent Sessions</h2>
        </div>
        <span className="text-xs text-slate-500">{sessions.length} total sessions</span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {sessions.map((s) => {
          const isRunning = s.status === 'running';
          const isClaude = s.provider === 'claude_code';

          return (
            <div key={s.session_id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-medium text-sm text-white">{s.command}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isClaude
                        ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                        : 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                    }`}
                  >
                    {isClaude ? 'Claude Code' : 'Antigravity'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">PID: {s.pid}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-md">{s.cwd}</span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(s.started_at).toLocaleTimeString()}</span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-500">
                    {s.terminal_mode === 'external' ? (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>External Window</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Embedded PTY</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div>
                {isRunning ? (
                  <button
                    onClick={() => onStopSession(s.session_id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Stop Session
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-md">
                    Exited ({s.exit_code ?? 0})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
