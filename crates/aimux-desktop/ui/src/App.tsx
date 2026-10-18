import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Terminal, 
  Layers, 
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { ProfileMetadata, SessionMetadata, ProviderType } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { ProfileCard } from './components/ProfileCard';
import { ProfileModal } from './components/ProfileModal';
import { LaunchModal } from './components/LaunchModal';
import { SessionList } from './components/SessionList';
import { DoctorView } from './components/DoctorView';
import { EmbeddedTerminal } from './components/EmbeddedTerminal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'profiles' | 'sessions' | 'doctor'>('profiles');
  const [profiles, setProfiles] = useState<ProfileMetadata[]>([]);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'all' | ProviderType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Launch Modal State
  const [launchModalProfile, setLaunchModalProfile] = useState<ProfileMetadata | null>(null);
  const [launchModalMode, setLaunchModalMode] = useState<'external' | 'embedded'>('external');
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [verifyingProfileIds, setVerifyingProfileIds] = useState<Record<string, boolean>>({});

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [showEmbeddedPanel, setShowEmbeddedPanel] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [profs, sess] = await Promise.all([
        api.listProfiles(),
        api.listSessions(),
      ]);
      setProfiles(profs);
      setSessions(sess);
      if (sess.length > 0 && !activeSessionId) {
        setActiveSessionId(sess[0].session_id);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [activeSessionId]);

  const handleOpenLaunchModal = (profile: ProfileMetadata, defaultMode: 'external' | 'embedded') => {
    setLaunchModalProfile(profile);
    setLaunchModalMode(defaultMode);
    setIsLaunchModalOpen(true);
  };

  const handleExecuteLaunch = async (
    profile: ProfileMetadata,
    workspace: string,
    external: boolean,
    saveAsDefault: boolean
  ) => {
    try {
      setBannerNotice(null);
      
      if (saveAsDefault) {
        try {
          await api.updateProfileWorkspace(profile.id, workspace || undefined);
        } catch (e) {
          console.error('Failed to update default workspace', e);
        }
      }

      const cwd = workspace.trim() || profile.default_workspace;
      const sess = await api.launchSession(profile.id, cwd, external);
      
      await loadData();
      setActiveSessionId(sess.session_id);

      if (!external) {
        setShowEmbeddedPanel(true);
        setBannerNotice({
          type: 'success',
          message: `Attached embedded PTY for ${profile.name} (PID: ${sess.pid})`,
        });
      } else {
        setBannerNotice({
          type: 'info',
          message: `Launched ${profile.name} in external terminal window (PID: ${sess.pid}).`,
        });
      }
      setTimeout(() => setBannerNotice(null), 5000);
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: `Launch failed: ${err.message || String(err)}`,
      });
    }
  };

  const handleVerify = async (profile: ProfileMetadata) => {
    try {
      setVerifyingProfileIds((prev) => ({ ...prev, [profile.id]: true }));
      await api.verifyProfile(profile.id);
      await loadData();
      setBannerNotice({
        type: 'success',
        message: `Profile "${profile.name}" verified: identity confirmed.`,
      });
      setTimeout(() => setBannerNotice(null), 4000);
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: `Verification check: ${err.message || String(err)}`,
      });
      setTimeout(() => setBannerNotice(null), 5000);
    } finally {
      setVerifyingProfileIds((prev) => ({ ...prev, [profile.id]: false }));
    }
  };

  const handlePickDefaultWorkspace = async (profile: ProfileMetadata) => {
    try {
      const selected = await api.pickDirectory();
      if (selected !== null && selected !== undefined) {
        await api.updateProfileWorkspace(profile.id, selected.trim() || undefined);
        await loadData();
        setBannerNotice({
          type: 'success',
          message: `Updated default directory for ${profile.name}`,
        });
        setTimeout(() => setBannerNotice(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to update workspace:', err);
    }
  };

  const handleDelete = async (profile: ProfileMetadata) => {
    if (confirm(`Are you sure you want to delete profile "${profile.name}"?`)) {
      try {
        await api.removeProfile(profile.id, false);
        await loadData();
      } catch (err: any) {
        alert(`Delete failed: ${err.message || String(err)}`);
      }
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await api.stopSession(sessionId);
      await loadData();
    } catch (err: any) {
      console.error('Stop session failed:', err);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesProvider = selectedProvider === 'all' || p.provider === selectedProvider;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.verified_identity?.email && p.verified_identity.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesProvider && matchesSearch;
  });

  const runningSessions = sessions.filter((s) => s.status === 'running');

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onAddProfile={() => setIsAddModalOpen(true)}
        runningSessionCount={runningSessions.length}
      />

      {/* Global Status Banner */}
      {bannerNotice && (
        <div 
          className={`border-b px-4 py-2 text-xs flex items-center justify-between transition-colors ${
            bannerNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
              : bannerNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {bannerNotice.type === 'error' && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            {bannerNotice.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
            {bannerNotice.type === 'info' && <Terminal className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />}
            <span className="truncate">{bannerNotice.message}</span>
            <button
              onClick={() => setBannerNotice(null)}
              className="ml-auto text-zinc-400 hover:text-zinc-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {currentTab === 'profiles' && (
          <div className="space-y-5">
            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter profiles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#10131b] border border-zinc-800 focus:border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div className="flex items-center bg-[#10131b] border border-zinc-800 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setSelectedProvider('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedProvider === 'all'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({profiles.length})
                  </button>
                  <button
                    onClick={() => setSelectedProvider('claude_code')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedProvider === 'claude_code'
                        ? 'bg-zinc-800 text-purple-300 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Claude
                  </button>
                  <button
                    onClick={() => setSelectedProvider('google_antigravity')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedProvider === 'google_antigravity'
                        ? 'bg-zinc-800 text-blue-300 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Antigravity
                  </button>
                </div>

                <button
                  onClick={() => setShowEmbeddedPanel(!showEmbeddedPanel)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    showEmbeddedPanel
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-[#10131b] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                  title="Toggle embedded console panel"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {showEmbeddedPanel ? 'Hide Console' : 'Show Console'}
                  </span>
                </button>
              </div>
            </div>

            {/* Embedded Terminal Section (Collapsible) */}
            {showEmbeddedPanel && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                    Interactive Console View
                  </span>
                  <button
                    onClick={() => setShowEmbeddedPanel(false)}
                    className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                  >
                    Close panel
                  </button>
                </div>
                <EmbeddedTerminal
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelectSession={setActiveSessionId}
                  onStopSession={handleStopSession}
                />
              </div>
            )}

            {/* Profile Grid */}
            {loading && profiles.length === 0 ? (
              <div className="text-center py-16 bg-[#10131b] border border-zinc-800 rounded-xl">
                <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Loading isolated profiles...</p>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-14 bg-[#10131b] border border-zinc-800 rounded-xl">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-300">No Profiles Configured</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  Add an isolated Google Antigravity or Anthropic Claude account profile to get started.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Profile</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((p) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    isVerifying={Boolean(verifyingProfileIds[p.id])}
                    onLaunchPrompt={handleOpenLaunchModal}
                    onVerify={handleVerify}
                    onDelete={handleDelete}
                    onPickDirectory={handlePickDefaultWorkspace}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'sessions' && (
          <div className="space-y-5">
            <SessionList sessions={sessions} onStopSession={handleStopSession} />

            {sessions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                  Live Console View
                </span>
                <EmbeddedTerminal
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelectSession={setActiveSessionId}
                  onStopSession={handleStopSession}
                />
              </div>
            )}
          </div>
        )}

        {currentTab === 'doctor' && <DoctorView />}
      </main>

      {/* Add Profile Modal */}
      <ProfileModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (data) => {
          await api.createProfile(data);
          await loadData();
          setIsAddModalOpen(false);
          setBannerNotice({
            type: 'success',
            message: `Created profile "${data.name}"`,
          });
          setTimeout(() => setBannerNotice(null), 3000);
        }}
      />

      {/* Launch Directory Prompt Modal */}
      <LaunchModal
        isOpen={isLaunchModalOpen}
        profile={launchModalProfile}
        defaultMode={launchModalMode}
        onClose={() => setIsLaunchModalOpen(false)}
        onLaunch={handleExecuteLaunch}
      />
    </div>
  );
};
