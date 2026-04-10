import { useEffect, useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { db, query, collection, where, onSnapshot } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const Teams = ({ onCreateTeam, onCreatePlayer, onTeamClick, liveMatches }: { onCreateTeam: () => void, onCreatePlayer: () => void, onTeamClick: (id: string) => void, liveMatches: any[] }) => {
    const [teams, setTeams] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const qTeams = query(collection(db, 'teams'), where('createdBy', '==', user.uid));
        const qPlayers = query(collection(db, 'players'), where('createdBy', '==', user.uid));

        const unsubTeams = onSnapshot(qTeams, (snap) => {
            setTeams(
                snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((team: any) => team.scope !== 'tournament')
            );
        });
        const unsubPlayers = onSnapshot(qPlayers, (snap) => {
            setPlayers(
                snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((player: any) => player.scope !== 'tournament')
            );
        });

        return () => { unsubTeams(); unsubPlayers(); };
    }, [user]);

    return (
        <div className="p-4 flex flex-col gap-6 pb-24">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">MY TEAMS</h2>
                <button
                    onClick={onCreateTeam}
                    className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight shadow-sm"
                >
                    + Create Team
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {teams.map(team => {
                    const liveMatch = liveMatches.find((match) => match.teamA === team.id || match.teamB === team.id);
                    return (
                        <button
                            key={team.id}
                            onClick={() => onTeamClick(team.id)}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-yellow-200 transition-colors text-left w-full"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                                    {team.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{team.name}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <p className="text-xs text-gray-500 font-medium">{team.players?.length || 0} Players</p>
                                        {liveMatch && (
                                            <span className="rounded-full bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                                Live Now
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </button>
                    );
                })}
                {teams.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Users size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium italic">No teams created yet</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mt-4">
                <h2 className="text-lg font-bold text-gray-900">MY PLAYERS</h2>
                <button
                    onClick={onCreatePlayer}
                    className="text-yellow-600 text-xs font-bold uppercase tracking-tight"
                >
                    + Add Player
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {players.map(player => (
                    <div key={player.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-400">
                                {player.name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{player.name}</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </div>
                ))}
            </div>
        </div>
    );
};
