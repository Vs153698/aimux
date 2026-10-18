import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as TerminalIcon, Eraser, Trash2, Maximize2, Minimize2, X } from 'lucide-react';
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
      fontSize: 12.5,
      lineHeight: 1.25,
      theme: {
        background: '#090b10',
        foreground: '#e4e4e7',
        cursor: '#f4f4f5',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#18181b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f4f4f5',
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
      term.writeln(`\x1b[1;37m[AIMux PTY]\x1b[0m Session \x1b[36m${activeSession.session_id.slice(0, 8)}\x1b[0m`);
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
      className={`flex flex-col bg-[#090b10] border border-zinc-800 rounded-xl overflow-hidden shadow-lg transition-all ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-[480px]'
      }`}
    >
      {/* Terminal Header & Session Tabs */}
      <div className="bg-[#10131b] border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <TerminalIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mr-1" />
          {embeddedSessions.length === 0 ? (
            <span className="text-xs text-zinc-500 font-mono">Console (Idle)</span>
          ) : (
            embeddedSessions.map((s) => {
              const isSelected = activeSession?.session_id === s.session_id;
              const isRunning = s.status === 'running';

              return (
                <div
                  key={s.session_id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <button
                    onClick={() => onSelectSession(s.session_id)}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                    <span>{s.command.split(' ')[0]}</span>
                    <span className="text-[10px] text-zinc-500">#{s.pid}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopSession(s.session_id);
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5"
                    title="Kill & Close Session"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeSession && (
            <button
              onClick={() => onStopSession(activeSession.session_id)}
              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
              title="Kill & Terminate Active Session"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

          <button
            onClick={clearTerminal}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title="Clear Console Output"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => {
                fitAddonInstance.current?.fit();
              }, 100);
            }}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-2 bg-[#090b10] relative overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
