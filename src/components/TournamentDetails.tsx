import React, { useEffect, useMemo, useState } from 'react';
import { db, doc, getDoc, collection, query, where, orderBy, onSnapshot } from '../firebase';
import { Tournament, Team, Player, Match } from '../types';
import { ArrowLeft, CalendarDays, MapPin, Shield, Trophy } from 'lucide-react';

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

function getMatchWinner(match: any) {
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
}: {
  tournamentId: string;
  onBack: () => void;
  onTeamClick: (id: string) => void;
  onPlayerClick: (id: string) => void;
  onMatchClick: (id: string) => void;
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'players' | 'points'>('overview');

  useEffect(() => {
    let unsubscribeMatches = () => {};

    const loadTournament = async () => {
      const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
      if (!tournamentSnap.exists()) return;

      const nextTournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
      setTournament(nextTournament);

      const teamDocs = await Promise.all((nextTournament.teams || []).map((teamId) => getDoc(doc(db, 'teams', teamId))));
      const nextTeams = teamDocs
        .filter((teamDoc) => teamDoc.exists())
        .map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team));
      setTeams(nextTeams);

      const playerIds = Array.from(new Set(nextTeams.flatMap((team) => team.players || [])));
      const playerDocs = await Promise.all(playerIds.map((playerId) => getDoc(doc(db, 'players', playerId))));
      setPlayers(
        playerDocs
          .filter((playerDoc) => playerDoc.exists())
          .map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player))
      );

      const matchesQuery = query(
        collection(db, 'matches'),
        where('tournamentId', '==', tournamentId),
        orderBy('createdAt', 'desc')
      );
      unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
        setMatches(snapshot.docs.map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() } as Match)));
      });
    };

    loadTournament().catch((error) => {
      console.error('Error loading tournament details:', error);
    });

    return () => unsubscribeMatches();
  }, [tournamentId]);

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

  const topRunScorer = useMemo(() => {
    return [...players].sort((a, b) => Number(b.stats?.runs || 0) - Number(a.stats?.runs || 0))[0];
  }, [players]);

  const topWicketTaker = useMemo(() => {
    return [...players].sort((a, b) => Number(b.stats?.wickets || 0) - Number(a.stats?.wickets || 0))[0];
  }, [players]);

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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-black text-white px-5 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-500">Tournament Hub</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tight truncate">{tournament.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teams</p>
            <p className="text-2xl font-black text-white mt-1">{teams.length}</p>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Players</p>
            <p className="text-2xl font-black text-white mt-1">{players.length}</p>
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
                <InfoRow icon={Shield} label="Organizer" value={tournament.organizer || 'Score Wala'} />
                <InfoRow icon={Trophy} label="Overs" value={`${tournament.overs || 20} overs`} />
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Tournament linked matches yahan automatically dikhेंगे</p>
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
                            {match.status} • {match.scoreA?.runs || 0}/{match.scoreA?.wickets || 0} & {match.scoreB?.runs || 0}/{match.scoreB?.wickets || 0}
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
                  </div>
                  <span className="rounded-full bg-yellow-50 border border-yellow-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-700">
                    Open Team
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="grid grid-cols-1 gap-3">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => onPlayerClick(player.id)}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                      {player.role} • {player.stats?.runs || 0} runs • {player.stats?.wickets || 0} wickets
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Profile
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'points' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Points Table</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Auto calculated</span>
            </div>
            <div className="overflow-x-auto">
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
                            RR {ballsToOversString(row.oversFor)} for • RR {ballsToOversString(row.oversAgainst)} against
                          </p>
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center font-bold text-gray-700">{row.played}</td>
                      <td className="px-3 py-4 text-center font-bold text-gray-700">{row.won}</td>
                      <td className="px-3 py-4 text-center font-bold text-gray-700">{row.lost}</td>
                      <td className="px-3 py-4 text-center font-bold text-gray-700">{row.tied}</td>
                      <td className="px-3 py-4 text-center font-black text-black">{row.points}</td>
                      <td className="px-4 py-4 text-right font-black text-gray-800">{row.nrr.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
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
