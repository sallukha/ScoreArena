import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, LayoutDashboard, History, PlusCircle } from 'lucide-react';
import { Tournament } from '../types';
import { db, query, collection, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { MatchCard } from '../components/ui/MatchCard';
import { CricketNews } from './CricketNews';

export const Home = ({ onStartMatch, onMatchClick, onPlayerClick, matches, recentMatches, globalMatches, teams, tournaments, userTeamIds }: {
    onStartMatch: () => void,
    onMatchClick: (id: string) => void,
    onPlayerClick: (id: string) => void,
    matches: any[],
    recentMatches: any[],
    globalMatches: any[],
    teams: Record<string, any>,
    tournaments: Tournament[],
    userTeamIds: string[]
}) => {
    const [topLeaders, setTopLeaders] = useState<any[]>([]);

    useEffect(() => {
        const qLeaders = query(collection(db, 'players'), orderBy('stats.runs', 'desc'), limit(3));
        const unsubLeaders = onSnapshot(qLeaders, (snap) => {
            setTopLeaders(snap.docs.map((leaderDoc) => ({ id: leaderDoc.id, ...leaderDoc.data() })));
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'players');
        });

        return () => unsubLeaders();
    }, []);

    const myLiveMatches = globalMatches.filter(m =>
        m.createdBy === matches[0]?.createdBy ||
        userTeamIds.includes(m.teamA) ||
        userTeamIds.includes(m.teamB)
    );

    const otherLiveMatches = globalMatches.filter(gm => !myLiveMatches.find(mm => mm.id === gm.id));

    return (
        <div className="p-4 flex flex-col gap-8 pb-24">
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

            <div className="flex flex-col gap-4 items-center">
                <div className="text-center">
                    <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900">Leaders Profile</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400 mt-1">Center Stage Performers</p>
                </div>

                {topLeaders.length > 0 ? (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                        {topLeaders.map((leader, index) => (
                            <button
                                key={leader.id}
                                onClick={() => onPlayerClick(leader.id)}
                                className={`rounded-[2rem] border shadow-sm text-center transition-all hover:-translate-y-1 ${index === 0
                                    ? 'bg-black text-white border-black px-6 py-7 sm:-mt-3'
                                    : 'bg-white text-gray-900 border-gray-100 px-6 py-6'
                                    }`}
                            >
                                <div className={`mx-auto h-20 w-20 rounded-[2rem] overflow-hidden border-4 ${index === 0 ? 'border-yellow-500' : 'border-yellow-100'}`}>
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.id}`}
                                        alt={leader.name}
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                <p className={`mt-4 text-[10px] font-black uppercase tracking-[0.24em] ${index === 0 ? 'text-yellow-500' : 'text-yellow-700'}`}>
                                    #{index + 1} Leader
                                </p>
                                <h3 className="mt-2 text-lg font-black italic uppercase tracking-tighter">{leader.name}</h3>
                                <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${index === 0 ? 'text-white/60' : 'text-gray-400'}`}>
                                    {leader.role || 'Cricket Player'}
                                </p>
                                <div className={`mt-5 rounded-[1.5rem] px-4 py-3 ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-yellow-50 text-gray-900 border border-yellow-100'}`}>
                                    <p className="text-[9px] font-black uppercase tracking-[0.22em]">Runs</p>
                                    <p className="mt-1 text-2xl font-black italic leading-none">{leader.stats?.runs || 0}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="w-full text-center py-10 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                        <Trophy size={36} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Leaders stats aate hi yahan show honge</p>
                    </div>
                )}
            </div>

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
                    FREE
                </div>
                <PlusCircle size={28} className="-rotate-12" />
                <span className="text-[10px] font-black uppercase tracking-tighter leading-none mt-1 -rotate-12">
                    Start
                </span>
            </motion.button>
        </div>
    );
};
