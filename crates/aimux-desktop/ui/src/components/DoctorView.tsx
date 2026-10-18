import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  Info
} from 'lucide-react';
import { DiagnosticItem } from '../types';
import { api } from '../services/api';

export const DoctorView: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await api.getDiagnostics();
      setDiagnostics(results);
    } catch (e) {
      console.error('Failed to load diagnostics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const okCount = diagnostics.filter((d) => d.status === 'ok').length;
  const warningCount = diagnostics.filter((d) => d.status === 'warning').length;
  const errorCount = diagnostics.filter((d) => d.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">System Diagnostics & Isolation Doctor</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
              AIMux performs local non-destructive probes to verify CLI availability, keyring isolation capabilities,
              and cross-platform process isolation boundaries.
            </p>
          </div>

          <button
            onClick={loadDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </button>
        </div>

        {/* Status Scoreboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{okCount}</span>
              <p className="text-xs text-slate-400 font-medium">Passed Checks</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{warningCount}</span>
              <p className="text-xs text-slate-400 font-medium">Advisories & Limits</p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">{errorCount}</span>
              <p className="text-xs text-slate-400 font-medium">Blocking Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Diagnostic Scan Results</h3>
          <span className="text-xs text-slate-400">{diagnostics.length} probes evaluated</span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {diagnostics.map((item, idx) => {
            const isOk = item.status === 'ok';
            const isWarn = item.status === 'warning';

            return (
              <div key={idx} className="p-5 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {isOk && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {isWarn && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {!isOk && !isWarn && <XCircle className="w-5 h-5 text-rose-400" />}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                        {item.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    </div>

                    <p className="text-xs text-slate-300 font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 mt-1.5">
                      {item.details}
                    </p>

                    {item.remediation && (
                      <div className="mt-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-amber-200">Remediation Guide:</strong>{' '}
                          {item.remediation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider Capabilities Truth Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white text-base">Verified Provider Capabilities</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          AIMux reports exact runtime capabilities without pretending unsupported features are isolated.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Capability</th>
                <th className="py-2.5 px-3 font-semibold">Anthropic Claude Code</th>
                <th className="py-2.5 px-3 font-semibold">Google Antigravity (`agy` CLI)</th>
                <th className="py-2.5 px-3 font-semibold">Google Antigravity Desktop App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Independent Multi-Account Auth</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Native via CLAUDE_CONFIG_DIR</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Jailed $HOME Keychain list</td>
                <td className="py-2.5 px-3 text-rose-400">✗ Electron lock per OS user</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Concurrent Live Sessions</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Fully Supported</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Fully Supported</td>
                <td className="py-2.5 px-3 text-amber-400">⚠ Single window (swap or separate OS user)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Per-Profile History & Config</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Isolated directory</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Isolated directory</td>
                <td className="py-2.5 px-3 text-amber-400">⚠ Profile swapping required</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Identity Auto-Verification</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ `claude doctor` JSON/text parsing</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ `agy auth status` text parsing</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Shared CLI context</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Zero Token Leakage Guarantee</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
                <td className="py-2.5 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
