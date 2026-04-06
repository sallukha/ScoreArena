import { Trophy } from 'lucide-react';
import { useTournaments } from '../hooks/useTournaments';

export const Tournaments = ({ onCreateTournament, onTournamentClick }: { onCreateTournament: () => void; onTournamentClick: (id: string) => void }) => {
    const { tournaments, loading } = useTournaments();

    return (
        <div className="p-4 flex flex-col gap-4 pb-24">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">TOURNAMENTS</h2>
                <button
                    onClick={onCreateTournament}
                    className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight shadow-sm"
                >
                    + Start Tournament
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
            ) : tournaments.length === 0 ? (
                <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100 flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Trophy size={40} className="text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">No Active Tournaments</h3>
                        <p className="text-sm text-gray-600 mt-1">Create or join a tournament to start competing!</p>
                    </div>
                    <button
                        onClick={onCreateTournament}
                        className="bg-black text-white px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest mt-2 hover:bg-gray-800 transition-colors"
                    >
                        Create Tournament
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tournaments.map(t => (
                        <button key={t.id} onClick={() => onTournamentClick(t.id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left">
                            <div className="bg-gray-900 p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Trophy size={20} className="text-yellow-500" />
                                    <h3 className="text-white font-bold text-sm uppercase tracking-tight">{t.name}</h3>
                                </div>
                                <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">{t.status}</span>
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest">City</span>
                                    <span className="text-gray-800 font-bold">{t.city}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest">Duration</span>
                                    <span className="text-gray-800 font-bold">{t.startDate} - {t.endDate}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold uppercase tracking-widest">Teams</span>
                                    <span className="text-gray-800 font-bold">{t.teamCount || t.teams?.length || 0}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
