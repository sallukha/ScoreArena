import { useState, useEffect } from 'react';
import { db, doc, updateDoc, collection, addDoc, onSnapshot, auth, getDoc, handleFirestoreError, OperationType, getDocs, query, where, orderBy } from '../firebase';
import { ArrowLeft, ChevronRight, User, Settings2, History, CheckCircle2, Search } from 'lucide-react';
import { Match, Team, Player } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PlayerSelectionModal = ({ 
  isOpen, 
  onClose, 
  players, 
  onSelect, 
  title,
  selectedIds = []
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  players: Player[], 
  onSelect: (id: string) => void, 
  title: string,
  selectedIds?: string[]
}) => {
  const [search, setSearch] = useState('');
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900 mb-4">{title}</h3>
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
            </div>
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
            </div>
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
              getDocs(query(collection(db, 'players'), where('createdBy', '==', data.createdBy)))
            ]);

            // Filter players by team (assuming team.players is an array of IDs)
            const tAData = sA.data() as Team;
            const tBData = sB.data() as Team;
            
            const allPlayers = battingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
            
            const currentBattingTeamPlayers = data.currentInnings === 1 ? tAData.players : tBData.players;
            const currentBowlingTeamPlayers = data.currentInnings === 1 ? tBData.players : tAData.players;

            setBattingPlayers(allPlayers.filter(p => currentBattingTeamPlayers.includes(p.id)));
            setBowlingPlayers(allPlayers.filter(p => currentBowlingTeamPlayers.includes(p.id)));

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
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        [type]: playerId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleRun = async (runs: number, isExtra: boolean = false, extraType?: string) => {
    if (!match) return;

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
      const extraRuns = (runs || 1);
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
          stats.runsConceded += (runs || 1);
          if (extraType === 'no-ball') stats.runsConceded += runs;
        }
      } else {
        stats.runsConceded += runs;
      }
      playerStats[bowlerId] = stats;
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
        striker: newStriker,
        nonStriker: newNonStriker
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

  const handleWicket = async () => {
    if (!match) return;
    const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentScoreKey];

    const newWickets = currentScore.wickets + 1;
    const newBalls = currentScore.balls + 1 === 6 ? 0 : currentScore.balls + 1;
    const newOvers = currentScore.balls + 1 === 6 ? currentScore.overs + 1 : currentScore.overs;

    const isAllOut = newWickets === 10;
    const isMatchOver = match.currentInnings === 2 && (isAllOut || (newOvers === match.overs && newBalls === 0));
    const isInningsOver = match.currentInnings === 1 && (isAllOut || (newOvers === match.overs && newBalls === 0));

    // Update Player Stats
    const playerStats = { ...(match.playerStats || {}) };
    const strikerId = match.striker;
    const bowlerId = match.bowler;

    if (strikerId) {
      const stats = { ...(playerStats[strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      stats.balls += 1;
      playerStats[strikerId] = stats;
    }

    if (bowlerId) {
      const stats = { ...(playerStats[bowlerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      stats.ballsBowled += 1;
      if (stats.ballsBowled === 6) {
        stats.overs += 1;
        stats.ballsBowled = 0;
      }
      stats.wickets += 1;
      playerStats[bowlerId] = stats;
    }

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
        striker: null // Clear striker as they are out
      });

      // Record ball as wicket
      await addDoc(collection(db, 'matches', matchId, 'balls'), {
        innings: match.currentInnings,
        over: newBalls === 0 ? newOvers - 1 : newOvers,
        ball: newBalls === 0 ? 6 : newBalls,
        runs: 0,
        wicket: { type: 'bowled', player: strikerId || null },
        batsman: strikerId || null,
        bowler: bowlerId || null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording wicket:', error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
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
      />
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
        <button className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
          <Settings2 size={20} />
        </button>
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
        {/* Batsmen & Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button 
            onClick={() => setSelectionType('striker')}
            className="flex justify-between items-center group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-xs">
                {striker ? striker.name[0] : <User size={14} />}
              </div>
              <span className={`font-bold ${striker ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                {striker ? `${striker.name}*` : 'Select Striker'}
              </span>
            </div>
            <span className="font-black text-gray-900">{strikerStats.runs} ({strikerStats.balls})</span>
          </button>
          <div className="h-px bg-gray-50" />
          <button 
            onClick={() => setSelectionType('nonStriker')}
            className="flex justify-between items-center opacity-60 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-xs">
                {nonStriker ? nonStriker.name[0] : <User size={14} />}
              </div>
              <span className={`font-bold ${nonStriker ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                {nonStriker ? nonStriker.name : 'Select Non-Striker'}
              </span>
            </div>
            <span className="font-black text-gray-900">{nonStrikerStats.runs} ({nonStrikerStats.balls})</span>
          </button>
        </div>

        {/* Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button 
            onClick={() => setSelectionType('bowler')}
            className="flex justify-between items-center group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                {bowler ? bowler.name[0] : <User size={14} />}
              </div>
              <span className={`font-bold ${bowler ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                {bowler ? bowler.name : 'Select Bowler'}
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${
                    ball.extraType === 'wide' || ball.extraType === 'no-ball' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    ball.runs === 4 ? 'bg-green-500 text-white' :
                    ball.runs === 6 ? 'bg-purple-600 text-white' :
                    ball.extraType ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ball.extraType === 'wide' ? 'WD' : 
                   ball.extraType === 'no-ball' ? 'NB' : 
                   ball.runs}
                </div>
              ))}
              {recentBalls.length === 0 && <span className="text-xs text-gray-300 italic">No balls yet</span>}
            </div>
          </div>
        </div>

        {/* Scoring Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex flex-col gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(run => (
              <button
                key={run}
                onClick={() => handleRun(run)}
                className="bg-gray-50 hover:bg-yellow-500 hover:text-black transition-all py-4 rounded-xl font-black text-xl active:scale-90 border border-gray-100"
              >
                {run}
              </button>
            ))}
            <button
              onClick={() => handleRun(4)}
              className="bg-green-500 text-white hover:bg-green-600 transition-all py-4 rounded-xl font-black text-2xl active:scale-90 shadow-lg shadow-green-200"
            >
              4
            </button>
            <button
              onClick={() => handleRun(6)}
              className="bg-purple-600 text-white hover:bg-purple-700 transition-all py-4 rounded-xl font-black text-2xl active:scale-90 shadow-lg shadow-purple-200"
            >
              6
            </button>
            <button
              onClick={() => handleRun(1, true, 'wide')}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all py-4 rounded-xl font-black text-sm uppercase tracking-tighter active:scale-90 border border-blue-100"
            >
              WIDE
            </button>
            <button
              onClick={() => handleRun(1, true, 'no-ball')}
              className="bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all py-4 rounded-xl font-black text-sm uppercase tracking-tighter active:scale-90 border border-orange-100"
            >
              NO BALL
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleWicket}
              className="bg-red-600 text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-transform"
            >
              WICKET
            </button>
            <button
              className="bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg shadow-gray-200 active:scale-95 transition-transform"
            >
              EXTRAS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
