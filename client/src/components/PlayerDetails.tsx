import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Target, Zap, Award, Medal, History, ChevronRight, Share2 } from 'lucide-react';
import { Player, Match } from '../types';

export const PlayerDetails = ({ playerId, onBack, onMatchClick }: { 
  playerId: string, 
  onBack: () => void,
  onMatchClick: (id: string) => void
}) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPlayer = onSnapshot(doc(db, 'players', playerId), (snap) => {
      if (snap.exists()) {
        setPlayer({ id: snap.id, ...snap.data() } as Player);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `players/${playerId}`);
    });

    // Fetch match history for this player. We filter client-side because player IDs live in match.playerStats map keys.
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(100));
    const unsubMatches = onSnapshot(q, (snap) => {
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const playerHistory = matches.filter(m => (m as any).playerStats?.[playerId]);
      setRecentMatches(playerHistory);

      const uniqueTeamIds = Array.from(new Set(playerHistory.flatMap((match: any) => [match.teamA, match.teamB])));
      Promise.all(uniqueTeamIds.map(async (teamId) => {
        const teamSnap = await getDoc(doc(db, 'teams', teamId as string));
        return { teamId, name: teamSnap.exists() ? teamSnap.data().name : 'Team' };
      })).then((resolvedTeams) => {
        setTeamNames(Object.fromEntries(resolvedTeams.map((team) => [team.teamId, team.name])));
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'matches');
    });

    return () => { unsubPlayer(); unsubMatches(); };
  }, [playerId]);

  if (loading || !player) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = {
    matches: player.stats?.matches || 0,
    runs: player.stats?.runs || 0,
    wickets: player.stats?.wickets || 0,
    highestScore: player.stats?.highestScore || 0,
    bestBowling: player.stats?.bestBowling || '0/0',
    fours: player.stats?.fours || 0,
    sixes: player.stats?.sixes || 0,
    balls: player.stats?.balls || 0,
    ballsBowled: player.stats?.ballsBowled || 0,
    runsConceded: player.stats?.runsConceded || 0
  };

  const battingAvg = stats.matches > 0 ? (stats.runs / stats.matches).toFixed(2) : "0.00";
  const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0";
  const economy = stats.ballsBowled > 0 ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-yellow-500 p-6 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Player Profile</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">Arena Stats</p>
          </div>
        </div>
        <button className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
          <Share2 size={20} />
        </button>
      </div>

      <div className="bg-yellow-500 px-6 pb-12 flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-[3rem] bg-white border-4 border-white overflow-hidden shadow-2xl rotate-3">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} 
            alt="Profile" 
            className="w-full h-full object-cover -rotate-3" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-black italic uppercase tracking-tighter">{player.name}</h1>
          <p className="text-black/60 font-bold text-sm uppercase tracking-widest mt-1">{player.role} • {player.battingStyle || 'Right Hand Bat'}</p>
        </div>
      </div>

      <div className="px-4 -mt-8 flex flex-col gap-6">
        <div className="bg-black text-white rounded-[3rem] shadow-2xl p-8 grid grid-cols-3 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full -mr-32 -mt-32" />
          <StatBox label="Matches" value={String(stats.matches)} />
          <StatBox label="Runs" value={String(stats.runs)} />
          <StatBox label="Wickets" value={String(stats.wickets)} />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Target size={14} className="text-yellow-500" /> Batting Performance
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
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Highest Score</p>
              <p className="text-xl font-black text-black italic">{stats.highestScore}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fours / Sixes</p>
              <p className="text-xl font-black text-black italic">{stats.fours} / {stats.sixes}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Zap size={14} className="text-yellow-500" /> Bowling Performance
          </h3>
          <div className="bg-black text-white rounded-3xl p-6 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Economy</p>
              <p className="text-3xl font-black text-yellow-500 italic leading-none">{economy}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Best Figures</p>
              <p className="text-xl font-black text-white italic">{stats.bestBowling}</p>
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

        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <History size={14} className="text-yellow-500" /> Recent Performances
          </h3>
          {recentMatches.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No recent matches found</p>
            </div>
          ) : (
            recentMatches.map(match => (
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                key={match.id}
                onClick={() => onMatchClick(match.id)}
                className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm flex items-center justify-between group text-left"
              >
                <div className="flex flex-col gap-4 text-left flex-1">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-yellow-700 uppercase tracking-[0.2em]">
                      {match.status === 'live' ? 'Live Match' : 'Completed Match'}
                    </p>
                    <h4 className="font-black italic uppercase tracking-tighter text-gray-900">
                      {teamNames[match.teamA] || 'Team A'} vs {teamNames[match.teamB] || 'Team B'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-yellow-50 border border-yellow-100 px-3 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-700">Runs</p>
                      <p className="mt-1 text-xl font-black italic text-gray-900">{match.playerStats[playerId].runs}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Balls</p>
                      <p className="mt-1 text-xl font-black italic text-gray-900">{match.playerStats[playerId].balls}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Wickets</p>
                      <p className="mt-1 text-xl font-black italic text-gray-900">{match.playerStats[playerId].wickets}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Runs Given</p>
                      <p className="mt-1 text-xl font-black italic text-gray-900">{match.playerStats[playerId].runsConceded}</p>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-200 group-hover:text-yellow-500 transition-colors" />
              </motion.button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string, value: string }) => (
  <div className="text-center relative z-10">
    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-white italic">{value}</p>
  </div>
);

const StatRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500 font-bold uppercase tracking-tight">{label}</span>
    <span className="text-lg font-black text-gray-900 italic">{value}</span>
  </div>
);
