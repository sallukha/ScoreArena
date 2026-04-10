import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, auth, getDocs, query, where, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, Trophy, ChevronRight, Users, Settings2 } from 'lucide-react';
import { Team, Tournament } from '../types';
import { useCreateMatchMutation } from '../features/matches/hooks/useMatchMutations';

export const StartMatch = ({
  onBack,
  onStart,
  mode = 'normal',
  presetTournamentId,
}: {
  onBack: () => void,
  onStart: (id: string) => void,
  mode?: 'normal' | 'tournament',
  presetTournamentId?: string,
}) => {
  const isTournamentMode = mode === 'tournament';
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState(20);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [playerDirectory, setPlayerDirectory] = useState<Record<string, string>>({});
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState(presetTournamentId || '');
  const [loading, setLoading] = useState(false);
  const createMatchMutation = useCreateMatchMutation();

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      const [teamsSnapshot, tournamentsSnapshot, playersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('createdBy', '==', auth.currentUser.uid))),
        getDocs(query(collection(db, 'tournaments'), where('createdBy', '==', auth.currentUser.uid))),
        getDocs(query(collection(db, 'players'), where('createdBy', '==', auth.currentUser.uid))),
      ]);
      setAllTeams(teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
      setTournaments(tournamentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
      const nextPlayerDirectory: Record<string, string> = {};
      playersSnapshot.docs.forEach((doc) => {
        const data = doc.data() as any;
        nextPlayerDirectory[doc.id] = data?.name || `Player ${doc.id.slice(0, 4)}`;
      });
      setPlayerDirectory(nextPlayerDirectory);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (presetTournamentId) {
      setTournamentId(presetTournamentId);
    }
  }, [presetTournamentId]);

  const availableTeams = useMemo(() => {
    if (!isTournamentMode || !tournamentId) {
      return allTeams.filter((team) => team.scope !== 'tournament');
    }
    const tournament = tournaments.find((item) => item.id === tournamentId);
    if (!tournament) return allTeams.filter((team) => team.scope !== 'tournament');
    return allTeams.filter((team) => tournament.teams?.includes(team.id));
  }, [allTeams, isTournamentMode, tournamentId, tournaments]);

  useEffect(() => {
    if (teamA && !availableTeams.some((team) => team.id === teamA)) {
      setTeamA('');
    }
    if (teamB && !availableTeams.some((team) => team.id === teamB)) {
      setTeamB('');
    }
  }, [availableTeams, teamA, teamB]);

  const sharedPlayerIds = useMemo(() => {
    if (!teamA || !teamB || teamA === teamB) return [];
    const teamAData = allTeams.find((team) => team.id === teamA);
    const teamBData = allTeams.find((team) => team.id === teamB);
    if (!teamAData || !teamBData) return [];

    const teamAPlayers = new Set((teamAData.players || []).map((id) => String(id)));
    return Array.from(new Set((teamBData.players || [])
      .map((id) => String(id))
      .filter((id) => teamAPlayers.has(id))));
  }, [allTeams, teamA, teamB]);

  const sharedPlayerNames = useMemo(
    () => sharedPlayerIds.map((id) => playerDirectory[id] || `Player ${id.slice(0, 4)}`),
    [playerDirectory, sharedPlayerIds],
  );

  const createMatch = async () => {
    if (!auth.currentUser) return;
    if (isTournamentMode && !tournamentId) {
      alert('Tournament select karna zaroori hai.');
      return;
    }
    if (teamA === teamB) {
      alert('Team A aur Team B same nahi ho sakte.');
      return;
    }
    if (sharedPlayerIds.length > 0) {
      alert(`Same player dono teams me hai: ${sharedPlayerNames.join(', ')}. Pehle duplicate players hatao.`);
      return;
    }

    setLoading(true);
    try {
      const matchData = {
        teamA,
        teamB,
        tournamentId: isTournamentMode ? tournamentId : '',
        status: 'live' as const,
        overs,
        scoreA: { runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
        scoreB: { runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
        currentInnings: 1,
        isFreeHit: false,
        playerStats: {},
        createdBy: auth.currentUser.uid,
      };
      const matchId = await createMatchMutation.mutateAsync(matchData as any);
      onStart(matchId);
    } catch (error) {
      console.error('Error starting match:', error);
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMatch();
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-yellow-500 p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold italic uppercase">{isTournamentMode ? 'Tournament Scorer' : 'Start Match'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-8">
        {isTournamentMode && (
          <div className="flex flex-col gap-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Trophy size={14} /> Tournament
            </label>
            {presetTournamentId ? (
              <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 font-bold text-gray-800">
                {tournaments.find((tournament) => tournament.id === tournamentId)?.name || 'Selected Tournament'}
              </div>
            ) : (
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
                required
              >
                <option value="">Select Tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} /> Select Teams
          </label>
          <div className="flex flex-col gap-3">
            <select
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
              required
            >
              <option value="">Select Team A</option>
              {availableTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <div className="flex items-center justify-center">
              <span className="bg-yellow-100 text-yellow-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-200">VS</span>
            </div>
            <select
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
              required
            >
              <option value="">Select Team B</option>
              {availableTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          {sharedPlayerIds.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Duplicate Players Found</p>
              <p className="mt-1 text-xs font-bold text-red-500">
                Same player Team A aur Team B dono me hai: {sharedPlayerNames.join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Settings2 size={14} /> Match Settings
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-700">Total Overs</p>
            <div className="grid grid-cols-3 gap-3">
              {[5, 6, 8, 10, 20, 50].map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOvers(o)}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all ${overs === o ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white border-gray-100 text-gray-500'
                    }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
          <Trophy size={20} className="text-blue-500 mt-1" />
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            {isTournamentMode
              ? 'Yeh match selected tournament ke under create hoga aur scorer turant open hoga.'
              : 'Starting a match will create a live scorecard. You can add players to the match after starting.'}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !teamA || !teamB || teamA === teamB || sharedPlayerIds.length > 0 || (isTournamentMode && !tournamentId)}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {loading ? 'Starting...' : (isTournamentMode ? 'Start Tournament Scorer' : 'Start Scorer')}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};
