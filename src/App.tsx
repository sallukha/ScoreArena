/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, Component, ReactNode } from 'react';
import { auth, signIn, logOut, onAuthStateChanged, db, doc, getDoc, setDoc, query, collection, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Tournament } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, User, LayoutDashboard, PlusCircle, LogOut, Search, Bell, Menu, Share2, Settings, History, Info, HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { CreatePlayer } from './components/CreatePlayer';
import { CreateTeam } from './components/CreateTeam';
import { StartMatch } from './components/StartMatch';
import { Scorer } from './components/Scorer';
import { CreateTournament } from './components/CreateTournament';

type ViewState = 'main' | 'create-team' | 'create-player' | 'start-match' | 'scorer' | 'create-tournament' | 'about' | 'help' | 'settings' | 'history';

// --- Contexts ---
const AuthContext = createContext<{
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
});

const useAuth = () => useContext(AuthContext);

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', icon: LayoutDashboard, label: 'Home' },
    { id: 'teams', icon: Users, label: 'Teams' },
    { id: 'tournaments', icon: Trophy, label: 'Tournaments' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === tab.id ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Header = ({ title, onMenuClick }: { title: string, onMenuClick: () => void }) => {
  return (
    <header className="sticky top-0 bg-yellow-500 text-black px-4 py-3 flex justify-between items-center z-40 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight italic uppercase">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <Search size={22} />
        </button>
        <button className="p-1 hover:bg-yellow-600 rounded-full transition-colors relative">
          <Bell size={22} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border border-yellow-500"></span>
        </button>
      </div>
    </header>
  );
};

const MenuLink = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 px-6 py-3.5 text-gray-700 hover:bg-gray-50 transition-colors group"
  >
    <Icon size={20} className="text-gray-400 group-hover:text-yellow-600 transition-colors" />
    <span className="font-medium">{label}</span>
  </button>
);

// --- Pages ---

const MatchCard = ({ match, teams, onClick, isLive }: { match: any, teams: Record<string, any>, onClick: (id: string) => void, isLive?: boolean, key?: any }) => (
  <div 
    onClick={() => onClick(match.id)}
    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
  >
    {isLive && (
      <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 inline-block rounded-br-xl uppercase tracking-widest animate-pulse">
        Live
      </div>
    )}
    {!isLive && (
      <div className="bg-gray-500 text-white text-[10px] font-bold px-3 py-1 inline-block rounded-br-xl uppercase tracking-widest">
        Completed
      </div>
    )}
    <div className="p-5 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
            {teams[match.teamA]?.name?.[0] || 'A'}
          </div>
          <span className="font-bold text-gray-800">{teams[match.teamA]?.name || 'Team A'}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-gray-900">{match.scoreA.runs}/{match.scoreA.wickets}</span>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">({match.scoreA.overs}.{match.scoreA.balls} Overs)</p>
        </div>
      </div>
      <div className="h-px bg-gray-50" />
      <div className="flex justify-between items-center opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center font-bold text-yellow-600">
            {teams[match.teamB]?.name?.[0] || 'B'}
          </div>
          <span className="font-bold text-gray-800">{teams[match.teamB]?.name || 'Team B'}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-gray-900">
            {match.currentInnings === 2 || !isLive ? `${match.scoreB.runs}/${match.scoreB.wickets}` : 'Yet to Bat'}
          </span>
          {(!isLive || match.currentInnings === 2) && (
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">({match.scoreB.overs}.{match.scoreB.balls} Overs)</p>
          )}
        </div>
      </div>
      {isLive && (
        <div className="bg-yellow-500 p-3 rounded-xl text-center mt-2 shadow-sm active:scale-95 transition-transform">
          <p className="text-xs font-black uppercase tracking-widest text-black">
            Continue Scoring
          </p>
        </div>
      )}
      {!isLive && (
        <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-100 text-center">
          <p className="text-[10px] text-yellow-800 font-bold uppercase tracking-tight">
            Match Ended
          </p>
        </div>
      )}
    </div>
  </div>
);

const Home = ({ onStartMatch, onMatchClick, matches, recentMatches, teams }: { 
  onStartMatch: () => void, 
  onMatchClick: (id: string) => void,
  matches: any[],
  recentMatches: any[],
  teams: Record<string, any>
}) => {
  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          LIVE MATCHES
        </h2>
        <button className="text-yellow-600 text-sm font-bold uppercase tracking-tight">View All</button>
      </div>
      
      {matches.map(match => (
        <MatchCard key={match.id} match={match} teams={teams} onClick={onMatchClick} isLive />
      ))}

      {matches.length === 0 && (
        <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
          <LayoutDashboard size={32} className="mx-auto text-gray-200 mb-2" />
          <p className="text-gray-400 text-xs font-medium italic">No live matches</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          RECENT MATCHES
        </h2>
      </div>

      {recentMatches.map(match => (
        <MatchCard key={match.id} match={match} teams={teams} onClick={onMatchClick} />
      ))}

      <div className="flex justify-between items-center mt-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          UPCOMING TOURNAMENTS
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
              <Trophy size={32} className="text-gray-300" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 leading-tight">Summer Cricket League 2026</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Starts in 5 days</p>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartMatch}
        className="fixed bottom-24 right-6 w-16 h-16 bg-yellow-500 rounded-full shadow-2xl flex flex-col items-center justify-center text-black z-40 border-4 border-white"
      >
        <div className="absolute -top-2 -right-2 bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">
          ₹25
        </div>
        <PlusCircle size={20} />
        <span className="text-[10px] font-black uppercase tracking-tighter leading-none mt-0.5">
          Start
        </span>
      </motion.button>
    </div>
  );
};

const Teams = ({ onCreateTeam, onCreatePlayer }: { onCreateTeam: () => void, onCreatePlayer: () => void }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const qTeams = query(collection(db, 'teams'), where('createdBy', '==', user.uid));
    const qPlayers = query(collection(db, 'players'), where('createdBy', '==', user.uid));
    
    const unsubTeams = onSnapshot(qTeams, (snap) => {
      setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPlayers = onSnapshot(qPlayers, (snap) => {
      setPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTeams(); unsubPlayers(); };
  }, [user]);

  return (
    <div className="p-4 flex flex-col gap-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">MY TEAMS</h2>
        <button
          onClick={onCreateTeam}
          className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight shadow-sm"
        >
          + Create Team
        </button>
      </div>
      
      <div className="flex flex-col gap-3">
        {teams.map(team => (
          <div key={team.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-yellow-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                {team.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{team.name}</h3>
                <p className="text-xs text-gray-500 font-medium">{team.players?.length || 0} Players</p>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-yellow-600 transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <Users size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium italic">No teams created yet</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <h2 className="text-lg font-bold text-gray-900">MY PLAYERS</h2>
        <button
          onClick={onCreatePlayer}
          className="text-yellow-600 text-xs font-bold uppercase tracking-tight"
        >
          + Add Player
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {players.map(player => (
          <div key={player.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-400">
                {player.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{player.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

const Tournaments = ({ onCreateTournament }: { onCreateTournament: () => void }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
      setLoading(false);
    }, (error) => {
      console.error('Tournaments: Error fetching tournaments:', error);
      handleFirestoreError(error, OperationType.GET, 'tournaments');
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4 pb-24">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-900">TOURNAMENTS</h2>
        <button 
          onClick={onCreateTournament}
          className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight shadow-sm"
        >
          + Start Tournament
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Trophy size={40} className="text-yellow-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">No Active Tournaments</h3>
            <p className="text-sm text-gray-600 mt-1">Create or join a tournament to start competing!</p>
          </div>
          <button 
            onClick={onCreateTournament}
            className="bg-black text-white px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest mt-2 hover:bg-gray-800 transition-colors"
          >
            Create Tournament
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tournaments.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-900 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Trophy size={20} className="text-yellow-500" />
                  <h3 className="text-white font-bold text-sm uppercase tracking-tight">{t.name}</h3>
                </div>
                <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">{t.status}</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">City</span>
                  <span className="text-gray-800 font-bold">{t.city}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Duration</span>
                  <span className="text-gray-800 font-bold">{t.startDate} - {t.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  return (
    <div className="pb-24">
      <div className="bg-yellow-500 p-8 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-white border-4 border-white overflow-hidden shadow-2xl">
          <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-black italic uppercase tracking-tight">{user?.displayName}</h2>
          <p className="text-black/60 font-bold text-sm uppercase tracking-widest mt-1">All-Rounder • Right Hand Bat</p>
        </div>
      </div>
      
      <div className="p-4 -mt-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 grid grid-cols-3 gap-4">
          <StatBox label="Matches" value="24" />
          <StatBox label="Runs" value="842" />
          <StatBox label="Wickets" value="15" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          BATTING STATS
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
          <StatRow label="Avg" value="35.08" />
          <StatRow label="S/R" value="142.5" />
          <StatRow label="Highest" value="84*" />
          <StatRow label="50s / 100s" value="4 / 0" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          BOWLING STATS
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
          <StatRow label="Econ" value="7.42" />
          <StatRow label="Best" value="3/18" />
          <StatRow label="Avg" value="22.1" />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
  <div className="text-center">
    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xl font-black text-gray-900 italic">{value}</p>
  </div>
);

const StatRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500 font-medium">{label}</span>
    <span className="text-sm font-bold text-gray-900">{value}</span>
  </div>
);

// --- Main App ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthProvider: Auth state changed:', firebaseUser?.uid);
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            console.log('AuthProvider: User doc found');
            setUser(userDoc.data() as UserProfile);
          } else {
            console.log('AuthProvider: Creating new user doc');
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('AuthProvider: Error in auth listener:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      console.error('Login failed', err);
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection, disable ad-blockers, and ensure your app domain is authorized in Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled: The login popup was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked: Please allow popups for this site to continue with Google.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const MainContent = () => {
  const { user, loading, error, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState<ViewState>('main');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [matches, setMatches] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    console.log('MainContent: Initializing match listeners...');
    const qLive = query(collection(db, 'matches'), where('status', '==', 'live'));
    const qRecent = query(collection(db, 'matches'), where('status', '==', 'completed'));
    
    const unsubLive = onSnapshot(qLive, (snap) => {
      const matchData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchData);
      matchData.forEach(m => fetchTeamNames(m));
    });

    const unsubRecent = onSnapshot(qRecent, (snap) => {
      const matchData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentMatches(matchData);
      matchData.forEach(m => fetchTeamNames(m));
    });

    const fetchTeamNames = async (m: any) => {
      if (!teams[m.teamA]) {
        const tA = await getDoc(doc(db, 'teams', m.teamA));
        if (tA.exists()) setTeams(prev => ({ ...prev, [m.teamA]: tA.data() }));
      }
      if (!teams[m.teamB]) {
        const tB = await getDoc(doc(db, 'teams', m.teamB));
        if (tB.exists()) setTeams(prev => ({ ...prev, [m.teamB]: tB.data() }));
      }
    };

    return () => { unsubLive(); unsubRecent(); };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-500 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-black border-t-transparent rounded-full"
        />
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-black">Score Wala</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-12">
        <div className="text-center flex flex-col gap-4">
          <div className="w-24 h-24 bg-yellow-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-12">
            <Trophy size={48} className="text-black -rotate-12" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mt-4">Score Wala</h1>
          <p className="text-gray-500 font-medium max-w-xs mx-auto">
            The #1 Cricket Scoring App for Local Cricket Heroes.
          </p>
        </div>
        
        <div className="w-full flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold text-center border border-red-100">
              {error}
            </div>
          )}
          <button
            onClick={login}
            className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold text-lg shadow-xl shadow-yellow-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (view === 'create-team') return <CreateTeam onBack={() => setView('main')} />;
    if (view === 'create-player') return <CreatePlayer onBack={() => setView('main')} />;
    if (view === 'start-match') return <StartMatch onBack={() => setView('main')} onStart={(id) => { setActiveMatchId(id); setView('scorer'); }} />;
    if (view === 'create-tournament') return <CreateTournament onBack={() => setView('main')} />;
    if (view === 'scorer' && activeMatchId) return <Scorer matchId={activeMatchId} onBack={() => setView('main')} />;
    
    if (view === 'history') return (
      <div className="p-4 bg-white min-h-screen pb-24">
        <button onClick={() => setView('main')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-6">Match History</h2>
        <div className="flex flex-col gap-4">
          {recentMatches.length > 0 ? recentMatches.map(match => (
            <MatchCard key={match.id} match={match} teams={teams} onClick={(id) => { setActiveMatchId(id); setView('scorer'); }} />
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
        <h2 className="text-2xl font-black italic uppercase text-gray-900 mb-4">About Score Wala</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Score Wala is a world-class cricket scoring application designed for amateur and professional cricketers alike. 
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
      </div>
    );

    switch (activeTab) {
      case 'home': return <Home onStartMatch={() => setView('start-match')} onMatchClick={(id) => { setActiveMatchId(id); setView('scorer'); }} matches={matches} recentMatches={recentMatches} teams={teams} />;
      case 'teams': return <Teams onCreateTeam={() => setView('create-team')} onCreatePlayer={() => setView('create-player')} />;
      case 'tournaments': return <Tournaments onCreateTournament={() => setView('create-tournament')} />;
      case 'profile': return <Profile />;
      default: return <Home onStartMatch={() => setView('start-match')} onMatchClick={(id) => { setActiveMatchId(id); setView('scorer'); }} matches={matches} recentMatches={recentMatches} teams={teams} />;
    }
  };

  const titles: Record<string, string> = {
    home: 'Score Wala',
    teams: 'My Teams',
    tournaments: 'Tournaments',
    profile: 'My Profile',
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-yellow-200">
      <Header title={titles[activeTab] || 'Score Wala'} onMenuClick={() => setIsMenuOpen(true)} />
      
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
                <MenuLink icon={History} label="Match History" onClick={() => { setView('history'); setIsMenuOpen(false); }} />
                <MenuLink icon={Users} label="My Teams" onClick={() => { setActiveTab('teams'); setIsMenuOpen(false); }} />
                <MenuLink icon={Trophy} label="My Tournaments" onClick={() => { setActiveTab('tournaments'); setIsMenuOpen(false); }} />
                <div className="h-px bg-gray-100 my-2" />
                <MenuLink icon={Info} label="About Us" onClick={() => { setView('about'); setIsMenuOpen(false); }} />
                <MenuLink icon={HelpCircle} label="Help & Support" onClick={() => { setView('help'); setIsMenuOpen(false); }} />
                <MenuLink icon={Settings} label="Settings" onClick={() => { setView('settings'); setIsMenuOpen(false); }} />
                <MenuLink icon={Share2} label="Share App" onClick={() => { 
                  if (navigator.share) {
                    navigator.share({
                      title: 'Score Wala',
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
      {view === 'main' && <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    const state = (this as any).state;
    if (state.hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        const parsed = JSON.parse(state.error.message);
        if (parsed.error) {
          errorMessage = `Firebase Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Bell size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Oops! An error occurred</h1>
          <p className="text-red-700 mb-8 max-w-xs mx-auto">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
          >
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
