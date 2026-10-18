import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, Square, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { SessionMetadata } from '../types';
import { isTauri } from '../services/api';

interface EmbeddedTerminalProps {
  sessions: SessionMetadata[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onStopSession: (sessionId: string) => void;
}

export const EmbeddedTerminal: React.FC<EmbeddedTerminalProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onStopSession,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeSession = sessions.find((s) => s.session_id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#60a5fa',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
        black: '#0f172a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f8fafc',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (isTauri() && activeSession) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('resize_pty', {
              sessionId: activeSession.session_id,
              cols: term.cols,
              rows: term.rows,
            }).catch(() => {});
          });
        }
      } catch (e) {
        // ignore layout resize quirks
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial greeting / banner
    if (activeSession) {
      term.writeln(`\x1b[1;34m[AIMux PTY]\x1b[0m Session \x1b[36m${activeSession.session_id.slice(0, 8)}\x1b[0m started.`);
      term.writeln(`\x1b[90mCommand: ${activeSession.command} | Directory: ${activeSession.cwd}\x1b[0m\r\n`);
    } else {
      term.writeln(`\x1b[90mNo active embedded session selected.\x1b[0m\r\n`);
    }

    // Input handling
    term.onData((data) => {
      if (isTauri() && activeSession) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('write_pty_input', {
            sessionId: activeSession.session_id,
            input: data,
          }).catch((err) => {
            console.error('Failed to write PTY input:', err);
          });
        });
      } else {
        // Browser mock mode: echo back
        if (data === '\r') {
          term.write('\r\n$ ');
        } else if (data === '\u007F') {
          // Backspace
          term.write('\b \b');
        } else {
          term.write(data);
        }
      }
    });

    // In Tauri: Fetch buffered history first, then attach live event stream
    if (isTauri() && activeSession) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<string>('read_pty_history', {
          sessionId: activeSession.session_id,
        })
          .then((hist) => {
            if (hist && hist.length > 0) {
              term.write(hist);
            }
          })
          .catch(() => {});
      });

      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>(`pty-output-${activeSession.session_id}`, (event) => {
          term.write(event.payload);
        }).then((unlisten) => {
          unlistenRef.current = unlisten;
        });
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      term.dispose();
      xtermInstance.current = null;
      fitAddonInstance.current = null;
    };
  }, [activeSession?.session_id]);

  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  const embeddedSessions = sessions.filter((s) => s.terminal_mode === 'embedded');

  return (
    <div
      className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-[520px]'
      }`}
    >
      {/* Terminal Header & Session Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <TerminalIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {embeddedSessions.length === 0 ? (
            <span className="text-xs text-slate-400 font-medium">Embedded Terminal (Idle)</span>
          ) : (
            embeddedSessions.map((s) => {
              const isSelected = (activeSession?.session_id === s.session_id);
              const isRunning = s.status === 'running';

              return (
                <button
                  key={s.session_id}
                  onClick={() => onSelectSession(s.session_id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span>{s.command.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({s.pid})</span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {activeSession && activeSession.status === 'running' && (
            <button
              onClick={() => onStopSession(activeSession.session_id)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Stop Active Session"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={clearTerminal}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => {
                fitAddonInstance.current?.fit();
              }, 100);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-3 bg-[#090d16] relative overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
