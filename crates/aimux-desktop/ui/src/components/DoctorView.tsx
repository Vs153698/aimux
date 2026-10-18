import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  Search,
  AlertCircle
} from 'lucide-react';
import { DiagnosticItem } from '../types';
import { api } from '../services/api';

export const DoctorView: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ok' | 'warning' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredItems = diagnostics.filter((item) => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-[#10131b] border border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-zinc-300" />
              <h2 className="text-sm font-semibold text-zinc-100">System Diagnostics & Isolation Doctor</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Probes local binaries, PATH discovery, keychain ring boundaries, and process sandbox isolation.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Minimalist Summary Pill */}
            <div className="flex items-center gap-2 text-xs font-mono bg-[#090b10] border border-zinc-800 px-3 py-1.5 rounded-lg">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{okCount} passed</span>
              </span>
              {warningCount > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{warningCount} advisories</span>
                  </span>
                </>
              )}
              {errorCount > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{errorCount} errors</span>
                  </span>
                </>
              )}
            </div>

            <button
              onClick={loadDiagnostics}
              disabled={loading}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Rescan</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({diagnostics.length})
            </button>
            <button
              onClick={() => setFilter('ok')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === 'ok'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Passed ({okCount})
            </button>
            {warningCount > 0 && (
              <button
                onClick={() => setFilter('warning')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'warning'
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Advisories ({warningCount})
              </button>
            )}
            {errorCount > 0 && (
              <button
                onClick={() => setFilter('error')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filter === 'error'
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Errors ({errorCount})
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search diagnostics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#090b10] border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Diagnostics Item List */}
      <div className="bg-[#10131b] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-zinc-800/80">
          {filteredItems.map((item, idx) => {
            const isOk = item.status === 'ok';
            const isWarn = item.status === 'warning';

            return (
              <div key={idx} className="p-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {isOk && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {!isOk && !isWarn && <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-semibold text-zinc-100">{item.title}</h4>
                    </div>

                    <p className="text-[11px] text-zinc-300 font-mono bg-[#090b10] p-2.5 rounded-lg border border-zinc-800/80 mt-1 break-all">
                      {item.details}
                    </p>

                    {item.remediation && (
                      <div className="mt-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-amber-200">Remediation:</strong>{' '}
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

      {/* Verified Provider Capabilities Matrix */}
      <div className="bg-[#10131b] border border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-zinc-300" />
          <h3 className="font-semibold text-xs text-zinc-100">Verified Isolation Capabilities Matrix</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          AIMux strictly documents native provider isolation characteristics without emulating unsupported features.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 bg-[#090b10]/50 font-sans">
                <th className="py-2 px-3 font-medium">Capability</th>
                <th className="py-2 px-3 font-medium">Claude Code CLI</th>
                <th className="py-2 px-3 font-medium">Antigravity CLI (agy)</th>
                <th className="py-2 px-3 font-medium">Antigravity Desktop App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-zinc-200">Multi-Account Isolation</td>
                <td className="py-2 px-3 text-emerald-400">✓ Isolated config dir</td>
                <td className="py-2 px-3 text-emerald-400">✓ Jailed $HOME Keychain list</td>
                <td className="py-2 px-3 text-rose-400">✗ Single instance lock</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-zinc-200">Concurrent Sessions</td>
                <td className="py-2 px-3 text-emerald-400">✓ Fully Supported</td>
                <td className="py-2 px-3 text-emerald-400">✓ Fully Supported</td>
                <td className="py-2 px-3 text-amber-400">⚠ Profile switch required</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-zinc-200">Per-Profile History</td>
                <td className="py-2 px-3 text-emerald-400">✓ Isolated directory</td>
                <td className="py-2 px-3 text-emerald-400">✓ Isolated directory</td>
                <td className="py-2 px-3 text-amber-400">⚠ Shared app store</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-zinc-200">Identity Verification</td>
                <td className="py-2 px-3 text-emerald-400">✓ `claude doctor` parse</td>
                <td className="py-2 px-3 text-emerald-400">✓ `agy auth status` parse</td>
                <td className="py-2 px-3 text-emerald-400">✓ Shared CLI context</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-zinc-200">Token Security</td>
                <td className="py-2 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
                <td className="py-2 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
                <td className="py-2 px-3 text-emerald-400">✓ Zero tokens in AIMux DB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
