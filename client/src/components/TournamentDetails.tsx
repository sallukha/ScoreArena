import React, { useEffect, useMemo, useState } from 'react';
import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from '../firebase';
import { Tournament, Team, Player, Match } from '../types';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Shield,
  Trophy,
  Trash2,
  PlayCircle,
  PlusCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  useDeleteTournamentMutation,
  useUpdateTournamentMutation,
} from '../features/tournaments/hooks/useTournamentMutations';
import { useCreatePlayerMutation } from '../features/players/hooks/usePlayerMutations';
import { useCreateTeamMutation } from '../features/teams/hooks/useTeamMutations';
import { useAuth } from '../contexts/AuthContext';

type PointsRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  nrr: number;
};

function ballsToOversString(totalBalls: number) {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${overs}.${balls}`;
}

function oversToBalls(overs: number | undefined, balls: number | undefined) {
  return Number(overs || 0) * 6 + Number(balls || 0);
}

function getMatchWinner(match: Match) {
  if (match.status !== 'completed') return '';
  const scoreA = Number(match.scoreA?.runs || 0);
  const scoreB = Number(match.scoreB?.runs || 0);
  if (scoreA === scoreB) return 'tie';
  return scoreA > scoreB ? match.teamA : match.teamB;
}

export const TournamentDetails = ({
  tournamentId,
  onBack,
  onTeamClick,
  onPlayerClick,
  onMatchClick,
  onStartTournamentMatch,
  onDeleted,
}: {
  tournamentId: string;
  onBack: () => void;
  onTeamClick: (id: string) => void;
  onPlayerClick: (id: string) => void;
  onMatchClick: (id: string) => void;
  onStartTournamentMatch: (id: string) => void;
  onDeleted: () => void;
}) => {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'players' | 'points'>('overview');
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [isAddTeamsOpen, setIsAddTeamsOpen] = useState(false);
  const [isLoadingTeamPool, setIsLoadingTeamPool] = useState(false);
  const [isAddingTeams, setIsAddingTeams] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedAdditionalTeamIds, setSelectedAdditionalTeamIds] = useState<string[]>([]);
  const [tournamentPlayerPool, setTournamentPlayerPool] = useState<Player[]>([]);
  const [isCreateTournamentPlayerOpen, setIsCreateTournamentPlayerOpen] = useState(false);
  const [isCreatingTournamentPlayer, setIsCreatingTournamentPlayer] = useState(false);
  const [tournamentPlayerName, setTournamentPlayerName] = useState('');
  const [tournamentPlayerRole, setTournamentPlayerRole] = useState<Player['role']>('All-rounder');
  const [isCreateTournamentTeamOpen, setIsCreateTournamentTeamOpen] = useState(false);
  const [isCreatingTournamentTeam, setIsCreatingTournamentTeam] = useState(false);
  const [tournamentTeamName, setTournamentTeamName] = useState('');
  const [selectedTournamentTeamPlayerIds, setSelectedTournamentTeamPlayerIds] = useState<string[]>([]);
  const deleteTournamentMutation = useDeleteTournamentMutation();
  const updateTournamentMutation = useUpdateTournamentMutation();
  const createPlayerMutation = useCreatePlayerMutation();
  const createTeamMutation = useCreateTeamMutation();

  useEffect(() => {
    let isMounted = true;

    const hydrateTournamentMembers = async (teamIds: string[]) => {
      const teamDocs = await Promise.all(
        (teamIds || []).map((teamId) => getDoc(doc(db, 'teams', teamId))),
      );
      const nextTeams = teamDocs
        .filter((teamDoc) => teamDoc.exists())
        .map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team));

      const playerIds = Array.from(new Set(nextTeams.flatMap((team) => team.players || [])));
      const playerDocs = await Promise.all(
        playerIds.map((playerId) => getDoc(doc(db, 'players', playerId))),
      );
      const nextPlayers = playerDocs
        .filter((playerDoc) => playerDoc.exists())
        .map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player));

      if (!isMounted) return;
      setTeams(nextTeams);
      setPlayers(nextPlayers);
    };

    const tournamentUnsubscribe = onSnapshot(
      doc(db, 'tournaments', tournamentId),
      (tournamentSnap) => {
        if (!tournamentSnap.exists()) {
          setTournament(null);
          setTeams([]);
          setPlayers([]);
          return;
        }

        const nextTournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
        setTournament(nextTournament);
        void hydrateTournamentMembers(nextTournament.teams || []);
      },
      (error) => {
        console.error('Error watching tournament:', error);
      },
    );

    const matchesQuery = query(
      collection(db, 'matches'),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'desc'),
    );
    const matchesUnsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        setMatches(snapshot.docs.map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() } as Match)));
      },
      (error) => {
        console.error('Error watching tournament matches:', error);
      },
    );

    return () => {
      isMounted = false;
      tournamentUnsubscribe();
      matchesUnsubscribe();
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!user?.uid) return;

    const tournamentPlayersQuery = query(
      collection(db, 'players'),
      where('createdBy', '==', user.uid),
    );

    return onSnapshot(
      tournamentPlayersQuery,
      (snapshot) => {
        const filteredPlayers = snapshot.docs
          .map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player))
          .filter((player) => player.scope === 'tournament' && player.tournamentId === tournamentId);
        setTournamentPlayerPool(filteredPlayers);
      },
      (error) => {
        console.error('Error watching tournament players:', error);
      },
    );
  }, [tournamentId, user?.uid]);

  const pointsTable = useMemo(() => {
    const teamNameMap = new Map(teams.map((team) => [team.id, team.name]));
    const rows = new Map<string, PointsRow>();

    for (const team of teams) {
      rows.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        runsFor: 0,
        oversFor: 0,
        runsAgainst: 0,
        oversAgainst: 0,
        nrr: 0,
      });
    }

    for (const match of matches) {
      const rowA = rows.get(match.teamA);
      const rowB = rows.get(match.teamB);
      if (!rowA || !rowB || match.status !== 'completed') continue;

      rowA.played += 1;
      rowB.played += 1;

      rowA.runsFor += Number(match.scoreA?.runs || 0);
      rowA.oversFor += oversToBalls(match.scoreA?.overs, match.scoreA?.balls);
      rowA.runsAgainst += Number(match.scoreB?.runs || 0);
      rowA.oversAgainst += oversToBalls(match.scoreB?.overs, match.scoreB?.balls);

      rowB.runsFor += Number(match.scoreB?.runs || 0);
      rowB.oversFor += oversToBalls(match.scoreB?.overs, match.scoreB?.balls);
      rowB.runsAgainst += Number(match.scoreA?.runs || 0);
      rowB.oversAgainst += oversToBalls(match.scoreA?.overs, match.scoreA?.balls);

      const winner = getMatchWinner(match);
      if (winner === 'tie') {
        rowA.tied += 1;
        rowB.tied += 1;
        rowA.points += 1;
        rowB.points += 1;
      } else if (winner === match.teamA) {
        rowA.won += 1;
        rowA.points += 2;
        rowB.lost += 1;
      } else if (winner === match.teamB) {
        rowB.won += 1;
        rowB.points += 2;
        rowA.lost += 1;
      }
    }

    return Array.from(rows.values())
      .map((row) => {
        const forRate = row.oversFor > 0 ? row.runsFor / (row.oversFor / 6) : 0;
        const againstRate = row.oversAgainst > 0 ? row.runsAgainst / (row.oversAgainst / 6) : 0;
        return { ...row, nrr: Number((forRate - againstRate).toFixed(3)), teamName: teamNameMap.get(row.teamId) || row.teamName };
      })
      .sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won || String(a.teamName).localeCompare(String(b.teamName)));
  }, [matches, teams]);

  const mergedPlayers = useMemo(() => {
    const unique = new Map<string, Player>();
    players.forEach((player) => unique.set(player.id, player));
    tournamentPlayerPool.forEach((player) => unique.set(player.id, player));
    return Array.from(unique.values());
  }, [players, tournamentPlayerPool]);

  const topRunScorer = useMemo(() => {
    return [...mergedPlayers].sort((a, b) => Number(b.stats?.runs || 0) - Number(a.stats?.runs || 0))[0];
  }, [mergedPlayers]);

  const topWicketTaker = useMemo(() => {
    return [...mergedPlayers].sort((a, b) => Number(b.stats?.wickets || 0) - Number(a.stats?.wickets || 0))[0];
  }, [mergedPlayers]);

  const maxTeamsAllowed =
    typeof tournament?.maxTeams === 'number' && Number.isFinite(tournament.maxTeams)
      ? tournament.maxTeams
      : null;

  const remainingSlots =
    maxTeamsAllowed === null
      ? null
      : Math.max(maxTeamsAllowed - Number(tournament?.teams?.length || 0), 0);

  const teamsAvailableToAdd = useMemo(() => {
    if (!tournament) return [];
    const existing = new Set(tournament.teams || []);
    return availableTeams.filter((team) => !existing.has(team.id));
  }, [availableTeams, tournament]);

  const openAddTeamsModal = async () => {
    if (!user?.uid || !tournament) return;

    setIsAddTeamsOpen(true);
    setSelectedAdditionalTeamIds([]);
    setIsLoadingTeamPool(true);

    try {
      const snapshot = await getDocs(
        query(collection(db, 'teams'), where('createdBy', '==', user.uid)),
      );
      const nextTeams = snapshot.docs
        .map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team))
        .filter((team) => team.scope !== 'tournament' || team.tournamentId === tournamentId);
      setAvailableTeams(nextTeams);
    } catch (error) {
      console.error('Error fetching teams for add flow:', error);
      alert('Teams load nahi ho payi. Please try again.');
      setIsAddTeamsOpen(false);
    } finally {
      setIsLoadingTeamPool(false);
    }
  };

  const toggleAdditionalTeam = (teamId: string) => {
    setSelectedAdditionalTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      }

      if (remainingSlots !== null && prev.length >= remainingSlots) {
        alert(`Max limit reached. Is tournament me sirf ${maxTeamsAllowed} teams allowed hain.`);
        return prev;
      }

      return [...prev, teamId];
    });
  };

  const handleAddTeams = async () => {
    if (!tournament || selectedAdditionalTeamIds.length === 0) return;

    const currentTeamIds = tournament.teams || [];
    const nextTeamIds = Array.from(new Set([...currentTeamIds, ...selectedAdditionalTeamIds]));

    if (maxTeamsAllowed !== null && nextTeamIds.length > maxTeamsAllowed) {
      alert(`Team limit exceed ho gaya. Max allowed teams: ${maxTeamsAllowed}`);
      return;
    }

    setIsAddingTeams(true);

    try {
      const teamDocs = await Promise.all(
        nextTeamIds.map((teamId) => getDoc(doc(db, 'teams', teamId))),
      );
      const nextTeams = teamDocs
        .filter((teamDoc) => teamDoc.exists())
        .map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team));

      const playerIds = new Set<string>();
      nextTeams.forEach((team) => {
        (team.players || []).forEach((playerId) => playerIds.add(playerId));
      });
      const playerDocs = await Promise.all(
        Array.from(playerIds).map((playerId) => getDoc(doc(db, 'players', playerId))),
      );
      const nextPlayers = playerDocs
        .filter((playerDoc) => playerDoc.exists())
        .map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player));

      await updateTournamentMutation.mutateAsync({
        tournamentId: tournament.id,
        payload: {
          teams: nextTeamIds,
          teamCount: nextTeams.length,
          playerCount: playerIds.size,
        },
      });

      setTournament((prev) =>
        prev
          ? {
              ...prev,
              teams: nextTeamIds,
              teamCount: nextTeams.length,
              playerCount: playerIds.size,
            }
          : prev,
      );
      setTeams(nextTeams);
      setPlayers(nextPlayers);
      setIsAddTeamsOpen(false);
      setSelectedAdditionalTeamIds([]);
    } catch (error) {
      console.error('Error adding teams in tournament:', error);
      alert('Teams add nahi ho payi. Please try again.');
    } finally {
      setIsAddingTeams(false);
    }
  };

  const handleCreateTournamentPlayer = async () => {
    if (!user?.uid || !tournament || !tournamentPlayerName.trim()) return;

    setIsCreatingTournamentPlayer(true);
    try {
      await createPlayerMutation.mutateAsync({
        name: tournamentPlayerName.trim(),
        role: tournamentPlayerRole,
        battingStyle: 'Right Hand Bat',
        bowlingStyle: 'Right Arm Fast',
        createdBy: user.uid,
        scope: 'tournament',
        tournamentId: tournament.id,
        stats: {
          matches: 0,
          runs: 0,
          wickets: 0,
          highestScore: 0,
          bestBowling: '0/0',
          average: 0,
          strikeRate: 0,
          fours: 0,
          sixes: 0,
        },
      } as any);
      setTournamentPlayerName('');
      setTournamentPlayerRole('All-rounder');
      setIsCreateTournamentPlayerOpen(false);
    } catch (error) {
      console.error('Error creating tournament player:', error);
      alert('Tournament player create nahi ho paaya. Please try again.');
    } finally {
      setIsCreatingTournamentPlayer(false);
    }
  };

  const toggleTournamentTeamPlayer = (playerId: string) => {
    setSelectedTournamentTeamPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  const handleCreateTournamentTeam = async () => {
    if (!user?.uid || !tournament || !tournamentTeamName.trim()) return;
    if (selectedTournamentTeamPlayerIds.length === 0) {
      alert('Tournament team me at least 1 player add karo.');
      return;
    }

    const currentTeamIds = tournament.teams || [];
    if (maxTeamsAllowed !== null && currentTeamIds.length >= maxTeamsAllowed) {
      alert(`Team limit reached. Is tournament me max ${maxTeamsAllowed} teams allowed hain.`);
      return;
    }

    setIsCreatingTournamentTeam(true);
    try {
      const newTeamId = await createTeamMutation.mutateAsync({
        name: tournamentTeamName.trim(),
        players: Array.from(new Set(selectedTournamentTeamPlayerIds)),
        captainId: selectedTournamentTeamPlayerIds[0] || '',
        createdBy: user.uid,
        scope: 'tournament',
        tournamentId: tournament.id,
      } as any);

      const nextTeamIds = Array.from(new Set([...currentTeamIds, newTeamId]));
      const playerIds = new Set<string>();
      teams.forEach((team) => {
        (team.players || []).forEach((playerId) => playerIds.add(playerId));
      });
      selectedTournamentTeamPlayerIds.forEach((playerId) => playerIds.add(playerId));

      await updateTournamentMutation.mutateAsync({
        tournamentId: tournament.id,
        payload: {
          teams: nextTeamIds,
          teamCount: nextTeamIds.length,
          playerCount: playerIds.size,
        },
      });

      setTournament((prev) =>
        prev
          ? {
              ...prev,
              teams: nextTeamIds,
              teamCount: nextTeamIds.length,
              playerCount: playerIds.size,
            }
          : prev,
      );
      setTeams((prev) => [
        ...prev,
        {
          id: newTeamId,
          name: tournamentTeamName.trim(),
          players: Array.from(new Set(selectedTournamentTeamPlayerIds)),
          captainId: selectedTournamentTeamPlayerIds[0] || '',
          createdBy: user.uid,
          scope: 'tournament',
          tournamentId: tournament.id,
        } as Team,
      ]);

      setTournamentTeamName('');
      setSelectedTournamentTeamPlayerIds([]);
      setIsCreateTournamentTeamOpen(false);
    } catch (error) {
      console.error('Error creating tournament team:', error);
      alert('Tournament team create nahi ho paayi. Please try again.');
    } finally {
      setIsCreatingTournamentTeam(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament?.id) return;
    const shouldDelete = window.confirm(
      `Delete tournament "${tournament.name}"?\n\nIs tournament ke linked matches bhi delete ho jayenge.`,
    );
    if (!shouldDelete) return;

    try {
      setIsDeletingTournament(true);
      await deleteTournamentMutation.mutateAsync(tournament.id);
      onDeleted();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Tournament delete nahi ho paaya. Please try again.');
    } finally {
      setIsDeletingTournament(false);
    }
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-white p-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-xs tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-8 text-center">
          <p className="text-sm font-bold text-gray-700">Tournament loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <div className="bg-black text-white px-4 sm:px-5 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-500">Tournament Hub</p>
            <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight truncate">{tournament.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teams</p>
            <p className="text-2xl font-black text-white mt-1">
              {maxTeamsAllowed === null ? teams.length : `${teams.length}/${maxTeamsAllowed}`}
            </p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Players</p>
            <p className="text-2xl font-black text-white mt-1">{mergedPlayers.length}</p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Format</p>
            <p className="text-sm font-black text-white mt-2">{tournament.format || 'League'}</p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</p>
            <p className="text-sm font-black text-yellow-500 mt-2 uppercase">{tournament.status || 'upcoming'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => onStartTournamentMatch(tournament.id)}
            className="rounded-2xl bg-yellow-500 text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <PlayCircle size={16} />
            Start Tournament Match
          </button>
          <button
            onClick={() => setIsCreateTournamentPlayerOpen(true)}
            className="rounded-2xl bg-white text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Add Tournament Player
          </button>
          <button
            onClick={() => setIsCreateTournamentTeamOpen(true)}
            className="rounded-2xl bg-white text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Users size={16} />
            Create Tournament Team
          </button>
          <button
            onClick={openAddTeamsModal}
            className="rounded-2xl bg-white text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            Add Teams
          </button>
          <button
            onClick={handleDeleteTournament}
            disabled={isDeletingTournament}
            className="rounded-2xl bg-red-600 text-white py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 sm:col-span-2"
          >
            <Trash2 size={16} />
            {isDeletingTournament ? 'Deleting...' : 'Delete Tournament'}
          </button>
        </div>
      </div>

      <div className="p-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'teams', label: 'Teams' },
          { id: 'players', label: 'Players' },
          { id: 'points', label: 'Points Table' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
              activeTab === tab.id ? 'bg-yellow-500 text-black' : 'bg-white text-gray-500 border border-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4">
        {activeTab === 'overview' && (
          <>
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Tournament Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={MapPin} label="City" value={tournament.city || 'Not set'} />
                <InfoRow icon={CalendarDays} label="Dates" value={`${tournament.startDate || '--'} to ${tournament.endDate || '--'}`} />
                <InfoRow icon={Shield} label="Organizer" value={tournament.organizer || 'ScoreArena'} />
                <InfoRow icon={Trophy} label="Overs" value={`${tournament.overs || 20} overs`} />
              </div>
              <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Team Capacity</p>
                <p className="text-sm font-bold text-gray-800">
                  {maxTeamsAllowed === null
                    ? 'Unlimited teams allowed'
                    : `${teams.length} of ${maxTeamsAllowed} teams added`}
                </p>
              </div>
              {tournament.description && (
                <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{tournament.description}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HighlightCard
                title="Top Run Scorer"
                value={topRunScorer ? topRunScorer.name : 'No player yet'}
                meta={topRunScorer ? `${topRunScorer.stats?.runs || 0} runs` : 'Tournament teams add karo'}
                onClick={topRunScorer ? () => onPlayerClick(topRunScorer.id) : undefined}
              />
              <HighlightCard
                title="Top Wicket Taker"
                value={topWicketTaker ? topWicketTaker.name : 'No player yet'}
                meta={topWicketTaker ? `${topWicketTaker.stats?.wickets || 0} wickets` : 'Players will show here'}
                onClick={topWicketTaker ? () => onPlayerClick(topWicketTaker.id) : undefined}
              />
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Tournament Matches</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{matches.length} matches</span>
              </div>
              {matches.length === 0 ? (
                <div className="rounded-3xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center">
                  <p className="text-sm font-bold text-gray-700">Tournament fixtures abhi add nahi hue.</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Tournament linked matches yahan automatically dikhenge</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => onMatchClick(match.id)}
                      className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">
                            {(teams.find((team) => team.id === match.teamA)?.name || 'Team A')} vs {(teams.find((team) => team.id === match.teamB)?.name || 'Team B')}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            {match.status} | {match.scoreA?.runs || 0}/{match.scoreA?.wickets || 0} and {match.scoreB?.runs || 0}/{match.scoreB?.wickets || 0}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-100">
                          Open
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={openAddTeamsModal}
                className="rounded-2xl bg-black text-white py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <PlusCircle size={16} />
                Add Existing Teams
              </button>
              <button
                onClick={() => setIsCreateTournamentTeamOpen(true)}
                className="rounded-2xl bg-yellow-500 text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Users size={16} />
                Create Tournament Team
              </button>
            </div>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => onTeamClick(team.id)}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{team.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                      {(team.players || []).length} tournament players
                    </p>
                    {team.scope === 'tournament' && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mt-1">
                        Tournament Team
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-yellow-50 border border-yellow-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-700">
                    Open Team
                  </span>
                </div>
              </button>
            ))}
            {teams.length === 0 && (
              <div className="rounded-3xl bg-white border border-dashed border-gray-200 p-5 text-center">
                <p className="text-sm font-bold text-gray-700">Abhi koi team added nahi hai.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  Create Tournament Team ya Add Teams button se teams add karo
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="grid grid-cols-1 gap-3">
            {mergedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onPlayerClick(player.id)}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                      {player.role} | {player.stats?.runs || 0} runs | {player.stats?.wickets || 0} wickets
                    </p>
                    {player.scope === 'tournament' && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mt-1">Tournament Player</p>
                    )}
                  </div>
                  <span className="rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Profile
                  </span>
                </div>
              </button>
            ))}
            {mergedPlayers.length === 0 && (
              <div className="rounded-3xl bg-white border border-dashed border-gray-200 p-5 text-center">
                <p className="text-sm font-bold text-gray-700">Players abhi available nahi hain.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  Add Tournament Player se alag player pool banao
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'points' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Points Table</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Auto calculated</span>
            </div>
            {pointsTable.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm font-bold text-gray-700">Points table abhi empty hai.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  Completed matches hote hi standings update hongi
                </p>
              </div>
            ) : (
              <>
                <div className="sm:hidden p-4 flex flex-col gap-3">
                  {pointsTable.map((row, index) => (
                    <div key={row.teamId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={() => onTeamClick(row.teamId)} className="text-left min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{index + 1}. {row.teamName}</p>
                        </button>
                        <span className="rounded-full bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          {row.points} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                        <StatMini label="P" value={row.played} />
                        <StatMini label="W" value={row.won} />
                        <StatMini label="L" value={row.lost} />
                        <StatMini label="T" value={row.tied} />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold text-gray-600">
                          NRR: {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">
                          For {row.runsFor} in {ballsToOversString(row.oversFor)} ov | Against {row.runsAgainst} in {ballsToOversString(row.oversAgainst)} ov
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="px-4 py-3 text-left">Team</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">W</th>
                        <th className="px-3 py-3 text-center">L</th>
                        <th className="px-3 py-3 text-center">T</th>
                        <th className="px-3 py-3 text-center">Pts</th>
                        <th className="px-4 py-3 text-right">NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsTable.map((row, index) => (
                        <tr key={row.teamId} className="border-t border-gray-100">
                          <td className="px-4 py-4">
                            <button onClick={() => onTeamClick(row.teamId)} className="text-left">
                              <p className="text-sm font-black text-gray-900">{index + 1}. {row.teamName}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                                For {row.runsFor} in {ballsToOversString(row.oversFor)} ov | Against {row.runsAgainst} in {ballsToOversString(row.oversAgainst)} ov
                              </p>
                            </button>
                          </td>
                          <td className="px-3 py-4 text-center font-bold text-gray-700">{row.played}</td>
                          <td className="px-3 py-4 text-center font-bold text-gray-700">{row.won}</td>
                          <td className="px-3 py-4 text-center font-bold text-gray-700">{row.lost}</td>
                          <td className="px-3 py-4 text-center font-bold text-gray-700">{row.tied}</td>
                          <td className="px-3 py-4 text-center font-black text-black">{row.points}</td>
                          <td className="px-4 py-4 text-right font-black text-gray-800">
                            {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isAddTeamsOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Add Teams</p>
                <h3 className="text-lg font-black text-gray-900">{tournament.name}</h3>
              </div>
              <button
                onClick={() => setIsAddTeamsOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 max-h-[65vh] overflow-y-auto">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Capacity: {maxTeamsAllowed === null ? 'Unlimited' : `${teams.length}/${maxTeamsAllowed}`}
                </p>
                {remainingSlots !== null && (
                  <p className="text-xs font-bold text-gray-700 mt-1">Remaining slots: {remainingSlots}</p>
                )}
              </div>

              {isLoadingTeamPool ? (
                <p className="text-sm font-bold text-gray-600">Loading teams...</p>
              ) : teamsAvailableToAdd.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm font-bold text-gray-700">Koi extra team available nahi hai.</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                    Ya to sab teams already added hain, ya new team create karni hogi
                  </p>
                </div>
              ) : (
                teamsAvailableToAdd.map((team) => {
                  const selected = selectedAdditionalTeamIds.includes(team.id);
                  const disabled =
                    !selected && remainingSlots !== null && selectedAdditionalTeamIds.length >= remainingSlots;

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleAdditionalTeam(team.id)}
                      disabled={disabled}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100 bg-white'
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{team.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            {(team.players || []).length} players
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            selected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {selected ? 'Selected' : 'Add'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={handleAddTeams}
                disabled={isAddingTeams || selectedAdditionalTeamIds.length === 0}
                className="w-full rounded-2xl bg-black text-white py-3 text-sm font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isAddingTeams ? 'Adding Teams...' : `Add Selected Teams (${selectedAdditionalTeamIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateTournamentPlayerOpen && (
        <div className="fixed inset-0 z-[82] bg-black/50 p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tournament Players</p>
                <h3 className="text-lg font-black text-gray-900">Add Tournament Player</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateTournamentPlayerOpen(false);
                  setTournamentPlayerName('');
                }}
                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">
                  Ye player sirf is tournament ke liye create hoga.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Player Name</label>
                <input
                  type="text"
                  value={tournamentPlayerName}
                  onChange={(e) => setTournamentPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Role</label>
                <select
                  value={tournamentPlayerRole}
                  onChange={(e) => setTournamentPlayerRole(e.target.value as Player['role'])}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicket-keeper">Wicket-keeper</option>
                </select>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={handleCreateTournamentPlayer}
                disabled={isCreatingTournamentPlayer || !tournamentPlayerName.trim()}
                className="w-full rounded-2xl bg-black text-white py-3 text-sm font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isCreatingTournamentPlayer ? 'Creating Player...' : 'Create Tournament Player'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateTournamentTeamOpen && (
        <div className="fixed inset-0 z-[82] bg-black/50 p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tournament Teams</p>
                <h3 className="text-lg font-black text-gray-900">Create Tournament Team</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateTournamentTeamOpen(false);
                  setTournamentTeamName('');
                  setSelectedTournamentTeamPlayerIds([]);
                }}
                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 max-h-[65vh] overflow-y-auto">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Capacity: {maxTeamsAllowed === null ? 'Unlimited' : `${teams.length}/${maxTeamsAllowed}`}
                </p>
                {remainingSlots !== null && (
                  <p className="text-xs font-bold text-gray-700 mt-1">Remaining slots: {remainingSlots}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Team Name</label>
                <input
                  type="text"
                  value={tournamentTeamName}
                  onChange={(e) => setTournamentTeamName(e.target.value)}
                  placeholder="Enter tournament team name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {tournamentPlayerPool.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm font-bold text-gray-700">Tournament player pool empty hai.</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                    Pehle Add Tournament Player se players banao
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Select Players ({selectedTournamentTeamPlayerIds.length})
                  </p>
                  {tournamentPlayerPool.map((player) => {
                    const selected = selectedTournamentTeamPlayerIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => toggleTournamentTeamPlayer(player.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          selected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                              {player.role}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              selected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {selected ? 'Selected' : 'Add'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={handleCreateTournamentTeam}
                disabled={
                  isCreatingTournamentTeam ||
                  !tournamentTeamName.trim() ||
                  selectedTournamentTeamPlayerIds.length === 0
                }
                className="w-full rounded-2xl bg-black text-white py-3 text-sm font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isCreatingTournamentTeam ? 'Creating Team...' : 'Create Tournament Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4 flex items-start gap-3">
    <div className="rounded-2xl bg-white p-2 border border-gray-100">
      <Icon size={16} className="text-gray-500" />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-800 mt-1">{value}</p>
    </div>
  </div>
);

const HighlightCard = ({
  title,
  value,
  meta,
  onClick,
}: {
  title: string;
  value: string;
  meta: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 text-left disabled:cursor-default"
  >
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
    <p className="text-lg font-black text-gray-900 mt-2 truncate">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">{meta}</p>
  </button>
);

const StatMini = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl bg-white border border-gray-200 px-2 py-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="text-sm font-black text-gray-900 mt-1">{value}</p>
  </div>
);
