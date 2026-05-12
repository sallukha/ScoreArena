import { useEffect, useState } from 'react';
import { ChevronRight, History } from 'lucide-react';
import { db, query, collection, onSnapshot, orderBy, limit, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { subscribePrimaryPlayerByIdentity } from '../features/players/services/playerService';

const getCreatedAtTime = (value: any) => {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatScore = (score: any) => `${score?.runs || 0}/${score?.wickets || 0}`;
const formatOvers = (score: any) => `${score?.overs || 0}.${score?.balls || 0}`;

export const MyCricket = ({ teams, onMatchClick }: { teams: Record<string, any>; onMatchClick: (id: string) => void }) => {
    const { user } = useAuth();
    const [linkedPlayer, setLinkedPlayer] = useState<any>(null);
    const [allMatches, setAllMatches] = useState<any[]>([]);
    const [loadingPlayer, setLoadingPlayer] = useState(true);
    const [loadingMatches, setLoadingMatches] = useState(true);

    useEffect(() => {
        if (!user) {
            setLinkedPlayer(null);
            setLoadingPlayer(false);
            return;
        }

        setLoadingPlayer(true);

        const unsubscribePlayer = subscribePrimaryPlayerByIdentity({
            uid: user.uid,
            email: user.email,
            phoneNumber: user.phoneNumber,
        }, (player) => {
            setLinkedPlayer(player);
            setLoadingPlayer(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'players');
            setLoadingPlayer(false);
        });

        return unsubscribePlayer;
    }, [user]);

    useEffect(() => {
        if (!user) {
            setAllMatches([]);
            setLoadingMatches(false);
            return;
        }

        setLoadingMatches(true);

        const qMatches = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(250));
        const unsubscribeMatches = onSnapshot(qMatches, (matchSnap) => {
            setAllMatches(matchSnap.docs.map((matchDoc: { id: any; data: () => any; }) => ({ id: matchDoc.id, ...matchDoc.data() })));
            setLoadingMatches(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'matches');
            setLoadingMatches(false);
        });

        return unsubscribeMatches;
    }, [user]);

    const loadingHistory = loadingPlayer || loadingMatches;
    const playerMatches = allMatches
        .filter((match: any) => {
            if (match.status !== 'live' && match.status !== 'completed') return false;
            const createdByUser = match.createdBy === user?.uid;
            const playedByLinkedPlayer = linkedPlayer ? Boolean(match.playerStats?.[linkedPlayer.id]) : false;
            return createdByUser || playedByLinkedPlayer;
        })
        .sort((a: any, b: any) => getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt));

    const aggregatedStats = playerMatches.reduce((acc, match: any) => {
        const playerMatch = linkedPlayer ? match.playerStats?.[linkedPlayer.id] : null;
        acc.matches += 1;
        acc.runs += playerMatch?.runs || 0;
        acc.wickets += playerMatch?.wickets || 0;
        acc.balls += playerMatch?.balls || 0;
        acc.ballsBowled += playerMatch?.ballsBowled || 0;
        acc.runsConceded += playerMatch?.runsConceded || 0;
        acc.highestScore = Math.max(acc.highestScore, playerMatch?.runs || 0);
        return acc;
    }, { matches: 0, runs: 0, wickets: 0, balls: 0, ballsBowled: 0, runsConceded: 0, highestScore: 0 });

    const summary = {
        matches: linkedPlayer?.stats?.matches || aggregatedStats.matches,
        runs: linkedPlayer?.stats?.runs || aggregatedStats.runs,
        wickets: linkedPlayer?.stats?.wickets || aggregatedStats.wickets,
        balls: linkedPlayer?.stats?.balls || aggregatedStats.balls,
        ballsBowled: linkedPlayer?.stats?.ballsBowled || aggregatedStats.ballsBowled,
        runsConceded: linkedPlayer?.stats?.runsConceded || aggregatedStats.runsConceded,
        highestScore: linkedPlayer?.stats?.highestScore || aggregatedStats.highestScore,
        fifties: linkedPlayer?.stats?.fifties || 0,
        centuries: linkedPlayer?.stats?.centuries || 0,
    };
    const battingAverage = summary.matches > 0 ? (summary.runs / summary.matches).toFixed(2) : '0.00';
    const strikeRate = summary.balls > 0 ? ((summary.runs / summary.balls) * 100).toFixed(1) : '0.0';
    const economyRate = summary.ballsBowled > 0 ? ((summary.runsConceded / summary.ballsBowled) * 6).toFixed(2) : '0.00';
    const recentPerformances = playerMatches
        .filter((match: any) => linkedPlayer ? Boolean(match.playerStats?.[linkedPlayer.id]) : true)
        .slice(0, 5);
    const teamHistory = Array.from(new Set(playerMatches.flatMap((match: any) => {
        const ids = [];
        if (!linkedPlayer || teams[match.teamA]?.players?.includes?.(linkedPlayer.id) || match.playerStats?.[linkedPlayer.id]) ids.push(match.teamA);
        if (!linkedPlayer || teams[match.teamB]?.players?.includes?.(linkedPlayer.id)) ids.push(match.teamB);
        return ids.map((id) => teams[id]?.name).filter(Boolean);
    })));
    const achievements = [
        summary.matches >= 1 ? 'First match recorded' : '',
        summary.highestScore >= 50 ? 'Half-century scorer' : '',
        summary.highestScore >= 100 ? 'Century scorer' : '',
        summary.wickets >= 5 ? 'Five-plus wickets' : '',
        summary.runs >= 500 ? '500 career runs' : '',
    ].filter(Boolean);

    return (
        <div className="p-4 pb-24 flex flex-col gap-6">
            <div className="bg-black text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-28 bg-yellow-500" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-24 w-24 rounded-4xl overflow-hidden border-4 border-white shadow-2xl mt-2">
                        <img
                            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${linkedPlayer?.id || user?.uid || 'my-cricket'}`}
                            alt={user?.displayName || linkedPlayer?.name || 'My Cricket'}
                            className="h-full w-full object-cover bg-white"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-500">My Cricket</p>
                    <h2 className="mt-2 text-3xl font-black italic uppercase tracking-tighter">
                        {linkedPlayer?.name || user?.displayName || 'Player Profile'}
                    </h2>
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/60">
                        {linkedPlayer?.role || 'Logged-in cricket account'}
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-3 w-full">
                        <div className="rounded-2xl bg-white/10 px-3 py-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Matches</p>
                            <p className="mt-1 text-2xl font-black italic">{summary.matches}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Runs</p>
                            <p className="mt-1 text-2xl font-black italic">{summary.runs}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Wickets</p>
                            <p className="mt-1 text-2xl font-black italic">{summary.wickets}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900">Cricket Dashboard</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400 mt-1">
                        Complete stats, recent form, teams and achievements
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    ['Bat Avg', battingAverage],
                    ['Strike Rate', strikeRate],
                    ['Best Score', summary.highestScore],
                    ['Economy', economyRate],
                    ['Balls Faced', summary.balls],
                    ['Balls Bowled', summary.ballsBowled],
                    ['50s / 100s', `${summary.fifties}/${summary.centuries}`],
                    ['Runs Given', summary.runsConceded],
                ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</p>
                        <p className="mt-2 text-2xl font-black italic text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Recent Performances</h4>
                    <div className="mt-4 flex flex-col gap-3">
                        {recentPerformances.length === 0 ? (
                            <p className="text-sm font-bold text-gray-400">No recent performances yet.</p>
                        ) : recentPerformances.map((match: any) => {
                            const playerMatch = linkedPlayer ? match.playerStats?.[linkedPlayer.id] : null;
                            return (
                                <button key={`recent-${match.id}`} onClick={() => onMatchClick(match.id)} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left">
                                    <span className="text-sm font-black text-gray-900 truncate">{teams[match.teamA]?.name || 'Team A'} vs {teams[match.teamB]?.name || 'Team B'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700">
                                        {playerMatch ? `${playerMatch.runs || 0}R ${playerMatch.wickets || 0}W` : formatScore(match.currentInnings === 2 ? match.scoreB : match.scoreA)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Teams & Achievements</h4>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {(teamHistory.length ? teamHistory : ['No team history yet']).map((name) => (
                            <span key={name} className="rounded-xl bg-yellow-50 border border-yellow-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-700">{name}</span>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        {(achievements.length ? achievements : ['Start scoring matches to unlock achievements']).map((achievement) => (
                            <div key={achievement} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm font-bold text-gray-700">{achievement}</div>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900">Match History</h3>
            </div>

            {loadingHistory ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : playerMatches.length === 0 ? (
                <div className="bg-white p-8 rounded-4xl border border-dashed border-gray-200 text-center">
                    <History size={38} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">Abhi koi match history nahi mili</p>
                    <p className="text-xs font-bold text-gray-400 mt-3">Jaise hi aap is account se match create karoge ya linked player match khelega, history yahin aa jayegi.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {!linkedPlayer && (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-[1.75rem] px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-700">Player link pending</p>
                            <p className="text-sm font-bold text-gray-700 mt-2">Abhi account ke created matches dikh rahe hain. Phone ya email se linked player milte hi playing stats bhi aa jayenge.</p>
                        </div>
                    )}
                    {playerMatches.map((match: any) => {
                        const playerMatch = linkedPlayer ? match.playerStats?.[linkedPlayer.id] : null;
                        const teamAName = teams[match.teamA]?.name || 'Team A';
                        const teamBName = teams[match.teamB]?.name || 'Team B';
                        const showPlayerStats = Boolean(playerMatch);
                        return (
                            <button
                                key={match.id}
                                onClick={() => onMatchClick(match.id)}
                                className="bg-white p-5 rounded-4xl border border-gray-100 shadow-sm text-left hover:border-yellow-200 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-700">
                                            {match.status === 'live' ? 'Live Match' : 'Completed Match'}
                                        </p>
                                        <h4 className="mt-2 text-lg font-black italic uppercase tracking-tighter text-gray-900">
                                            {teamAName} vs {teamBName}
                                        </h4>
                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                            {showPlayerStats ? `${linkedPlayer.name} performance` : 'Created by your account'}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
                                </div>

                                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {showPlayerStats ? (
                                        <>
                                            <div className="rounded-2xl bg-yellow-50 border border-yellow-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-700">Runs</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{playerMatch?.runs || 0}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Balls</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{playerMatch?.balls || 0}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Wickets</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{playerMatch?.wickets || 0}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Runs Given</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{playerMatch?.runsConceded || 0}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="rounded-2xl bg-yellow-50 border border-yellow-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-700">Team A</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{formatScore(match.scoreA)}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Team B</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{formatScore(match.scoreB)}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Overs</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{formatOvers(match.currentInnings === 2 ? match.scoreB : match.scoreA)}</p>
                                            </div>
                                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Innings</p>
                                                <p className="mt-1 text-xl font-black italic text-gray-900">{match.currentInnings || 1}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
