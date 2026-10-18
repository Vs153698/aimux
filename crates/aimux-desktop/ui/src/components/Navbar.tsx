import React from 'react';
import { Layers, Terminal, Activity, Stethoscope, Plus, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentTab: 'profiles' | 'sessions' | 'doctor';
  setTab: (tab: 'profiles' | 'sessions' | 'doctor') => void;
  onAddProfile: () => void;
  runningSessionCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  onAddProfile,
  runningSessionCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AIMux
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50 font-normal">
                  v0.1.0
                </span>
              </span>
              <p className="text-xs text-slate-400">Account Manager for Antigravity & Claude</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setTab('profiles')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'profiles'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Profiles
            </button>

            <button
              onClick={() => setTab('sessions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'sessions'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              Active Sessions
              {runningSessionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {runningSessionCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab('doctor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'doctor'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Doctor & Diagnostics
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-slate-700/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Local Isolation Active</span>
            </div>

            <button
              onClick={onAddProfile}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Profile
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
