import { useState, useEffect } from 'react';
import { db, doc, updateDoc, collection, addDoc, onSnapshot, auth, getDoc, handleFirestoreError, OperationType, getDocs, query, where, orderBy, increment, deleteDoc, limit, serverTimestamp } from '../firebase';
import { ArrowLeft, ChevronRight, User, Settings2, History, CheckCircle2, Search, RotateCcw, XCircle, AlertCircle, Trophy, Star, Target } from 'lucide-react';
import { Match, Team, Player } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MilestonePoster } from './MilestonePoster';

const PlayerSelectionModal = ({ 
  isOpen, 
  onClose, 
  players, 
  onSelect, 
  title,
  selectedIds = [],
  onAddPlayer
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  players: Player[], 
  onSelect: (id: string) => void, 
  title: string,
  selectedIds?: string[],
  onAddPlayer?: (name: string) => void
}) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { onClose(); setIsAdding(false); }}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">{title}</h3>
                {!isAdding && onAddPlayer && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100"
                  >
                    + Add Player
                  </button>
                )}
              </div>

              {isAdding ? (
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter player name..."
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 uppercase text-[10px] tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (newName.trim()) {
                          onAddPlayer(newName.trim());
                          setIsAdding(false);
                          setNewName('');
                        }
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-black bg-yellow-500 uppercase text-[10px] tracking-widest shadow-lg shadow-yellow-500/20"
                    >
                      Add & Select
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search player..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
                  />
                </div>
              )}
            </div>
            
            {!isAdding && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {filtered.map(player => (
                  <button
                    key={player.id}
                    onClick={() => { onSelect(player.id); onClose(); }}
                    disabled={selectedIds.includes(player.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      selectedIds.includes(player.id) ? 'opacity-40 bg-gray-50' : 'bg-white border-gray-100 hover:border-yellow-500 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center font-bold text-yellow-600">
                        {player.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
                      </div>
                    </div>
                    {selectedIds.includes(player.id) && <CheckCircle2 size={20} className="text-gray-400" />}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-12 opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest">No players found</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const WicketModal = ({ 
  isOpen, 
  onClose, 
  onSelect,
  players
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSelect: (type: string, fielderId?: string) => void,
  players: Player[]
}) => {
  const [wicketType, setWicketType] = useState('');
  const [fielderId, setFielderId] = useState('');

  const types = [
    { id: 'bowled', label: 'Bowled' },
    { id: 'caught', label: 'Caught' },
    { id: 'lbw', label: 'LBW' },
    { id: 'run-out', label: 'Run Out' },
    { id: 'stumped', label: 'Stumped' },
    { id: 'hit-wicket', label: 'Hit Wicket' },
    { id: 'retired-hurt', label: 'Retired Hurt' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] p-6 flex flex-col gap-6"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">How was the wicket?</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setWicketType(t.id)}
                  className={`py-4 rounded-2xl font-bold text-sm transition-all border ${
                    wicketType === t.id ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(wicketType === 'caught' || wicketType === 'run-out' || wicketType === 'stumped') && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Fielder</p>
                <select 
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                >
                  <option value="">Select Fielder</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => { onSelect(wicketType, fielderId); onClose(); }}
              disabled={!wicketType}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest disabled:opacity-50"
            >
              Confirm Wicket
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ExtrasModal = ({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSelect: (type: string, runs: number) => void 
}) => {
  const [type, setType] = useState('bye');
  const [runs, setRuns] = useState(0);

  const types = [
    { id: 'bye', label: 'Bye' },
    { id: 'leg-bye', label: 'Leg Bye' },
    { id: 'penalty', label: 'Penalty' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] p-6 flex flex-col gap-6"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">Select Extra Type</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`py-4 rounded-2xl font-bold text-xs transition-all border ${
                    type === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Runs</p>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map(r => (
                  <button
                    key={r}
                    onClick={() => setRuns(r)}
                    className={`py-3 rounded-xl font-black text-lg transition-all border ${
                      runs === r ? 'bg-black text-white' : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onSelect(type, runs); onClose(); }}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest"
            >
              Add Extras
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const Scorer = ({ matchId, onBack }: { matchId: string, onBack: () => void }) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [battingPlayers, setBattingPlayers] = useState<Player[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [recentBalls, setRecentBalls] = useState<any[]>([]);
  const [selectionType, setSelectionType] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{
    player: { name: string; team: string };
    milestone: { type: 'runs' | 'wickets'; value: number; matchInfo: string };
  } | null>(null);
  const [shownMilestones, setShownMilestones] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // The match listener will trigger fetchTeamData automatically
    // but we can force a re-fetch of team data if needed
    setIsRefreshing(false);
  };
  const [extraMode, setExtraMode] = useState<'wide' | 'no-ball' | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const q = query(
      collection(db, 'matches', matchId, 'balls'),
      orderBy('timestamp', 'desc'),
      where('innings', '==', match?.currentInnings || 1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentBalls(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 6).reverse());
    });
    return () => unsub();
  }, [matchId, match?.currentInnings]);

  useEffect(() => {
    console.log('Scorer: Initializing match listener for:', matchId);
    const unsub = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (snap.exists()) {
        console.log('Scorer: Match data received');
        const data = snap.data() as Match;
        setMatch({ id: snap.id, ...data });
        
        // Fetch teams and their players
        const fetchTeamData = async () => {
          try {
            const [sA, sB] = await Promise.all([
              getDoc(doc(db, 'teams', data.teamA)),
              getDoc(doc(db, 'teams', data.teamB))
            ]);

            if (sA.exists()) setTeamA({ id: sA.id, ...sA.data() } as Team);
            if (sB.exists()) setTeamB({ id: sB.id, ...sB.data() } as Team);

            const battingTeamId = data.currentInnings === 1 ? data.teamA : data.teamB;
            const bowlingTeamId = data.currentInnings === 1 ? data.teamB : data.teamA;

            const [battingSnap, bowlingSnap] = await Promise.all([
              getDocs(query(collection(db, 'players'), where('createdBy', '==', data.createdBy))),
              getDocs(query(collection(db, 'players'), where('createdBy', '==', auth.currentUser?.uid)))
            ]);

            const tAData = sA.data() as Team;
            const tBData = sB.data() as Team;
            
            // Combine players from both match creator and current user
            const allPlayersMap = new Map<string, Player>();
            battingSnap.docs.forEach(d => allPlayersMap.set(d.id, { id: d.id, ...d.data() } as Player));
            bowlingSnap.docs.forEach(d => allPlayersMap.set(d.id, { id: d.id, ...d.data() } as Player));
            
            const allPlayers = Array.from(allPlayersMap.values());
            console.log('Scorer: Total unique players fetched:', allPlayers.length);
            
            const currentBattingTeamPlayers = (data.currentInnings === 1 ? tAData.players : tBData.players) || [];
            const currentBowlingTeamPlayers = (data.currentInnings === 1 ? tBData.players : tAData.players) || [];

            const bPlayers = allPlayers.filter(p => currentBattingTeamPlayers.includes(p.id));
            const boPlayers = allPlayers.filter(p => currentBowlingTeamPlayers.includes(p.id));
            
            // If we still have missing players, try to fetch them by ID
            if (bPlayers.length < currentBattingTeamPlayers.length || boPlayers.length < currentBowlingTeamPlayers.length) {
              console.log('Scorer: Some players missing, fetching by ID...');
              const missingIds = [...currentBattingTeamPlayers, ...currentBowlingTeamPlayers].filter(id => !allPlayersMap.has(id));
              
              // Fetch missing players in chunks of 10 (Firestore limit for 'in' query)
              for (let i = 0; i < missingIds.length; i += 10) {
                const chunk = missingIds.slice(i, i + 10);
                const missingSnap = await getDocs(query(collection(db, 'players'), where('__name__', 'in', chunk)));
                missingSnap.docs.forEach(d => {
                  const p = { id: d.id, ...d.data() } as Player;
                  allPlayersMap.set(d.id, p);
                });
              }
              
              const updatedAllPlayers = Array.from(allPlayersMap.values());
              setBattingPlayers(updatedAllPlayers.filter(p => currentBattingTeamPlayers.includes(p.id)));
              setBowlingPlayers(updatedAllPlayers.filter(p => currentBowlingTeamPlayers.includes(p.id)));
            } else {
              setBattingPlayers(bPlayers);
              setBowlingPlayers(boPlayers);
            }

          } catch (err) {
            console.error('Scorer: Error fetching team/player data:', err);
          }
        };

        fetchTeamData();
      } else {
        console.error('Scorer: Match not found:', matchId);
      }
      setLoading(false);
    }, (error) => {
      console.error('Scorer: Error in match listener:', error);
      handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
    });
    return () => unsub();
  }, [matchId]);

  const updateMatchPlayer = async (type: 'striker' | 'nonStriker' | 'bowler', playerId: string) => {
    if (!match) return;
    console.log(`Scorer: Updating ${type} to ${playerId}`);
    
    // Find player name
    const player = (type === 'bowler' ? bowlingPlayers : battingPlayers).find(p => p.id === playerId);
    const playerName = player ? player.name : 'Unknown';

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        [type]: playerId,
        [`${type}Name`]: playerName
      });
      console.log(`Scorer: ${type} updated successfully`);
    } catch (error) {
      console.error(`Scorer: Error updating ${type}:`, error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleQuickAddPlayer = async (name: string) => {
    if (!match || !auth.currentUser) return;
    
    try {
      // 1. Create the player
      const playerRef = await addDoc(collection(db, 'players'), {
        name,
        role: 'All-rounder',
        stats: { runs: 0, wickets: 0, matches: 0, average: 0, strikeRate: 0, economy: 0 },
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      } as any);

      // 2. Add to the correct team squad
      const battingTeamId = match.currentInnings === 1 ? match.teamA : match.teamB;
      const bowlingTeamId = match.currentInnings === 1 ? match.teamB : match.teamA;
      const targetTeamId = (selectionType === 'striker' || selectionType === 'nonStriker') ? battingTeamId : bowlingTeamId;

      const teamRef = doc(db, 'teams', targetTeamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const teamData = teamSnap.data() as Team;
        const updatedPlayers = [...(teamData.players || []), playerRef.id];
        await updateDoc(teamRef, { players: updatedPlayers });
      }

      // 3. Select the player automatically
      if (selectionType) {
        await updateMatchPlayer(selectionType, playerRef.id);
      }
      
      setSelectionType(null);
    } catch (error) {
      console.error('Error quick adding player:', error);
      handleFirestoreError(error, OperationType.CREATE, 'players');
    }
  };

  useEffect(() => {
    if (match?.status === 'completed') {
      finalizeMatchStats();
    }
  }, [match?.status]);

  const finalizeMatchStats = async () => {
    if (!match || match.status !== 'completed' || (match as any).statsFinalized) return;

    const playerStats = match.playerStats || {};
    const playerIds = Object.keys(playerStats);

    try {
      for (const playerId of playerIds) {
        const stats = playerStats[playerId];
        const playerRef = doc(db, 'players', playerId);
        
        // Fetch current player to update highest score
        const playerSnap = await getDoc(playerRef);
        const currentStats = playerSnap.exists() ? (playerSnap.data().stats || {}) : {};
        
        const newRuns = (currentStats.runs || 0) + (stats.runs || 0);
        const newMatches = (currentStats.matches || 0) + 1;
        const newBalls = (currentStats.balls || 0) + (stats.balls || 0);
        const newWickets = (currentStats.wickets || 0) + (stats.wickets || 0);
        const newBallsBowled = (currentStats.ballsBowled || 0) + (stats.ballsBowled || 0);
        const newRunsConceded = (currentStats.runsConceded || 0) + (stats.runsConceded || 0);
        
        const average = newMatches > 0 ? (newRuns / newMatches) : 0;
        const strikeRate = newBalls > 0 ? ((newRuns / newBalls) * 100) : 0;
        const economy = newBallsBowled > 0 ? ((newRunsConceded / newBallsBowled) * 6) : 0;

        const isFifty = stats.runs >= 50 && stats.runs < 100;
        const isCentury = stats.runs >= 100;

        await updateDoc(playerRef, {
          'stats.matches': newMatches,
          'stats.runs': newRuns,
          'stats.wickets': newWickets,
          'stats.fours': increment(stats.fours || 0),
          'stats.sixes': increment(stats.sixes || 0),
          'stats.fifties': increment(isFifty ? 1 : 0),
          'stats.centuries': increment(isCentury ? 1 : 0),
          'stats.balls': newBalls,
          'stats.ballsBowled': newBallsBowled,
          'stats.runsConceded': newRunsConceded,
          'stats.average': average,
          'stats.strikeRate': strikeRate,
          'stats.economy': economy,
          'stats.highestScore': Math.max(currentStats.highestScore || 0, stats.runs || 0)
        });
      }

      await updateDoc(doc(db, 'matches', matchId), {
        statsFinalized: true
      });
    } catch (error) {
      console.error('Error finalizing match stats:', error);
    }
  };

  const handleRun = async (runs: number, isExtra: boolean = false, extraType?: string) => {
    if (!match) return;

    if (!match.striker || !match.nonStriker || !match.bowler) {
      alert('Please select striker, non-striker and bowler first!');
      return;
    }

    const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentScoreKey];

    let newRuns = currentScore.runs;
    let newBalls = currentScore.balls;
    let newOvers = currentScore.overs;
    let newExtras = currentScore.extras;

    const isLegalBall = !isExtra || extraType === 'bye' || extraType === 'leg-bye';

    if (isLegalBall) {
      newBalls += 1;
      if (newBalls === 6) {
        newOvers += 1;
        newBalls = 0;
      }
    }

    if (isExtra) {
      const extraRuns = (extraType === 'wide' || extraType === 'no-ball') ? (runs + 1) : runs;
      newExtras += extraRuns;
      newRuns += extraRuns;
    } else {
      newRuns += runs;
    }

    // Update Player Stats
    const playerStats = { ...(match.playerStats || {}) };
    const strikerId = match.striker;
    const nonStrikerId = match.nonStriker;
    const bowlerId = match.bowler;

    if (strikerId) {
      const stats = { ...(playerStats[strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      const facesBall = !isExtra || extraType === 'no-ball' || extraType === 'bye' || extraType === 'leg-bye';
      const getsRuns = !isExtra || extraType === 'no-ball';

      if (facesBall) stats.balls += 1;
      if (getsRuns) {
        stats.runs += runs;
        if (runs === 4) stats.fours += 1;
        if (runs === 6) stats.sixes += 1;
      }
      playerStats[strikerId] = stats;
    }

    if (bowlerId) {
      const stats = { ...(playerStats[bowlerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) {
        stats.ballsBowled += 1;
        if (stats.ballsBowled === 6) {
          stats.overs += 1;
          stats.ballsBowled = 0;
        }
      }
      
      if (isExtra) {
        if (extraType === 'wide' || extraType === 'no-ball') {
          stats.runsConceded += (runs + 1);
        }
      } else {
        stats.runsConceded += runs;
      }
      playerStats[bowlerId] = stats;
    }

    // Milestone Check for Batsman
    if (strikerId && !isExtra) {
      const stats = playerStats[strikerId];
      const oldRuns = stats.runs - runs;
      const newRunsTotal = stats.runs;
      
      const checkMilestone = (val: number) => {
        if (oldRuns < val && newRunsTotal >= val && !shownMilestones.has(`${strikerId}-runs-${val}`)) {
          setMilestoneData({
            player: { name: match.strikerName || 'Batsman', team: battingTeam.name },
            milestone: { 
              type: 'runs', 
              value: val, 
              matchInfo: `${match.teamA} vs ${match.teamB}` 
            }
          });
          setShownMilestones(prev => new Set(prev).add(`${strikerId}-runs-${val}`));
        }
      };

      checkMilestone(50);
      checkMilestone(100);
      checkMilestone(150);
      checkMilestone(200);
    }

    // Striker Swapping
    let newStriker = strikerId;
    let newNonStriker = nonStrikerId;

    // Swap on odd runs (only if runs off bat)
    const runsOffBat = !isExtra || extraType === 'no-ball';
    if (runsOffBat && runs % 2 !== 0) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    // Swap on over end
    if (isLegalBall && newBalls === 0) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    try {
      const isMatchOver = match.currentInnings === 2 && 
        (newRuns > match.scoreA.runs || (newOvers === match.overs && newBalls === 0));
      
      const isInningsOver = match.currentInnings === 1 && 
        (newOvers === match.overs && newBalls === 0);

      if (isInningsOver) {
        console.log('Scorer: Innings over, resetting players');
        newStriker = null;
        newNonStriker = null;
      }

      const recentBalls = [...(match.recentBalls || [])];
      recentBalls.push({ runs, isExtra, extraType: extraType || null, isWicket: false });
      if (recentBalls.length > 12) recentBalls.shift();

      await updateDoc(doc(db, 'matches', matchId), {
        [currentScoreKey]: {
          ...currentScore,
          runs: newRuns,
          balls: newBalls,
          overs: newOvers,
          extras: newExtras
        },
        status: isMatchOver ? 'completed' : 'live',
        currentInnings: isInningsOver ? 2 : match.currentInnings,
        playerStats,
        recentBalls,
        striker: newStriker,
        strikerName: newStriker === strikerId ? (match.strikerName || null) : (newStriker === nonStrikerId ? (match.nonStrikerName || null) : null),
        nonStriker: newNonStriker,
        nonStrikerName: newNonStriker === nonStrikerId ? (match.nonStrikerName || null) : (newNonStriker === strikerId ? (match.strikerName || null) : null),
        bowler: isInningsOver ? null : (bowlerId || null),
        bowlerName: isInningsOver ? null : (match.bowlerName || null)
      });

      // Record ball
      await addDoc(collection(db, 'matches', matchId, 'balls'), {
        innings: match.currentInnings,
        over: isLegalBall && newBalls === 0 ? newOvers - 1 : newOvers,
        ball: isLegalBall && newBalls === 0 ? 6 : newBalls,
        runs,
        extraType: extraType || null,
        batsman: strikerId || null,
        bowler: bowlerId || null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating score:', error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleWicket = async (type: string = 'bowled', fielderId?: string) => {
    if (!match) return;
    
    if (!match.striker || !match.bowler) {
      alert('Please select striker and bowler first!');
      return;
    }

    const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentScoreKey];

    const newWickets = currentScore.wickets + 1;
    const isLegalBall = type !== 'retired-hurt'; // Retired hurt doesn't count as a ball in some formats, but usually it's not a wicket either. Let's assume it's a wicket for simplicity.
    
    let newBalls = currentScore.balls;
    let newOvers = currentScore.overs;

    if (isLegalBall) {
      newBalls += 1;
      if (newBalls === 6) {
        newOvers += 1;
        newBalls = 0;
      }
    }

    const isAllOut = newWickets === 10;
    const isMatchOver = match.currentInnings === 2 && (isAllOut || (newOvers === match.overs && newBalls === 0));
    const isInningsOver = match.currentInnings === 1 && (isAllOut || (newOvers === match.overs && newBalls === 0));

    // Update Player Stats
    const playerStats = { ...(match.playerStats || {}) };
    const strikerId = match.striker;
    const bowlerId = match.bowler;

    if (strikerId) {
      const stats = { ...(playerStats[strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) stats.balls += 1;
      playerStats[strikerId] = stats;
    }

    if (bowlerId && type !== 'run-out' && type !== 'retired-hurt') {
      const stats = { ...(playerStats[bowlerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) {
        stats.ballsBowled += 1;
        if (stats.ballsBowled === 6) {
          stats.overs += 1;
          stats.ballsBowled = 0;
        }
      }
      stats.wickets += 1;
      playerStats[bowlerId] = stats;

      // Milestone Check for Bowler
      const checkWicketMilestone = (val: number) => {
        if (stats.wickets === val && !shownMilestones.has(`${bowlerId}-wickets-${val}`)) {
          setMilestoneData({
            player: { name: match.bowlerName || 'Bowler', team: bowlingTeam.name },
            milestone: { 
              type: 'wickets', 
              value: val, 
              matchInfo: `${match.teamA} vs ${match.teamB}` 
            }
          });
          setShownMilestones(prev => new Set(prev).add(`${bowlerId}-wickets-${val}`));
        }
      };

      checkWicketMilestone(3);
      checkWicketMilestone(4);
      checkWicketMilestone(5);
      checkWicketMilestone(6);
      checkWicketMilestone(7);
    }

    const fallOfWickets = [...(match.fallOfWickets || [])];
    if (strikerId) {
      fallOfWickets.push({
        player: strikerId,
        type,
        bowler: bowlerId || 'Unknown',
        fielder: fielderId || null,
        score: currentScore.runs,
        balls: currentScore.balls + (currentScore.overs * 6),
        innings: match.currentInnings
      });
    }

    const recentBalls = [...(match.recentBalls || [])];
    recentBalls.push({ runs: 0, isWicket: true, wicketType: type });
    if (recentBalls.length > 12) recentBalls.shift();

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        [currentScoreKey]: {
          ...currentScore,
          wickets: newWickets,
          balls: newBalls,
          overs: newOvers
        },
        status: isMatchOver ? 'completed' : 'live',
        currentInnings: isInningsOver ? 2 : match.currentInnings,
        playerStats,
        fallOfWickets,
        recentBalls,
        striker: null,
        strikerName: null,
        nonStriker: isInningsOver ? null : (match.nonStriker || null),
        nonStrikerName: isInningsOver ? null : (match.nonStrikerName || null),
        bowler: isInningsOver ? null : (match.bowler || null),
        bowlerName: isInningsOver ? null : (match.bowlerName || null)
      });

      // Record ball as wicket
      await addDoc(collection(db, 'matches', matchId, 'balls'), {
        innings: match.currentInnings,
        over: newBalls === 0 && isLegalBall ? newOvers - 1 : newOvers,
        ball: newBalls === 0 && isLegalBall ? 6 : newBalls,
        runs: 0,
        wicket: { type, player: strikerId || null, fielder: fielderId || null },
        batsman: strikerId || null,
        bowler: bowlerId || null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording wicket:', error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const undoLastBall = async () => {
    if (!match) return;
    try {
      const q = query(
        collection(db, 'matches', matchId, 'balls'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const lastBall = snap.docs[0].data();
      const lastBallId = snap.docs[0].id;

      // Reverse the score logic (simplified)
      const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
      const currentScore = match[currentScoreKey];
      
      let newRuns = currentScore.runs - (lastBall.runs || 0);
      let newWickets = currentScore.wickets - (lastBall.wicket ? 1 : 0);
      let newBalls = currentScore.balls;
      let newOvers = currentScore.overs;
      let newExtras = currentScore.extras - (lastBall.extraType ? (lastBall.runs || 1) : 0);

      const isLegalBall = !lastBall.extraType || lastBall.extraType === 'bye' || lastBall.extraType === 'leg-bye';
      if (isLegalBall) {
        if (newBalls === 0) {
          newOvers -= 1;
          newBalls = 5;
        } else {
          newBalls -= 1;
        }
      }

      // In a real app, you'd also reverse player stats. 
      // For this demo, we'll just update the main score and delete the ball.
      
      await updateDoc(doc(db, 'matches', matchId), {
        [currentScoreKey]: {
          ...currentScore,
          runs: Math.max(0, newRuns),
          wickets: Math.max(0, newWickets),
          balls: newBalls,
          overs: newOvers,
          extras: Math.max(0, newExtras)
        }
      });

      await deleteDoc(doc(db, 'matches', matchId, 'balls', lastBallId));
      console.log('Last ball undone');
    } catch (error) {
      console.error('Error undoing ball:', error);
    }
  };

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const battingTeam = match.currentInnings === 1 ? teamA : teamB;
  const bowlingTeam = match.currentInnings === 1 ? teamB : teamA;
  const currentScore = match.currentInnings === 1 ? match.scoreA : match.scoreB;

  const striker = battingPlayers.find(p => p.id === match.striker);
  const nonStriker = battingPlayers.find(p => p.id === match.nonStriker);
  const bowler = bowlingPlayers.find(p => p.id === match.bowler);

  const strikerStats = match.playerStats?.[match.striker || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = match.playerStats?.[match.nonStriker || ''] || { runs: 0, balls: 0 };
  const bowlerStats = match.playerStats?.[match.bowler || ''] || { overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 };

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <PlayerSelectionModal
        isOpen={selectionType !== null}
        onClose={() => setSelectionType(null)}
        title={selectionType === 'bowler' ? 'Select Bowler' : 'Select Batsman'}
        players={selectionType === 'bowler' ? bowlingPlayers : battingPlayers}
        onSelect={(id) => selectionType && updateMatchPlayer(selectionType, id)}
        selectedIds={selectionType === 'striker' ? [match.nonStriker || ''] : selectionType === 'nonStriker' ? [match.striker || ''] : []}
        onAddPlayer={handleQuickAddPlayer}
      />
      <WicketModal
        isOpen={isWicketModalOpen}
        onClose={() => setIsWicketModalOpen(false)}
        onSelect={handleWicket}
        players={bowlingPlayers}
      />
      <ExtrasModal
        isOpen={isExtrasModalOpen}
        onClose={() => setIsExtrasModalOpen(false)}
        onSelect={(type, runs) => handleRun(runs, true, type)}
      />
      {match.status === 'completed' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-500 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center gap-6 max-w-xs w-full border-4 border-black"
          >
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12">
              <Trophy size={48} className="text-yellow-500 -rotate-12" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-black leading-none">Match Over!</h2>
              <div className="h-1 w-12 bg-black mx-auto rounded-full mt-2" />
            </div>
            <div className="bg-black/5 p-6 rounded-[2rem] border border-black/10 w-full">
              <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">Congratulations</p>
              <p className="text-2xl font-black italic uppercase tracking-tighter text-black">
                {match.scoreB.runs > match.scoreA.runs ? teamB?.name : teamA?.name} Wins!
              </p>
            </div>
            <button
              onClick={onBack}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
            >
              Back to Home
            </button>
          </motion.div>
        </div>
      )}
      {milestoneData && (
        <MilestonePoster
          isOpen={!!milestoneData}
          onClose={() => setMilestoneData(null)}
          player={milestoneData.player}
          milestone={milestoneData.milestone}
        />
      )}
      <div className="bg-yellow-500 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tight leading-none">{teamA.name} vs {teamB.name}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60 mt-1">{match.overs} Overs Match</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            className={`p-2 hover:bg-yellow-600 rounded-full transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={undoLastBall}
            className="p-2 hover:bg-yellow-600 rounded-full transition-colors"
            title="Undo Last Ball"
          >
            <History size={20} />
          </button>
          <button className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-black text-white p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">{battingTeam.name} Innings</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black italic">{currentScore.runs}-{currentScore.wickets}</span>
              <span className="text-lg font-bold text-gray-400">({currentScore.overs}.{currentScore.balls})</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Extras</p>
            <p className="text-lg font-bold">{currentScore.extras}</p>
          </div>
        </div>
        
        <div className="h-px bg-white/10" />
        
        <div className="flex justify-between text-sm font-medium text-gray-400">
          <div className="flex gap-4">
            <span className="text-yellow-500">CRR: {(currentScore.runs / (currentScore.overs + currentScore.balls/6) || 0).toFixed(2)}</span>
          </div>
          {match.currentInnings === 2 && (
            <span className="text-white font-bold">Target: {match.scoreA.runs + 1}</span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Warning if no players */}
        {(battingPlayers.length === 0 || bowlingPlayers.length === 0) && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-black text-red-600 uppercase tracking-tight">No Players Found</p>
              <p className="text-[10px] text-red-500 font-bold mt-1">
                The teams don't have any players assigned. Use the "+ Add Player" button in the selection modal to add players.
              </p>
            </div>
          </div>
        )}

        {/* Recent Balls Visualization */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Over</h3>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Live</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {recentBalls.map((ball, i) => (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={ball.id || i}
                className={`min-w-[40px] h-10 rounded-full flex items-center justify-center font-black text-xs shadow-sm border-2 ${
                  ball.wicket ? 'bg-red-600 text-white border-red-700' :
                  ball.runs === 4 ? 'bg-green-500 text-white border-green-600' :
                  ball.runs === 6 ? 'bg-purple-600 text-white border-purple-700' :
                  ball.extraType === 'wide' ? 'bg-blue-500 text-white border-blue-600' :
                  ball.extraType === 'no-ball' ? 'bg-orange-500 text-white border-orange-600' :
                  ball.extraType ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {ball.wicket ? 'W' : 
                 ball.extraType === 'wide' ? `${ball.runs + 1}W` :
                 ball.extraType === 'no-ball' ? `${ball.runs + 1}N` :
                 ball.extraType ? `${ball.runs}${ball.extraType[0].toUpperCase()}` : 
                 ball.runs}
              </motion.div>
            ))}
            {/* Empty slots for remaining balls in over */}
            {Array.from({ length: Math.max(0, 6 - recentBalls.filter(b => !b.extraType || b.extraType === 'bye' || b.extraType === 'leg-bye').length) }).map((_, i) => (
              <div key={`empty-${i}`} className="min-w-[40px] h-10 rounded-full border-2 border-dashed border-gray-100" />
            ))}
          </div>
        </div>

        {/* Batsmen & Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button 
            onClick={() => setSelectionType('striker')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!striker ? 'bg-red-50 border border-red-100 animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${striker ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                {striker ? striker.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${striker ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {striker ? `${striker.name}*` : 'SELECT STRIKER'}
              </span>
            </div>
            <span className="font-black text-gray-900">{strikerStats.runs} ({strikerStats.balls})</span>
          </button>
          <div className="h-px bg-gray-50" />
          <button 
            onClick={() => setSelectionType('nonStriker')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!nonStriker ? 'bg-red-50 border border-red-100 animate-pulse opacity-60' : 'opacity-60'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${nonStriker ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-600'}`}>
                {nonStriker ? nonStriker.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${nonStriker ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {nonStriker ? nonStriker.name : 'SELECT NON-STRIKER'}
              </span>
            </div>
            <span className="font-black text-gray-900">{nonStrikerStats.runs} ({nonStrikerStats.balls})</span>
          </button>
        </div>

        {/* Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button 
            onClick={() => setSelectionType('bowler')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!bowler ? 'bg-red-50 border border-red-100 animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${bowler ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                {bowler ? bowler.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${bowler ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {bowler ? bowler.name : 'SELECT BOWLER'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Figures</span>
              <span className="font-black text-gray-900">{bowlerStats.wickets}-{bowlerStats.runsConceded} ({bowlerStats.overs}.{bowlerStats.ballsBowled})</span>
            </div>
          </button>
        </div>

        {/* Ball by Ball History */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This Over</h3>
            <div className="flex gap-2">
              {recentBalls.map((ball, i) => (
                <div 
                  key={ball.id || i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm ${
                    ball.extraType === 'wide' ? 'bg-blue-500 text-white border border-blue-600' :
                    ball.extraType === 'no-ball' ? 'bg-orange-500 text-white border border-orange-600' :
                    ball.runs === 4 ? 'bg-green-500 text-white' :
                    ball.runs === 6 ? 'bg-purple-600 text-white' :
                    ball.extraType ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ball.extraType === 'wide' ? `${ball.runs + 1}W` : 
                   ball.extraType === 'no-ball' ? `${ball.runs + 1}N` : 
                   ball.runs}
                </div>
              ))}
              {recentBalls.length === 0 && <span className="text-xs text-gray-300 italic">No balls yet</span>}
            </div>
          </div>
        </div>

        {/* Scoring Buttons */}
        <div className="flex flex-col gap-4 mt-4">
          <AnimatePresence mode="wait">
            {extraMode ? (
              <motion.div
                key="extra-runs"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-100 p-4 rounded-3xl flex flex-col gap-4 border-2 border-dashed border-gray-300"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-600">
                    Runs on {extraMode === 'wide' ? 'Wide' : 'No Ball'}
                  </h3>
                  <button 
                    onClick={() => setExtraMode(null)}
                    className="text-xs font-black text-red-500 uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map(run => (
                    <button
                      key={run}
                      onClick={() => {
                        handleRun(run, true, extraMode);
                        setExtraMode(null);
                      }}
                      className="h-12 bg-white rounded-xl font-black text-lg shadow-sm border-b-2 border-gray-200 active:scale-90 transition-all"
                    >
                      {run}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal-runs"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="grid grid-cols-4 gap-3"
              >
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <button
                    key={run}
                    onClick={() => handleRun(run)}
                    className={`h-16 rounded-2xl font-black text-xl shadow-sm active:scale-90 transition-all border-b-4 ${
                      run === 4 ? 'bg-green-500 text-white border-green-700' :
                      run === 6 ? 'bg-purple-600 text-white border-purple-800' :
                      'bg-white text-gray-900 border-gray-200'
                    }`}
                  >
                    {run}
                  </button>
                ))}
                <button
                  onClick={() => setExtraMode('wide')}
                  className="h-16 rounded-2xl bg-blue-500 text-white font-black text-lg shadow-sm active:scale-90 transition-all border-b-4 border-blue-700"
                >
                  WD
                </button>
                <button
                  onClick={() => setExtraMode('no-ball')}
                  className="h-16 rounded-2xl bg-orange-500 text-white font-black text-lg shadow-sm active:scale-90 transition-all border-b-4 border-orange-700"
                >
                  NB
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsWicketModalOpen(true)}
            className="py-4 rounded-2xl bg-red-600 text-white font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-red-800"
          >
            Wicket
          </button>
          <button
            onClick={() => setIsExtrasModalOpen(true)}
            className="py-4 rounded-2xl bg-gray-800 text-white font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-black"
          >
            Extras
          </button>
        </div>
      </div>
    </div>
  );
};
