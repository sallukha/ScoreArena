import { useEffect, useState } from 'react';
import { ChevronRight, History } from 'lucide-react';
import { db, query, collection, where, limit, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { findPrimaryPlayerByIdentity } from '../utils/playerLookup';

export const MyCricket = ({ teams, onMatchClick }: { teams: Record<string, any>; onMatchClick: (id: string) => void }) => {
    const { user } = useAuth();
    const [linkedPlayer, setLinkedPlayer] = useState<any>(null);
    const [playerMatches, setPlayerMatches] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        if (!user) {
            setLinkedPlayer(null);
            setPlayerMatches([]);
            setLoadingHistory(false);
            return;
        }

        let unsubscribeMatches: (() => void) | undefined;
        const qByUid = query(collection(db, 'players'), where('createdBy', '==', user.uid), limit(1));

        const unsubPlayer = onSnapshot(qByUid, (snap) => {
            const connectPlayerHistory = (playerDoc: any) => {
                if (!playerDoc) {
                    setLinkedPlayer(null);
                    setPlayerMatches([]);
                    setLoadingHistory(false);
                    return;
                }

                const playerData = { id: playerDoc.id, ...playerDoc.data() };
                setLinkedPlayer(playerData);
                setLoadingHistory(true);

                if (unsubscribeMatches) {
                    unsubscribeMatches();
                }

                const qMatches = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(200));
                unsubscribeMatches = onSnapshot(qMatches, (matchSnap) => {
                    const allMatches = matchSnap.docs.map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() }));
                    setPlayerMatches(allMatches.filter((match: any) => Boolean(match.playerStats?.[playerData.id])));
                    setLoadingHistory(false);
                }, (error) => {
                    handleFirestoreError(error, OperationType.GET, 'matches');
                    setLoadingHistory(false);
                });
            };

            if (!snap.empty) {
                connectPlayerHistory(snap.docs[0]);
                return;
            }

            findPrimaryPlayerByIdentity({
                uid: user.uid,
                email: user.email,
                phoneNumber: user.phoneNumber,
            }).then((player) => {
                if (!player) {
                    connectPlayerHistory(null);
                    return;
                }
                connectPlayerHistory({
                    id: player.id,
                    data: () => player,
                });
            }).catch((error) => {
                handleFirestoreError(error, OperationType.GET, 'players');
                setLoadingHistory(false);
            });
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'players');
            setLoadingHistory(false);
        });

        return () => {
            unsubPlayer();
            if (unsubscribeMatches) {
                unsubscribeMatches();
            }
        };
    }, [user]);

    const summary = {
        matches: linkedPlayer?.stats?.matches || playerMatches.length,
        runs: linkedPlayer?.stats?.runs || 0,
        wickets: linkedPlayer?.stats?.wickets || 0,
    };

    return (
        <div className="p-4 pb-24 flex flex-col gap-6">
            <div className="bg-black text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-28 bg-yellow-500" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-24 w-24 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl mt-2">
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
                        {linkedPlayer?.role || 'Linked cricket profile'}
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
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900">Full Match History</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400 mt-1">
                        Logged-in player ne jitne matches khele sab yahan dikhenge
                    </p>
                </div>
            </div>

            {loadingHistory ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : !linkedPlayer ? (
                <div className="bg-white p-8 rounded-[2rem] border border-dashed border-gray-200 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">Player profile link nahi mila</p>
                    <p className="text-xs font-bold text-gray-400 mt-3">Phone ya email linked player milte hi yahin automatic history show ho jayegi.</p>
                </div>
            ) : playerMatches.length === 0 ? (
                <div className="bg-white p-10 rounded-[2rem] border border-dashed border-gray-200 text-center">
                    <History size={38} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-black uppercase tracking-widest text-gray-500">Abhi koi match history nahi mili</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {playerMatches.map((match: any) => {
                        const playerMatch = match.playerStats?.[linkedPlayer.id];
                        const teamAName = teams[match.teamA]?.name || 'Team A';
                        const teamBName = teams[match.teamB]?.name || 'Team B';
                        return (
                            <button
                                key={match.id}
                                onClick={() => onMatchClick(match.id)}
                                className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm text-left hover:border-yellow-200 transition-colors"
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
                                            {linkedPlayer.name} performance
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
                                </div>

                                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
