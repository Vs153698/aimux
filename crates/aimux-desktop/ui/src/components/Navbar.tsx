import React, { useState } from 'react';
import { 
  Terminal, 
  Activity, 
  Stethoscope, 
  Plus, 
  ShieldCheck,
  Menu,
  X,
  Layers,
  Zap
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'profiles' | 'sessions' | 'doctor';
  setTab: (tab: 'profiles' | 'sessions' | 'doctor') => void;
  onAddProfile: () => void;
  runningSessionCount: number;
  autoHandoffEnabled?: boolean;
  onToggleAutoHandoff?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  onAddProfile,
  runningSessionCount,
  autoHandoffEnabled = true,
  onToggleAutoHandoff,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-zinc-800/80 bg-[#0c0e14]/90 backdrop-blur sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
              <Layers className="w-4 h-4 text-zinc-200" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                AIMux
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                v0.1.0
              </span>
            </div>
          </div>

          {/* Center Tabs (Desktop) */}
          <nav className="hidden md:flex items-center bg-[#13161f] border border-zinc-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTab('profiles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentTab === 'profiles'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Profiles</span>
            </button>

            <button
              onClick={() => setTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentTab === 'sessions'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Sessions</span>
              {runningSessionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {runningSessionCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab('doctor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentTab === 'doctor'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {onToggleAutoHandoff && (
              <button
                type="button"
                onClick={onToggleAutoHandoff}
                className={`hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                  autoHandoffEnabled
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="When active, automatically spins up alternate AI CLI and transfers context upon reaching quota limits with zero manual clicks."
              >
                <Zap className={`w-3.5 h-3.5 ${autoHandoffEnabled ? 'text-amber-400 fill-amber-400/20' : 'text-zinc-500'}`} />
                <span>Auto-Failover: {autoHandoffEnabled ? 'Active' : 'Off'}</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/60 px-2 py-1 rounded-md border border-zinc-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sandbox Isolation</span>
            </div>

            <button
              onClick={onAddProfile}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Profile</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-800/80 space-y-1">
            <button
              onClick={() => {
                setTab('profiles');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                currentTab === 'profiles'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Profiles</span>
            </button>

            <button
              onClick={() => {
                setTab('sessions');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left ${
                currentTab === 'sessions'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Sessions</span>
              </div>
              {runningSessionCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                  {runningSessionCount} running
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setTab('doctor');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                currentTab === 'doctor'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor & Diagnostics</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
