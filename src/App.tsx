/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, Component, ReactNode } from 'react';
import { auth, signIn, logOut, onAuthStateChanged, db, doc, getDoc, getDocs, setDoc, query, collection, where, onSnapshot, orderBy, limit, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Tournament } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, User, LayoutDashboard, PlusCircle, LogOut, Search, Bell, Menu, Share2, Settings, History, Info, HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react';
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

type ViewState = 'main' | 'create-team' | 'create-player' | 'start-match' | 'scorer' | 'create-tournament' | 'about' | 'help' | 'settings' | 'history' | 'matchDetails' | 'explore' | 'search' | 'leaderboard' | 'playerDetails' | 'teamDetails' | 'tournamentDetails';

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

const THEME_STORAGE_KEY = 'scorewala-theme';
const MAX_PROFILE_IMAGE_DIMENSION = 512;
const PROFILE_IMAGE_QUALITY = 0.82;

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function optimizeProfileImage(file: File) {
  const rawDataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Selected image could not be loaded'));
    img.src = rawDataUrl;
  });

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_PROFILE_IMAGE_DIMENSION / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image processing is not supported in this browser');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', PROFILE_IMAGE_QUALITY);
}

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', icon: LayoutDashboard, label: 'Home' },
    { id: 'teams', icon: Users, label: 'Teams' },
    { id: 'leaderboard', icon: Trophy, label: 'Leaders' },
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

const Header = ({ 
  title, 
  onMenuClick, 
  onSearchClick, 
  onNotificationClick,
  unreadCount 
}: { 
  title: string, 
  onMenuClick: () => void, 
  onSearchClick: () => void,
  onNotificationClick: () => void,
  unreadCount: number
}) => {
  return (
    <header className="sticky top-0 bg-yellow-500 text-black px-4 py-3 flex justify-between items-center z-40 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight italic uppercase">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onSearchClick} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <Search size={22} />
        </button>
        <button 
          onClick={onNotificationClick}
          className="p-1 hover:bg-yellow-600 rounded-full transition-colors relative"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-yellow-500">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
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

const MatchDetails = ({ matchId, onBack }: { matchId: string, onBack: () => void }) => {
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [balls, setBalls] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'scorecard' | 'commentary'>('info');
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubMatch = onSnapshot(doc(db, 'matches', matchId), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setMatch(data);
        
        const [sA, sB] = await Promise.all([
          getDoc(doc(db, 'teams', (data as any).teamA)),
          getDoc(doc(db, 'teams', (data as any).teamB))
        ]);
        if (sA.exists()) setTeamA(sA.data());
        if (sB.exists()) setTeamB(sB.data());

        // Fetch player names
        const pStats = (data as any).playerStats || {};
        const pIds = Object.keys(pStats);
        const names: Record<string, string> = {};
        await Promise.all(pIds.map(async (id) => {
          const pDoc = await getDoc(doc(db, 'players', id));
          if (pDoc.exists()) names[id] = pDoc.data().name;
        }));
        setPlayerNames(names);
      }
    });

    const q = query(collection(db, 'matches', matchId, 'balls'), orderBy('timestamp', 'desc'));
    const unsubBalls = onSnapshot(q, (snap) => {
      setBalls(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 12));
    });

    return () => { unsubMatch(); unsubBalls(); };
  }, [matchId]);

  if (!match || !teamA || !teamB) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  const currentScore = match.currentInnings === 1 ? match.scoreA : match.scoreB;
  const battingTeam = match.currentInnings === 1 ? teamA : teamB;

  const handleShareMatch = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${teamA.name} vs ${teamB.name} - Score Wala`,
          text: `Check out the live score: ${teamA.name} ${match.scoreA.runs}/${match.scoreA.wickets} vs ${teamB.name} ${match.scoreB.runs}/${match.scoreB.wickets}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-yellow-500 p-6 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Match Details</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">Live Scoreboard</p>
          </div>
        </div>
        <button 
          onClick={handleShareMatch}
          className="p-2 bg-black text-white rounded-xl shadow-lg active:scale-90 transition-transform"
        >
          <Share2 size={20} />
        </button>
      </div>

        <div className="flex gap-4 px-4 border-b border-gray-100 bg-white sticky top-[88px] z-40">
          {(['info', 'scorecard', 'commentary'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab ? 'text-yellow-600' : 'text-gray-400'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-6">
          {activeTab === 'info' && (
            <>
              <div className="bg-black text-white p-8 rounded-[3rem] shadow-2xl flex flex-col gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full -mr-32 -mt-32" />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-red-500">Live</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{match.overs} Overs</span>
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500">{teamA.name}</h3>
                      <p className="text-4xl font-black">{match.scoreA.runs}-{match.scoreA.wickets}</p>
                      <p className="text-sm font-bold text-gray-500">({match.scoreA.overs}.{match.scoreA.balls})</p>
                    </div>
                    <div className="text-xl font-black italic text-gray-700">VS</div>
                    <div className="flex flex-col gap-1 text-right">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500">{teamB.name}</h3>
                      <p className="text-4xl font-black">{match.scoreB.runs}-{match.scoreB.wickets}</p>
                      <p className="text-sm font-bold text-gray-500">({match.scoreB.overs}.{match.scoreB.balls})</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 relative z-10">
                  <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {match.status === 'live' ? `${battingTeam.name} needs ${match.currentInnings === 2 ? (match.scoreA.runs + 1 - match.scoreB.runs) : 'to set a target'}` : 'Match Completed'}
                  </p>
                </div>
              </div>

              {match.status === 'live' && (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Live Stats</h3>
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-400 uppercase tracking-widest font-black">
                      <tr className="border-b border-gray-100">
                        <th className="pb-2">Batter</th>
                        <th className="pb-2 text-center">R</th>
                        <th className="pb-2 text-center">B</th>
                        <th className="pb-2 text-center">4s</th>
                        <th className="pb-2 text-center">6s</th>
                        <th className="pb-2 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-800">
                      {match.striker && (
                        <tr className="border-b border-gray-50">
                          <td className="py-3 truncate max-w-[100px]">{match.strikerName || 'Striker'}*</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.striker]?.runs || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.striker]?.balls || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.striker]?.fours || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.striker]?.sixes || 0}</td>
                          <td className="py-3 text-right">
                            {match.playerStats?.[match.striker]?.balls > 0 
                              ? ((match.playerStats[match.striker].runs / match.playerStats[match.striker].balls) * 100).toFixed(1) 
                              : '0.0'}
                          </td>
                        </tr>
                      )}
                      {match.nonStriker && (
                        <tr className="border-b border-gray-50 opacity-60">
                          <td className="py-3 truncate max-w-[100px]">{match.nonStrikerName || 'Non-Striker'}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.nonStriker]?.runs || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.nonStriker]?.balls || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.nonStriker]?.fours || 0}</td>
                          <td className="py-3 text-center">{match.playerStats?.[match.nonStriker]?.sixes || 0}</td>
                          <td className="py-3 text-right">
                            {match.playerStats?.[match.nonStriker]?.balls > 0 
                              ? ((match.playerStats[match.nonStriker].runs / match.playerStats[match.nonStriker].balls) * 100).toFixed(1) 
                              : '0.0'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {match.bowler && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-black text-gray-800">{match.bowlerName || 'Bowler'}</span>
                      </div>
                      <div className="flex gap-4 text-xs font-black text-gray-900">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-400 uppercase text-[8px]">Overs</span>
                          <span>{match.playerStats?.[match.bowler]?.overs || 0}.{match.playerStats?.[match.bowler]?.ballsBowled || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-gray-400 uppercase text-[8px]">Runs</span>
                          <span>{match.playerStats?.[match.bowler]?.runsConceded || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-gray-400 uppercase text-[8px]">Wkts</span>
                          <span className="text-red-600">{match.playerStats?.[match.bowler]?.wickets || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Recent Balls</h3>
                <div className="flex flex-wrap gap-3">
                  {balls.map((ball, i) => (
                    <div 
                      key={ball.id || i}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-110 ${
                        ball.wicket ? 'bg-red-500 text-white' :
                        ball.runs === 4 ? 'bg-green-500 text-white' :
                        ball.runs === 6 ? 'bg-purple-600 text-white' :
                        ball.extraType === 'wide' ? 'bg-blue-500 text-white' :
                        ball.extraType === 'no-ball' ? 'bg-orange-500 text-white' :
                        ball.extraType ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ball.wicket ? 'W' : 
                       ball.extraType === 'wide' ? `${ball.runs + 1}wd` :
                       ball.extraType === 'no-ball' ? `${ball.runs + 1}nb` :
                       ball.extraType ? `${ball.runs}${ball.extraType[0].toUpperCase()}` : 
                       ball.runs}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'scorecard' && (
            <div className="flex flex-col gap-6">
              {/* Team A Scorecard */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{teamA.name} Batting</h3>
                  <span className="text-sm font-black text-black">{match.scoreA.runs}/{match.scoreA.wickets} ({match.scoreA.overs}.{match.scoreA.balls})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                      <tr>
                        <th className="pb-2">Batter</th>
                        <th className="pb-2 text-center">R</th>
                        <th className="pb-2 text-center">B</th>
                        <th className="pb-2 text-center">4s</th>
                        <th className="pb-2 text-center">6s</th>
                        <th className="pb-2 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-800">
                      {teamA.players?.map((id: string) => {
                        const s = match.playerStats?.[id] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
                        const isOut = match.fallOfWickets?.find((f: any) => f.player === id && f.innings === 1);
                        const isCurrentlyBatting = match.currentInnings === 1 && (match.striker === id || match.nonStriker === id);
                        
                        return (
                          <tr key={id} className="border-b border-gray-50/50">
                            <td className="py-3">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[100px] font-black text-gray-900">{playerNames[id] || `Player ${id.slice(0, 4)}`}{isCurrentlyBatting ? '*' : ''}</span>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                  {isOut
                                    ? `${isOut.type} b ${playerNames[isOut.bowler] || 'Bowler'} • ${s.runs} (${s.balls})`
                                    : (isCurrentlyBatting ? 'Batting' : (s.balls > 0 ? 'Not Out' : 'Yet to bat'))}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center">{s.runs}</td>
                            <td className="py-3 text-center">{s.balls}</td>
                            <td className="py-3 text-center">{s.fours}</td>
                            <td className="py-3 text-center">{s.sixes}</td>
                            <td className="py-3 text-right">{(s.balls > 0 ? (s.runs / s.balls * 100).toFixed(1) : '0.0')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Fall of Wickets A */}
                {match.fallOfWickets?.filter((f: any) => f.innings === 1).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fall of Wickets</h4>
                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                      {match.fallOfWickets.filter((f: any) => f.innings === 1).map((f: any, i: number) => (
                        <span key={i}>
                          {f.score}-{i+1} ({playerNames[f.player] || 'Player'} {match.playerStats?.[f.player]?.runs || 0}
                          /{match.playerStats?.[f.player]?.balls || 0}, {Math.floor(f.balls/6)}.{f.balls%6} ov)
                          {i < match.fallOfWickets.filter((f: any) => f.innings === 1).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>

              {/* Team B Scorecard */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{teamB.name} Batting</h3>
                  <span className="text-sm font-black text-black">{match.scoreB.runs}/{match.scoreB.wickets} ({match.scoreB.overs}.{match.scoreB.balls})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                      <tr>
                        <th className="pb-2">Batter</th>
                        <th className="pb-2 text-center">R</th>
                        <th className="pb-2 text-center">B</th>
                        <th className="pb-2 text-center">4s</th>
                        <th className="pb-2 text-center">6s</th>
                        <th className="pb-2 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-800">
                      {teamB.players?.map((id: string) => {
                        const s = match.playerStats?.[id] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
                        const isOut = match.fallOfWickets?.find((f: any) => f.player === id && f.innings === 2);
                        const isCurrentlyBatting = match.currentInnings === 2 && (match.striker === id || match.nonStriker === id);
                        
                        return (
                          <tr key={id} className="border-b border-gray-50/50">
                            <td className="py-3">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[100px] font-black text-gray-900">{playerNames[id] || `Player ${id.slice(0, 4)}`}{isCurrentlyBatting ? '*' : ''}</span>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                  {isOut
                                    ? `${isOut.type} b ${playerNames[isOut.bowler] || 'Bowler'} • ${s.runs} (${s.balls})`
                                    : (isCurrentlyBatting ? 'Batting' : (s.balls > 0 ? 'Not Out' : 'Yet to bat'))}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center">{s.runs}</td>
                            <td className="py-3 text-center">{s.balls}</td>
                            <td className="py-3 text-center">{s.fours}</td>
                            <td className="py-3 text-center">{s.sixes}</td>
                            <td className="py-3 text-right">{(s.balls > 0 ? (s.runs / s.balls * 100).toFixed(1) : '0.0')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Fall of Wickets B */}
                {match.fallOfWickets?.filter((f: any) => f.innings === 2).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fall of Wickets</h4>
                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                      {match.fallOfWickets.filter((f: any) => f.innings === 2).map((f: any, i: number) => (
                        <span key={i}>
                          {f.score}-{i+1} ({playerNames[f.player] || 'Player'} {match.playerStats?.[f.player]?.runs || 0}
                          /{match.playerStats?.[f.player]?.balls || 0}, {Math.floor(f.balls/6)}.{f.balls%6} ov)
                          {i < match.fallOfWickets.filter((f: any) => f.innings === 2).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>

              {/* Bowling Stats */}
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Bowling</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                      <tr>
                        <th className="pb-2">Bowler</th>
                        <th className="pb-2 text-center">O</th>
                        <th className="pb-2 text-center">R</th>
                        <th className="pb-2 text-center">W</th>
                        <th className="pb-2 text-right">Eco</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-800">
                      {Object.entries(match.playerStats || {}).map(([id, s]: any) => {
                        if (s.overs === 0 && s.ballsBowled === 0) return null;
                        const totalBalls = (s.overs * 6) + s.ballsBowled;
                        if (totalBalls === 0) return null;

                        return (
                          <tr key={id} className="border-b border-gray-50/50">
                            <td className="py-3 truncate max-w-[100px]">{playerNames[id] || `Player ${id.slice(0, 4)}`}</td>
                            <td className="py-3 text-center">{s.overs}.{s.ballsBowled}</td>
                            <td className="py-3 text-center">{s.runsConceded}</td>
                            <td className="py-3 text-center text-red-600">{s.wickets}</td>
                            <td className="py-3 text-right">{(s.runsConceded / (totalBalls / 6)).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commentary' && (
            <div className="bg-white rounded-[2.5rem] p-12 border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Commentary coming soon</p>
            </div>
          )}
        </div>
    </div>
  );
};

const MatchCard = ({ match, teams, onClick, isLive }: { match: any, teams: Record<string, any>, onClick: (id: string) => void, isLive?: boolean, key?: any }) => {
  const teamA = teams[match.teamA] || { name: 'Team A' };
  const teamB = teams[match.teamB] || { name: 'Team B' };
  
  const striker = match.playerStats?.[match.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const nonStriker = match.playerStats?.[match.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const bowler = match.playerStats?.[match.bowler] || { overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `${teamA.name} vs ${teamB.name} - Score Wala`,
        text: `Live Score: ${teamA.name} ${match.scoreA.runs}/${match.scoreA.wickets} vs ${teamB.name} ${match.scoreB.runs}/${match.scoreB.wickets}`,
        url: window.location.href
      });
    }
  };

  const currentInnings = match.currentInnings === 2 ? 2 : 1;
  const inningWickets = (match.fallOfWickets || []).filter((w: any) => w.innings === currentInnings);
  const recentDismissals = inningWickets.slice(-3);

  return (
    <div 
      onClick={() => onClick(match.id)}
      className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md"
    >
      <div className="flex justify-between items-center p-4 pb-0">
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Live</span>
            </div>
          ) : (
            <div className="bg-gray-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              Completed
            </div>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{match.matchType}</span>
        </div>
        <button 
          onClick={handleShare}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400"
        >
          <Share2 size={16} />
        </button>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
              <span className="text-base sm:text-lg font-black text-gray-400">{teamA.name[0]}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight">{teamA.name}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {match.currentInnings === 1 ? 'Batting' : 'Bowling'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-black text-gray-900">{match.scoreA.runs}/{match.scoreA.wickets}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{match.scoreA.overs}.{match.scoreA.balls} Ov</p>
          </div>
        </div>

        <div className="flex justify-between items-start gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
              <span className="text-base sm:text-lg font-black text-gray-400">{teamB.name[0]}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight">{teamB.name}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {match.currentInnings === 2 ? 'Batting' : (match.currentInnings === 1 ? 'Yet to bat' : 'Bowling')}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-black text-gray-900">
              {match.currentInnings === 2 || !isLive ? `${match.scoreB.runs}/${match.scoreB.wickets}` : '0/0'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {match.currentInnings === 2 || !isLive ? `${match.scoreB.overs}.${match.scoreB.balls} Ov` : '0.0 Ov'}
            </p>
          </div>
        </div>

        {isLive && (
          <div className="mt-1 pt-5 sm:pt-6 border-t border-gray-50">
            <table className="w-full text-left text-[10px]">
              <thead className="text-gray-400 font-black uppercase tracking-widest">
                <tr>
                  <th className="pb-2">Batter</th>
                  <th className="pb-2 text-center">R</th>
                  <th className="pb-2 text-center">B</th>
                  <th className="pb-2 text-center">4s</th>
                  <th className="pb-2 text-center">6s</th>
                  <th className="pb-2 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="font-bold text-gray-800">
                <tr className="border-b border-gray-50/50">
                  <td className="py-2 truncate max-w-[80px]">{match.strikerName || 'Striker'}*</td>
                  <td className="py-2 text-center">{striker.runs}</td>
                  <td className="py-2 text-center">{striker.balls}</td>
                  <td className="py-2 text-center">{striker.fours}</td>
                  <td className="py-2 text-center">{striker.sixes}</td>
                  <td className="py-2 text-right">{(striker.balls > 0 ? (striker.runs / striker.balls * 100).toFixed(1) : '0.0')}</td>
                </tr>
                <tr>
                  <td className="py-2 truncate max-w-[80px]">{match.nonStrikerName || 'Non-Striker'}</td>
                  <td className="py-2 text-center">{nonStriker.runs}</td>
                  <td className="py-2 text-center">{nonStriker.balls}</td>
                  <td className="py-2 text-center">{nonStriker.fours}</td>
                  <td className="py-2 text-center">{nonStriker.sixes}</td>
                  <td className="py-2 text-right">{(nonStriker.balls > 0 ? (nonStriker.runs / nonStriker.balls * 100).toFixed(1) : '0.0')}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold">
              <div className="flex flex-col">
                <span className="text-gray-400 uppercase tracking-widest mb-1">Bowler</span>
                <span className="text-gray-800 uppercase">{match.bowlerName || 'Bowler'}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 uppercase tracking-widest mb-1">O</span>
                  <span className="text-gray-800">{bowler.overs}.{bowler.ballsBowled}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 uppercase tracking-widest mb-1">R</span>
                  <span className="text-gray-800">{bowler.runsConceded}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 uppercase tracking-widest mb-1">W</span>
                  <span className="text-red-600">{bowler.wickets}</span>
                </div>
              </div>
            </div>

            {/* Recent Balls */}
            {match.recentBalls && match.recentBalls.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mr-1">Recent</span>
                  {match.recentBalls.slice(-6).map((ball: any, i: number) => (
                    <div 
                      key={i} 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border flex-shrink-0 ${
                        ball.isWicket ? 'bg-red-600 text-white border-red-600' : 
                        ball.runs === 4 ? 'bg-blue-600 text-white border-blue-600' :
                        ball.runs === 6 ? 'bg-purple-600 text-white border-purple-600' :
                        'bg-gray-50 text-gray-800 border-gray-100'
                      }`}
                    >
                      {ball.isWicket ? 'W' : ball.runs}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentDismissals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Wicket History</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-500">{inningWickets.length} Down</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {recentDismissals.map((wicket: any, index: number) => (
                    <div key={`${wicket.player}-${index}`} className="rounded-2xl bg-red-50 border border-red-100 px-3 py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 truncate">
                          {wicket.score}-{inningWickets.findIndex((item: any) => item === wicket) + 1}
                        </p>
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {wicket.playerName || wicket.player || 'Batter Out'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold truncate">
                          {wicket.type}{wicket.bowlerName ? ` • ${wicket.bowlerName}` : ''} • {match.playerStats?.[wicket.player]?.runs || 0} ({match.playerStats?.[wicket.player]?.balls || 0})
                        </p>
                      </div>
                      <div className="text-[10px] font-black text-gray-500 shrink-0">
                        {Math.floor((wicket.balls || 0) / 6)}.{(wicket.balls || 0) % 6} ov
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CricketNews = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | undefined;

    const loadNews = () => {
      fetch('/api/news/cricket')
        .then((response) => response.json())
        .then((data) => {
          if (!isMounted) return;
          setEnabled(Boolean(data.enabled));
          setArticles(Array.isArray(data.articles) ? data.articles : []);
        })
        .catch(() => {
          if (!isMounted) return;
          setEnabled(false);
          setArticles([]);
        });
    };

    loadNews();
    intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadNews();
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  if (!enabled || articles.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-black rounded-full"></span>
          CRICKET NEWS
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.slice(0, 4).map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:border-yellow-200 transition-colors"
          >
            <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
              {article.imageUrl ? (
                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Trophy size={36} />
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{article.source}</p>
              <h3 className="mt-2 text-sm font-black text-gray-900 leading-snug">{article.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const Home = ({ onStartMatch, onMatchClick, matches, recentMatches, globalMatches, teams, tournaments, userTeamIds }: { 
  onStartMatch: () => void, 
  onMatchClick: (id: string) => void,
  matches: any[],
  recentMatches: any[],
  globalMatches: any[],
  teams: Record<string, any>,
  tournaments: Tournament[],
  userTeamIds: string[]
}) => {
  // Combine matches created by user and matches where user's team is playing
  const myLiveMatches = globalMatches.filter(m => 
    m.createdBy === matches[0]?.createdBy || // Created by user (using first match as proxy for user ID if needed, but we have user.uid)
    userTeamIds.includes(m.teamA) || 
    userTeamIds.includes(m.teamB)
  );

  const otherLiveMatches = globalMatches.filter(gm => !myLiveMatches.find(mm => mm.id === gm.id));

  return (
    <div className="p-4 flex flex-col gap-8 pb-24">
      {/* My Live Matches */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
            MY LIVE MATCHES
          </h2>
        </div>
        
        {myLiveMatches.length > 0 ? (
          <div className="flex flex-col gap-4">
            {myLiveMatches.map(match => (
              <MatchCard key={match.id} match={match} teams={teams} onClick={() => onMatchClick(match.id)} isLive />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
            <LayoutDashboard size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 text-sm font-bold italic uppercase tracking-widest">No live matches</p>
            <button 
              onClick={onStartMatch}
              className="mt-4 text-yellow-600 text-xs font-black uppercase tracking-widest hover:underline"
            >
              Start a New Match
            </button>
          </div>
        )}
      </div>

      {/* Live Feed */}
      {otherLiveMatches.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-red-600 rounded-full animate-pulse"></span>
              LIVE FEED
            </h2>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
            {otherLiveMatches.map(match => (
              <div key={match.id} className="min-w-[88vw] sm:min-w-[340px] max-w-[420px] snap-start">
                <MatchCard match={match} teams={teams} onClick={() => onMatchClick(match.id)} isLive />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
          RECENT MATCHES
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {recentMatches.map(match => (
          <MatchCard key={match.id} match={match} teams={teams} onClick={() => onMatchClick(match.id)} />
        ))}
        {recentMatches.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
            <History size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 text-sm font-bold italic uppercase tracking-widest">No recent matches yet</p>
          </div>
        )}
      </div>

      {tournaments.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
              TOURNAMENTS
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tournaments.slice(0, 4).map((tournament) => (
              <div key={tournament.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="w-full aspect-video bg-yellow-50 rounded-2xl flex items-center justify-center">
                  <Trophy size={40} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-black italic uppercase tracking-tighter text-gray-900 leading-tight">{tournament.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {tournament.status || 'upcoming'} • {tournament.teamCount || tournament.teams?.length || 0} teams
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CricketNews />

      <motion.button
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartMatch}
        className="fixed bottom-24 right-6 w-20 h-20 bg-yellow-500 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-black z-40 border-4 border-white rotate-12"
      >
        <div className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-white">
          ₹25
        </div>
        <PlusCircle size={28} className="-rotate-12" />
        <span className="text-[10px] font-black uppercase tracking-tighter leading-none mt-1 -rotate-12">
          Start
        </span>
      </motion.button>
    </div>
  );
};

const Teams = ({ onCreateTeam, onCreatePlayer, onTeamClick, liveMatches }: { onCreateTeam: () => void, onCreatePlayer: () => void, onTeamClick: (id: string) => void, liveMatches: any[] }) => {
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
        {teams.map(team => {
          const liveMatch = liveMatches.find((match) => match.teamA === team.id || match.teamB === team.id);
          return (
            <button 
              key={team.id} 
              onClick={() => onTeamClick(team.id)}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-yellow-200 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                  {team.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{team.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-gray-500 font-medium">{team.players?.length || 0} Players</p>
                    {liveMatch && (
                      <span className="rounded-full bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                        Live Now
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          );
        })}
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

const Tournaments = ({ onCreateTournament, onTournamentClick }: { onCreateTournament: () => void; onTournamentClick: (id: string) => void }) => {
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
            <button key={t.id} onClick={() => onTournamentClick(t.id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
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
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Teams</span>
                  <span className="text-gray-800 font-bold">{t.teamCount || t.teams?.length || 0}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const { user, logout } = useAuth();
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    // 1. Try to find player by user's UID (created by them)
    // 2. Try to find player by user's phone number
    const qByUid = query(collection(db, 'players'), where('createdBy', '==', user.uid), limit(1));
    const unsubByUid = onSnapshot(qByUid, (snap) => {
      if (!snap.empty) {
        setPlayerStats(snap.docs[0].data());
      } else if (user.phoneNumber) {
        // If not found by UID, try by phone number
        const qByPhone = query(collection(db, 'players'), where('phoneNumber', '==', user.phoneNumber), limit(1));
        getDocs(qByPhone).then(phoneSnap => {
          if (!phoneSnap.empty) {
            setPlayerStats(phoneSnap.docs[0].data());
          }
        });
      }
    });

    return () => unsubByUid();
  }, [user]);

  useEffect(() => {
    setImagePreview(user?.photoURL || '');
  }, [user?.photoURL]);

  const handleLinkPhone = async () => {
    if (!user || !phoneInput || phoneInput.length < 10) return;
    setIsLinking(true);
    try {
      // Update user profile with phone number
      await setDoc(doc(db, 'users', user.uid), {
        ...user,
        phoneNumber: phoneInput
      });
      
      // Try to find player with this phone number
      const q = query(collection(db, 'players'), where('phoneNumber', '==', phoneInput), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPlayerStats(snap.docs[0].data());
      }
      
      // Refresh user state (handled by AuthProvider listener)
      setPhoneInput('');
    } catch (error) {
      console.error('Error linking phone:', error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!user || !file) return;

    if (!file.type.startsWith('image/')) {
      setImageMessage('Please choose an image file.');
      event.target.value = '';
      return;
    }

    setIsSavingImage(true);
    setImageMessage('');
    try {
      const optimizedImage = await optimizeProfileImage(file);
      const nextUser = { ...user, photoURL: optimizedImage };
      await setDoc(doc(db, 'users', user.uid), nextUser);
      setImagePreview(optimizedImage);
      setImageMessage('Profile image updated.');
    } catch (error) {
      console.error('Error saving profile image:', error);
      setImageMessage('Profile image save nahi ho paayi. Dusri image try karo.');
    } finally {
      setIsSavingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!user) return;

    setIsSavingImage(true);
    setImageMessage('');
    try {
      const nextUser = { ...user, photoURL: '' };
      await setDoc(doc(db, 'users', user.uid), nextUser);
      setImagePreview('');
      setImageMessage('Profile image removed.');
    } catch (error) {
      console.error('Error removing profile image:', error);
      setImageMessage('Profile image remove nahi ho paayi.');
    } finally {
      setIsSavingImage(false);
    }
  };

  const stats = {
    matches: playerStats?.stats?.matches || 0,
    runs: playerStats?.stats?.runs || 0,
    wickets: playerStats?.stats?.wickets || 0,
    fours: playerStats?.stats?.fours || 0,
    sixes: playerStats?.stats?.sixes || 0,
    balls: playerStats?.stats?.balls || 0,
    ballsBowled: playerStats?.stats?.ballsBowled || 0,
    runsConceded: playerStats?.stats?.runsConceded || 0,
    fifties: playerStats?.stats?.fifties || 0,
    centuries: playerStats?.stats?.centuries || 0
  };

  const battingAvg = stats.matches > 0 ? (stats.runs / stats.matches).toFixed(2) : "0.00";
  const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0";
  const economy = stats.ballsBowled > 0 ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2) : "0.00";

  return (
    <div className="pb-24">
      <div className="bg-yellow-500 p-8 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-[2.5rem] bg-white border-4 border-white overflow-hidden shadow-2xl rotate-3">
          <img 
            src={imagePreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'default'}`} 
            alt="Profile" 
            className="w-full h-full object-cover -rotate-3" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">{user?.displayName || 'Cricket Hero'}</h2>
          <p className="text-black/60 font-bold text-xs uppercase tracking-widest mt-1">{user?.email || user?.phoneNumber || 'Player Profile'}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <label className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
              {isSavingImage ? 'Saving...' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="hidden"
                disabled={isSavingImage}
              />
            </label>
            {imagePreview && (
              <button
                onClick={handleRemoveProfileImage}
                disabled={isSavingImage}
                className="bg-white/80 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/10 disabled:opacity-60"
              >
                Remove Photo
              </button>
            )}
          </div>
          <p className="text-[9px] text-black/50 font-bold uppercase tracking-widest">JPG, PNG ya WebP image upload kar sakte ho.</p>
          {imageMessage && <p className="text-[10px] text-black/70 font-bold uppercase tracking-widest mt-2">{imageMessage}</p>}
          {!user?.phoneNumber && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Enter phone to link stats"
                  className="bg-white/20 border border-black/10 rounded-xl px-4 py-2 text-xs font-bold placeholder:text-black/40 focus:outline-none focus:bg-white/40 transition-all"
                />
                <button
                  onClick={handleLinkPhone}
                  disabled={isLinking || phoneInput.length < 10}
                  className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {isLinking ? '...' : 'Link'}
                </button>
              </div>
              <p className="text-[8px] text-black/40 font-bold uppercase tracking-widest">Link phone to sync your match history</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-4 -mt-6">
        <div className="bg-black text-white rounded-[2.5rem] shadow-2xl p-8 grid grid-cols-3 gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full -mr-32 -mt-32" />
          <StatBox label="Matches" value={String(stats.matches)} />
          <StatBox label="Runs" value={String(stats.runs)} />
          <StatBox label="Wickets" value={String(stats.wickets)} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Batting Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Average</p>
              <p className="text-3xl font-black text-black italic leading-none">{battingAvg}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Strike Rate</p>
              <p className="text-3xl font-black text-black italic leading-none">{strikeRate}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fours</p>
              <p className="text-xl font-black text-black italic">{stats.fours}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sixes</p>
              <p className="text-xl font-black text-black italic">{stats.sixes}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">50s</p>
              <p className="text-xl font-black text-black italic">{stats.fifties}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">100s</p>
              <p className="text-xl font-black text-black italic">{stats.centuries}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Bowling Performance
          </h3>
          <div className="bg-black text-white rounded-3xl p-6 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Economy</p>
              <p className="text-3xl font-black text-yellow-500 italic leading-none">{economy}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Best Figures</p>
              <p className="text-xl font-black text-white italic">--</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wickets</p>
              <p className="text-xl font-black text-black italic">{stats.wickets}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Runs Conceded</p>
              <p className="text-xl font-black text-black italic">{stats.runsConceded}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 flex items-center justify-center gap-2 mt-4"
        >
          <LogOut size={16} /> Sign Out
        </button>
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
    let unsubscribeUserDoc: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthProvider: Auth state changed:', firebaseUser?.uid);
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = undefined;
      }
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            console.log('AuthProvider: User doc found');
            unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
              if (snapshot.exists()) {
                setUser(snapshot.data() as UserProfile);
              }
            });
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

    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribe();
    };
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

const WelcomeModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[200] backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 100 }}
          className="fixed inset-0 flex items-center justify-center z-[210] p-6"
        >
          <div className="bg-yellow-500 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center gap-6 max-w-xs w-full border-4 border-black">
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12">
              <Trophy size={48} className="text-yellow-500 -rotate-12" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-black leading-none">Score Wala</h2>
              <div className="h-1 w-12 bg-black mx-auto rounded-full mt-2" />
            </div>
            <div className="bg-black/5 p-6 rounded-[2rem] border border-black/10 w-full">
              <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">Developed by</p>
              <p className="text-4xl font-black italic uppercase tracking-tighter text-black">Md Haris</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
            >
              Let's Play
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const MainContent = () => {
  const { user, loading, error, login, logout } = useAuth();
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
    if (user) {
      setShowWelcome(true);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);
  
  const [matches, setMatches] = useState<any[]>([]);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [globalMatches, setGlobalMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    async function fetchTeamNames(m: any) {
      if (!teams[m.teamA]) {
        const tA = await getDoc(doc(db, 'teams', m.teamA));
        if (tA.exists()) setTeams(prev => ({ ...prev, [m.teamA]: tA.data() }));
      }
      if (!teams[m.teamB]) {
        const tB = await getDoc(doc(db, 'teams', m.teamB));
        if (tB.exists()) setTeams(prev => ({ ...prev, [m.teamB]: tB.data() }));
      }
    }

    // Global Live Matches Listener
    const qGlobal = query(collection(db, 'matches'), where('status', '==', 'live'), limit(10));
    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      const matchData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalMatches(matchData);
      matchData.forEach(m => fetchTeamNames(m));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });

    const qTournaments = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(6));
    const unsubTournaments = onSnapshot(qTournaments, (snap) => {
      setTournaments(snap.docs.map((tournamentDoc) => ({ id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tournaments');
    });

    if (!user) {
      return () => {
        unsubGlobal();
        unsubTournaments();
      };
    }
    console.log('MainContent: Initializing match listeners...');
    
    // Matches created by user
    const qLive = query(collection(db, 'matches'), where('status', '==', 'live'), where('createdBy', '==', user.uid));
    const qRecent = query(collection(db, 'matches'), where('status', '==', 'completed'), where('createdBy', '==', user.uid));
    
    const unsubLive = onSnapshot(qLive, (snap) => {
      const matchData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchData);
      matchData.forEach(m => fetchTeamNames(m));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });

    const unsubRecent = onSnapshot(qRecent, (snap) => {
      const matchData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentMatches(matchData);
      matchData.forEach(m => fetchTeamNames(m));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });

    // Matches where user is a player
    const qPlayer = query(
      collection(db, 'players'), 
      user.phoneNumber 
        ? where('phoneNumber', '==', user.phoneNumber)
        : where('email', '==', user.email)
    );
    const unsubPlayer = onSnapshot(qPlayer, (snap) => {
      if (!snap.empty) {
        const playerId = snap.docs[0].id;
        const qTeams = query(collection(db, 'teams'), where('players', 'array-contains', playerId));
        onSnapshot(qTeams, (teamSnap) => {
          const teamIds = teamSnap.docs.map(d => d.id);
          setUserTeamIds(teamIds);
          
          // Fetch matches for these teams
          if (teamIds.length > 0) {
            const qTeamMatches = query(collection(db, 'matches'), where('status', 'in', ['live', 'completed']));
            onSnapshot(qTeamMatches, (matchSnap) => {
              const allMatches = matchSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
              const participantMatches = allMatches.filter(m => 
                teamIds.includes(m.teamA) || teamIds.includes(m.teamB)
              );
              
              const liveParticipant = participantMatches.filter(m => m.status === 'live');
              const recentParticipant = participantMatches.filter(m => m.status === 'completed');
              
              setMatches(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMatches = liveParticipant.filter(m => !existingIds.has(m.id));
                return [...prev, ...newMatches];
              });
              
              setRecentMatches(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMatches = recentParticipant.filter(m => !existingIds.has(m.id));
                return [...prev, ...newMatches];
              });

              participantMatches.forEach(m => fetchTeamNames(m));
            });
          }
        });
      }
    });

    // Notifications Listener
    const qNotif = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => { unsubLive(); unsubRecent(); unsubGlobal(); unsubNotif(); unsubPlayer(); unsubTournaments(); };
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
    return <Login onLoginSuccess={() => setView('main')} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderPage = () => {
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
    if (view === 'start-match') return <StartMatch onBack={() => setView('main')} onStart={(id) => { setActiveMatchId(id); setView('scorer'); }} />;
    if (view === 'create-tournament') return <CreateTournament onBack={() => setView('main')} />;
    if (view === 'tournamentDetails' && activeTournamentId) return (
      <TournamentDetails
        tournamentId={activeTournamentId}
        onBack={() => setView('main')}
        onTeamClick={(id) => { setActiveMatchId(id); setView('teamDetails'); }}
        onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }}
        onMatchClick={(id) => { setActiveMatchId(id); setView('matchDetails'); }}
      />
    );
    if (view === 'scorer' && activeMatchId) return <Scorer matchId={activeMatchId} onBack={() => setView('main')} />;
    if (view === 'matchDetails' && activeMatchId) return <MatchDetails matchId={activeMatchId} onBack={() => setView('main')} />;
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

    const handleMatchClick = (id: string) => {
      const match = matches.find(m => m.id === id);
      setActiveMatchId(id);
      if (match && match.status === 'live') {
        setView('scorer');
      } else {
        setView('matchDetails');
      }
    };

    switch (activeTab) {
      case 'home': return <Home onStartMatch={() => setView('start-match')} onMatchClick={handleMatchClick} matches={matches} recentMatches={recentMatches} globalMatches={globalMatches} teams={teams} tournaments={tournaments} userTeamIds={userTeamIds} />;
      case 'teams': return (
        <Teams 
          onCreateTeam={() => setView('create-team')} 
          onCreatePlayer={() => setView('create-player')} 
          liveMatches={globalMatches}
          onTeamClick={(id) => { setActiveMatchId(id); setView('teamDetails'); }}
        />
      );
      case 'tournaments': return <Tournaments onCreateTournament={() => setView('create-tournament')} onTournamentClick={(id) => { setActiveTournamentId(id); setView('tournamentDetails'); }} />;
      case 'leaderboard': return <Leaderboard onPlayerClick={(id) => { setActiveMatchId(id); setView('playerDetails'); }} />;
      case 'profile': return <Profile />;
      default: return <Home onStartMatch={() => setView('start-match')} onMatchClick={handleMatchClick} matches={matches} recentMatches={recentMatches} globalMatches={globalMatches} teams={teams} tournaments={tournaments} userTeamIds={userTeamIds} />;
    }
  };

  const titles: Record<string, string> = {
    home: 'Score Wala',
    teams: 'My Teams',
    tournaments: 'Tournaments',
    leaderboard: 'Leaderboard',
    profile: 'My Profile',
  };

  return (
    <div className={`min-h-screen bg-gray-50 font-sans selection:bg-yellow-200 ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <Header 
        title={titles[activeTab] || 'Score Wala'} 
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
                <MenuLink icon={History} label="Match History" onClick={() => { setView('history'); setIsMenuOpen(false); }} />
                <MenuLink icon={Users} label="My Teams" onClick={() => { setActiveTab('teams'); setIsMenuOpen(false); }} />
                <MenuLink icon={Trophy} label="My Tournaments" onClick={() => { setActiveTab('tournaments'); setIsMenuOpen(false); }} />
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
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />

      <NotificationList 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNotificationClick={(id) => { setActiveMatchId(id); setView('matchDetails'); }}
      />
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
