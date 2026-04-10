/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Share2, Settings, History, Info, HelpCircle, Users, Trophy, ArrowLeft } from 'lucide-react';
import { CreatePlayer } from './components/CreatePlayer';
import { CreateTeam } from './components/CreateTeam';
import { StartMatch } from './components/StartMatch';
import { Scorer } from './components/Scorer';
import { CreateTournament } from './components/CreateTournament';
import { Login } from './components/Login';
import { Search as SearchPage } from './components/Search';
import { Leaderboard } from './components/Leaderboard';
import { PlayerDetails } from './components/PlayerDetails';
import { NotificationList } from './components/NotificationList';
import { TeamDetails } from './components/TeamDetails';
import { TournamentDetails } from './components/TournamentDetails';
import { useAuth } from './contexts/AuthContext';
import { useLiveMatches } from './hooks/useLiveMatches';
import { useUserCricketData } from './hooks/useUserCricketData';
import { useTournaments } from './hooks/useTournaments';
import { useNotifications } from './hooks/useNotifications';
import { Navbar as NavbarUI } from './components/ui/Navbar';
import { Header as HeaderUI } from './components/ui/Header';
import { MenuLink as MenuLinkUI } from './components/ui/MenuLink';
import { WelcomeModal as WelcomeModalUI } from './components/ui/WelcomeModal';
import { MatchCard as MatchCardUI } from './components/ui/MatchCard';
import { Home as HomePage } from './pages/Home';
import { Teams as TeamsPage } from './pages/Teams';
import { MyCricket as MyCricketPage } from './pages/MyCricket';
import { Tournaments as TournamentsPage } from './pages/Tournaments';
import { Profile as ProfilePage } from './pages/Profile';
import { MatchDetails as MatchDetailsPage } from './pages/MatchDetails';

type ViewState = 'main' | 'create-team' | 'create-player' | 'start-match' | 'start-tournament-match' | 'scorer' | 'create-tournament' | 'about' | 'help' | 'settings' | 'history' | 'matchDetails' | 'explore' | 'search' | 'leaderboard' | 'playerDetails' | 'teamDetails' | 'tournamentDetails';

const THEME_STORAGE_KEY = 'scorewala-theme';
const WELCOME_SESSION_KEY_PREFIX = 'scorewala-welcome-shown';

function getWelcomeSessionKey(uid: string) {
  return `${WELCOME_SESSION_KEY_PREFIX}:${uid}`;
}
// --- Main App ---


const MainContent = () => {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState<ViewState>('main');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark' ? 'dark' : 'light';
  });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setShowWelcome(false);
      return;
    }

    const welcomeSessionKey = getWelcomeSessionKey(user.uid);
    const hasShownWelcome = sessionStorage.getItem(welcomeSessionKey) === 'true';

    if (!hasShownWelcome) {
      sessionStorage.setItem(welcomeSessionKey, 'true');
      setShowWelcome(true);
    }
  }, [user?.uid]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  const { matches, recentMatches, userTeamIds, teams: userTeams } = useUserCricketData(user);
  const { globalMatches, teams: liveTeams } = useLiveMatches();
  const { tournaments } = useTournaments(6, user?.uid);
  const { notifications } = useNotifications(user?.uid);
  const teams = { ...liveTeams, ...userTeams };
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-500 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-black border-t-transparent rounded-full"
        />
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-black">ScoreArena</h1>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setView('main')} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderPage = () => {
    const handleMatchClick = (id: string) => {
      const allMatches = [...matches, ...recentMatches, ...globalMatches];
      const match = allMatches.find((item) => item.id === id);
      setActiveMatchId(id);
      if (match?.status === 'live') {
        setView('scorer');
        return;
      }
      setView('matchDetails');
    };

    if (view === 'search') return (
      <SearchPage
        onBack={() => setView('main')}
        onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }}
        onTeamClick={(id) => { setActiveMatchId(id); setView('teamDetails'); }}
        onTournamentClick={(id) => { setActiveTournamentId(id); setView('tournamentDetails'); }}
      />
    );
    if (view === 'playerDetails' && activeMatchId) return (
      <PlayerDetails
        playerId={activeMatchId}
        onBack={() => setView('main')}
        onMatchClick={(id) => { setActiveMatchId(id); setView('matchDetails'); }}
      />
    );
    if (view === 'create-team') return <CreateTeam onBack={() => setView('main')} />;
    if (view === 'create-player') return <CreatePlayer onBack={() => setView('main')} />;
    if (view === 'start-match') return <StartMatch mode="normal" onBack={() => setView('main')} onStart={(id) => { setActiveMatchId(id); setView('scorer'); }} />;
    if (view === 'start-tournament-match') return (
      <StartMatch
        mode="tournament"
        presetTournamentId={activeTournamentId || undefined}
        onBack={() => {
          setView('main');
          setActiveTab('tournaments');
        }}
        onStart={(id) => { setActiveMatchId(id); setView('scorer'); }}
      />
    );
    if (view === 'create-tournament') return <CreateTournament onBack={() => setView('main')} />;
    if (view === 'tournamentDetails' && activeTournamentId) return (
      <TournamentDetails
        tournamentId={activeTournamentId}
        onBack={() => {
          setView('main');
          setActiveTab('tournaments');
        }}
        onTeamClick={(id) => { setActiveMatchId(id); setView('teamDetails'); }}
        onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }}
        onMatchClick={handleMatchClick}
        onStartTournamentMatch={(id) => {
          setActiveTournamentId(id);
          setView('start-tournament-match');
        }}
        onDeleted={() => {
          setActiveTournamentId(null);
          setActiveTab('tournaments');
          setView('main');
        }}
      />
    );
    if (view === 'scorer' && activeMatchId) return <Scorer matchId={activeMatchId} onBack={() => setView('main')} />;
    if (view === 'matchDetails' && activeMatchId) return <MatchDetailsPage matchId={activeMatchId} onBack={() => setView('main')} />;
    if (view === 'teamDetails' && activeMatchId) return (
      <TeamDetails
        teamId={activeMatchId}
        onBack={() => setView('main')}
        onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }}
      />
    );

    if (view === 'history') return (
      <div className="p-4 bg-white min-h-screen pb-24">
        <button onClick={() => setView('main')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-6">Match History</h2>
        <div className="flex flex-col gap-4">
          {recentMatches.length > 0 ? recentMatches.map(match => (
            <MatchCardUI key={match.id} match={match} teams={teams} onClick={(id) => { setActiveMatchId(id); setView('scorer'); }} />
          )) : (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <History size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No matches found</p>
            </div>
          )}
        </div>
      </div>
    );

    if (view === 'about') return (
      <div className="p-6 bg-white min-h-screen">
        <button onClick={() => setView('main')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-4">About ScoreArena</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          ScoreArena is a world-class cricket scoring application designed for amateur and professional cricketers alike.
        </p>
      </div>
    );
    if (view === 'help') return (
      <div className="p-6 bg-white min-h-screen">
        <button onClick={() => setView('main')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-4">Help & Support</h2>
      </div>
    );
    if (view === 'settings') return (
      <div className="p-6 bg-white min-h-screen">
        <button onClick={() => setView('main')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-4">Settings</h2>
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Dark Mode</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Switch app appearance</p>
          </div>
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`relative w-16 h-9 rounded-full transition-colors ${theme === 'dark' ? 'bg-yellow-500' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all ${theme === 'dark' ? 'left-8' : 'left-1'}`}
            />
          </button>
        </div>
      </div>
    );

    switch (activeTab) {
      case 'home': return <HomePage onStartMatch={() => setView('start-match')} onMatchClick={handleMatchClick} onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }} matches={matches} recentMatches={recentMatches} globalMatches={globalMatches} teams={teams} tournaments={tournaments} userTeamIds={userTeamIds} />;
      case 'teams': return (
        <TeamsPage
          onCreateTeam={() => setView('create-team')}
          onCreatePlayer={() => setView('create-player')}
          liveMatches={globalMatches}
          onTeamClick={(id) => { setActiveMatchId(id); setView('teamDetails'); }}
        />
      );
      case 'myCricket': return <MyCricketPage teams={teams} onMatchClick={handleMatchClick} />;
      case 'tournaments': return (
        <TournamentsPage
          onCreateTournament={() => setView('create-tournament')}
          onTournamentClick={(id) => { setActiveTournamentId(id); setView('tournamentDetails'); }}
          onStartTournamentScorer={() => {
            setActiveTournamentId(null);
            setView('start-tournament-match');
          }}
        />
      );
      case 'leaderboard': return <Leaderboard onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }} />;
      case 'profile': return <ProfilePage />;
      default: return <HomePage onStartMatch={() => setView('start-match')} onMatchClick={handleMatchClick} onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }} matches={matches} recentMatches={recentMatches} globalMatches={globalMatches} teams={teams} tournaments={tournaments} userTeamIds={userTeamIds} />;
    }
  };

  const titles: Record<string, string> = {
    home: 'ScoreArena',
    teams: 'My Teams',
    myCricket: 'My Cricket',
    tournaments: 'Tournaments',
    leaderboard: 'Leaderboard',
    profile: 'My Profile',
  };

  return (
    <div className={`min-h-screen bg-gray-50 font-sans selection:bg-yellow-200 ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <HeaderUI
        title={titles[activeTab] || 'ScoreArena'}
        onMenuClick={() => setIsMenuOpen(true)}
        onSearchClick={() => setView('search')}
        onNotificationClick={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="bg-yellow-500 p-6 flex flex-col gap-4">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-white overflow-hidden shadow-lg">
                  <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-black text-lg">{user?.displayName}</h3>
                  <p className="text-black/60 text-xs font-bold uppercase tracking-widest">{user?.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <MenuLinkUI icon={History} label="Match History" onClick={() => { setActiveTab('myCricket'); setIsMenuOpen(false); }} />
                <MenuLinkUI icon={Users} label="My Teams" onClick={() => { setActiveTab('teams'); setIsMenuOpen(false); }} />
                <MenuLinkUI icon={Trophy} label="My Tournaments" onClick={() => { setActiveTab('tournaments'); setIsMenuOpen(false); }} />
                <button
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  className="w-full flex items-center justify-between gap-4 px-6 py-3.5 text-gray-700 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <Settings size={20} className="text-gray-400 group-hover:text-yellow-600 transition-colors" />
                    <span className="font-medium">Dark Mode</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">{theme === 'dark' ? 'On' : 'Off'}</span>
                </button>
                <div className="h-px bg-gray-100 my-2" />
                <MenuLinkUI icon={Info} label="About Us" onClick={() => { setView('about'); setIsMenuOpen(false); }} />
                <MenuLinkUI icon={HelpCircle} label="Help & Support" onClick={() => { setView('help'); setIsMenuOpen(false); }} />
                <MenuLinkUI icon={Settings} label="Settings" onClick={() => { setView('settings'); setIsMenuOpen(false); }} />
                <MenuLinkUI icon={Share2} label="Share App" onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'ScoreArena',
                      text: 'Check out this amazing cricket scoring app!',
                      url: window.location.href
                    });
                  }
                  setIsMenuOpen(false);
                }} />
              </div>

              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view === 'main' ? activeTab : view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      {view === 'main' && <NavbarUI activeTab={activeTab} setActiveTab={setActiveTab} />}
      <WelcomeModalUI isOpen={showWelcome} onClose={handleCloseWelcome} />

      <NotificationList
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNotificationClick={(id) => { setActiveMatchId(id); setView('matchDetails'); }}
      />
    </div>
  );
};

export default function App() {
  return <MainContent />;
}
