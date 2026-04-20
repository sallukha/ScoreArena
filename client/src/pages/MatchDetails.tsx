import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Share2, Trash2 } from 'lucide-react';
import { db, doc, getDoc, query, collection, onSnapshot, orderBy } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useDeleteMatchMutation } from '../features/matches/hooks/useMatchMutations';

export const MatchDetails = ({ matchId, onBack }: { matchId: string, onBack: () => void }) => {
    const [match, setMatch] = useState<any>(null);
    const [teamA, setTeamA] = useState<any>(null);
    const [teamB, setTeamB] = useState<any>(null);
    const [balls, setBalls] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'scorecard' | 'commentary'>('info');
    const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
    const { user } = useAuth();
    const deleteMatchMutation = useDeleteMatchMutation();

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
            setBalls(snap.docs.map((d: { id: any; data: () => any; }) => ({ id: d.id, ...d.data() })).slice(0, 12));
        });

        return () => { unsubMatch(); unsubBalls(); };
    }, [matchId]);

    if (!match || !teamA || !teamB) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

    const battingTeam = match.currentInnings === 1 ? teamA : teamB;
    const getFielderName = (wicket: any) => wicket?.fielderName || (wicket?.fielder ? playerNames[wicket.fielder] : '');
    const getDismissalSummary = (wicket: any) => {
        if (!wicket) return '';
        const bowlerName = playerNames[wicket.bowler] || 'Bowler';
        const fielderName = getFielderName(wicket);
        if (wicket.type === 'caught') return fielderName ? `c ${fielderName} b ${bowlerName}` : `caught b ${bowlerName}`;
        if (wicket.type === 'stumped') return fielderName ? `st ${fielderName} b ${bowlerName}` : `stumped b ${bowlerName}`;
        if (wicket.type === 'run-out') return fielderName ? `run out (${fielderName})` : 'run out';
        if (wicket.type === 'lbw') return `lbw b ${bowlerName}`;
        if (wicket.type === 'bowled') return `b ${bowlerName}`;
        return `${wicket.type} b ${bowlerName}`;
    };
    const renderBowlingCard = (bowlingTeam: any, title: string) => {
        const bowlingRows = (bowlingTeam?.players || [])
            .map((id: string) => {
                const stats = match.playerStats?.[id];
                const totalBalls = Number(stats?.overs || 0) * 6 + Number(stats?.ballsBowled || 0);
                if (!stats || totalBalls === 0) return null;
                return { id, stats, totalBalls };
            })
            .filter(Boolean) as Array<{ id: string; stats: any; totalBalls: number }>;

        return (
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{title}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{bowlingTeam?.name || 'Team'}</span>
                </div>
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
                            {bowlingRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        No bowling data yet
                                    </td>
                                </tr>
                            ) : (
                                bowlingRows.map(({ id, stats, totalBalls }) => (
                                    <tr key={id} className="border-b border-gray-50/50">
                                        <td className="py-3 truncate max-w-25">{playerNames[id] || `Player ${id.slice(0, 4)}`}</td>
                                        <td className="py-3 text-center">{stats.overs}.{stats.ballsBowled}</td>
                                        <td className="py-3 text-center">{stats.runsConceded}</td>
                                        <td className="py-3 text-center text-red-600">{stats.wickets}</td>
                                        <td className="py-3 text-right">{(stats.runsConceded / (totalBalls / 6)).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const handleShareMatch = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const shareUrl = `${window.location.origin}${window.location.pathname}?matchId=${encodeURIComponent(matchId)}`;
        const shareText = `Watch ${teamA.name} vs ${teamB.name} on ScoreArena.\n\nScore: ${teamA.name} ${match.scoreA.runs}/${match.scoreA.wickets} vs ${teamB.name} ${match.scoreB.runs}/${match.scoreB.wickets}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${teamA.name} vs ${teamB.name} - ScoreArena`,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            window.alert('Match link copied. Ab ise share kar sakte ho.');
        } catch (error) {
            console.error('Error copying share link:', error);
            window.alert(shareUrl);
        }
    };

    const canDeleteMatch = !!user && (user.role === 'admin' || user.uid === match.createdBy);

    const handleDeleteMatch = async () => {
        const confirmation = window.confirm(
            `Delete this ${match.status === 'live' ? 'live' : 'match'}?\n\nCanceled match ko delete karne ke baad woh live list se hat jayega.`
        );
        if (!confirmation) return;

        try {
            await deleteMatchMutation.mutateAsync(matchId);
            onBack();
        } catch (error) {
            console.error('Failed to delete match:', error);
            window.alert('Match delete nahi ho paya. Please try again.');
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

            {canDeleteMatch && (
                <div className="px-4 pt-4">
                    <button
                        onClick={handleDeleteMatch}
                        disabled={deleteMatchMutation.isPending}
                        className="w-full rounded-[1.75rem] border border-red-200 bg-red-50 px-4 py-4 flex items-center justify-center gap-3 text-red-700 font-black uppercase tracking-widest text-xs disabled:opacity-60"
                    >
                        <Trash2 size={16} />
                        {deleteMatchMutation.isPending ? 'Deleting Match...' : 'Delete Match'}
                    </button>
                </div>
            )}

            <div className="flex gap-4 px-4 border-b border-gray-100 bg-white sticky top-22 z-40">
                {(['info', 'scorecard', 'commentary'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-yellow-600' : 'text-gray-400'
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
                                                <td className="py-3 truncate max-w-25">{match.strikerName || 'Striker'}*</td>
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
                                                <td className="py-3 truncate max-w-25">{match.nonStrikerName || 'Non-Striker'}</td>
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
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-110 ${ball.wicket ? 'bg-red-500 text-white' :
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
                                                            <span className="truncate max-w-25 font-black text-gray-900">{playerNames[id] || `Player ${id.slice(0, 4)}`}{isCurrentlyBatting ? '*' : ''}</span>
                                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                                                {isOut
                                                                    ? `${getDismissalSummary(isOut)} • ${s.runs} (${s.balls})`
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

                            {match.fallOfWickets?.filter((f: any) => f.innings === 1).length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fall of Wickets</h4>
                                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                                        {match.fallOfWickets.filter((f: any) => f.innings === 1).map((f: any, i: number) => (
                                            <span key={i}>
                                                {f.score}-{i + 1} ({playerNames[f.player] || 'Player'} {match.playerStats?.[f.player]?.runs || 0}
                                                /{match.playerStats?.[f.player]?.balls || 0}, {Math.floor(f.balls / 6)}.{f.balls % 6} ov)
                                                {i < match.fallOfWickets.filter((f: any) => f.innings === 1).length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            )}
                        </div>

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
                                                            <span className="truncate max-w-25 font-black text-gray-900">{playerNames[id] || `Player ${id.slice(0, 4)}`}{isCurrentlyBatting ? '*' : ''}</span>
                                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                                                {isOut
                                                                    ? `${getDismissalSummary(isOut)} • ${s.runs} (${s.balls})`
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

                            {match.fallOfWickets?.filter((f: any) => f.innings === 2).length > 0 && (
                                <div className="mt-6 pt-4 border-t border-gray-50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fall of Wickets</h4>
                                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                                        {match.fallOfWickets.filter((f: any) => f.innings === 2).map((f: any, i: number) => (
                                            <span key={i}>
                                                {f.score}-{i + 1} ({playerNames[f.player] || 'Player'} {match.playerStats?.[f.player]?.runs || 0}
                                                /{match.playerStats?.[f.player]?.balls || 0}, {Math.floor(f.balls / 6)}.{f.balls % 6} ov)
                                                {i < match.fallOfWickets.filter((f: any) => f.innings === 2).length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            )}
                        </div>

                        {renderBowlingCard(teamB, `${teamB.name} Bowling`)}
                        {renderBowlingCard(teamA, `${teamA.name} Bowling`)}
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
