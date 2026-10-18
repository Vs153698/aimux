import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Terminal, 
  Layers, 
  Folder, 
  AlertCircle
} from 'lucide-react';
import { ProfileMetadata, SessionMetadata, ProviderType } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { ProfileCard } from './components/ProfileCard';
import { ProfileModal } from './components/ProfileModal';
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
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [showEmbeddedPanel, setShowEmbeddedPanel] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

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

  const handleLaunch = async (profile: ProfileMetadata, external: boolean) => {
    try {
      setBannerNotice(null);
      const cwd = selectedWorkspace || profile.default_workspace;
      const sess = await api.launchSession(profile.id, cwd, external);
      
      await loadData();
      setActiveSessionId(sess.session_id);

      if (!external) {
        setShowEmbeddedPanel(true);
      } else {
        setBannerNotice(`Launched ${profile.name} in external terminal window.`);
        setTimeout(() => setBannerNotice(null), 5000);
      }
    } catch (err: any) {
      setBannerNotice(`Launch failed: ${err.message || String(err)}`);
    }
  };

  const handleVerify = async (profile: ProfileMetadata) => {
    try {
      await api.verifyProfile(profile.id);
      await loadData();
      setBannerNotice(`Profile ${profile.name} identity verified successfully.`);
      setTimeout(() => setBannerNotice(null), 4000);
    } catch (err: any) {
      setBannerNotice(`Verification check: ${err.message || String(err)}`);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onAddProfile={() => setIsAddModalOpen(true)}
        runningSessionCount={runningSessions.length}
      />

      {/* Global Status Notice */}
      {bannerNotice && (
        <div className="bg-blue-950/80 border-b border-blue-800/60 px-4 py-2.5 text-xs text-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{bannerNotice}</span>
          </div>
        </div>
      )}

      {/* Workspace Quick-Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="font-medium text-slate-300">Launch Working Directory:</span>
            <input
              type="text"
              placeholder="Leave blank for profile default directory"
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 w-72 focus:outline-none focus:border-blue-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowEmbeddedPanel(!showEmbeddedPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                showEmbeddedPanel
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showEmbeddedPanel ? 'Hide Terminal Panel' : 'Show Terminal Panel'}</span>
            </button>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Isolated Local Storage</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentTab === 'profiles' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter profiles by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedProvider('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedProvider === 'all'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  All Providers
                </button>
                <button
                  onClick={() => setSelectedProvider('claude_code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedProvider === 'claude_code'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  Claude Code
                </button>
                <button
                  onClick={() => setSelectedProvider('google_antigravity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedProvider === 'google_antigravity'
                      ? 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  Google Antigravity
                </button>
              </div>
            </div>

            {/* Embedded Terminal Section */}
            {showEmbeddedPanel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Interactive PTY Shell
                  </h3>
                  <button
                    onClick={() => setShowEmbeddedPanel(false)}
                    className="text-xs text-slate-500 hover:text-slate-300"
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
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Loading isolated profiles...</p>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No Profiles Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Get started by adding an isolated Google Antigravity or Anthropic Claude account profile.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add New Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProfiles.map((p) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    onLaunch={handleLaunch}
                    onVerify={handleVerify}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'sessions' && (
          <div className="space-y-6">
            <SessionList sessions={sessions} onStopSession={handleStopSession} />

            {sessions.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Attached PTY Console
                </h3>
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
        }}
      />
    </div>
  );
};
