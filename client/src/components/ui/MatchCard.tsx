import React from 'react';
import { Share2 } from 'lucide-react';

export const MatchCard = ({ match, teams, onClick, isLive }: { match: any, teams: Record<string, any>, onClick: (id: string) => void, isLive?: boolean, key?: any }) => {
    const teamA = teams[match.teamA] || { name: 'Team A' };
    const teamB = teams[match.teamB] || { name: 'Team B' };

    const striker = match.playerStats?.[match.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const nonStriker = match.playerStats?.[match.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const bowler = match.playerStats?.[match.bowler] || { overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: `${teamA.name} vs ${teamB.name} - ScoreArena`,
                text: `Live Score: ${teamA.name} ${match.scoreA.runs}/${match.scoreA.wickets} vs ${teamB.name} ${match.scoreB.runs}/${match.scoreB.wickets}`,
                url: window.location.href
            });
        }
    };

    const currentInnings = match.currentInnings === 2 ? 2 : 1;
    const inningWickets = (match.fallOfWickets || []).filter((w: any) => w.innings === currentInnings);
    const recentDismissals = inningWickets.slice(-3);
    const getWicketFielderName = (wicket: any) => wicket?.fielderName || wicket?.fielder || '';
    const getWicketSummary = (wicket: any) => {
        if (!wicket) return '';
        const bowler = wicket.bowlerName || wicket.bowler || 'Bowler';
        const fielder = getWicketFielderName(wicket);
        if (wicket.type === 'caught') return fielder ? `Caught by ${fielder}` : 'Caught';
        if (wicket.type === 'stumped') return fielder ? `Stumped by ${fielder}` : 'Stumped';
        if (wicket.type === 'run-out') return fielder ? `Run out by ${fielder}` : 'Run out';
        if (wicket.type === 'lbw') return `LBW b ${bowler}`;
        if (wicket.type === 'bowled') return `Bowled by ${bowler}`;
        return `${wicket.type}${bowler ? ` • ${bowler}` : ''}`;
    };

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

                        {match.recentBalls && match.recentBalls.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mr-1">Recent</span>
                                    {match.recentBalls.slice(-6).map((ball: any, i: number) => (
                                        <div
                                            key={i}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border flex-shrink-0 ${ball.isWicket ? 'bg-red-600 text-white border-red-600' :
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
                                                    {getWicketSummary(wicket)} • {match.playerStats?.[wicket.player]?.runs || 0} ({match.playerStats?.[wicket.player]?.balls || 0})
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
