import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, auth, getDocs, query, where, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, Users, ChevronRight, Search, CheckCircle2, Link2, Trophy } from 'lucide-react';
import { Player } from '../types';
import { findPlayersByPhone } from '../utils/playerLookup';

export const CreateTeam = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [linkedSearchPlayer, setLinkedSearchPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'players'), where('createdBy', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      setAllPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    };
    fetchPlayers();
  }, []);

  const handleGlobalSearch = async () => {
    if (!search || search.length < 10) return;
    setIsSearchingGlobal(true);
    try {
      const globalPlayers = await findPlayersByPhone(search);
      setLinkedSearchPlayer(globalPlayers[0] || null);
      
      // Merge with existing players, avoiding duplicates
      setAllPlayers(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPlayers = globalPlayers.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPlayers];
      });
    } catch (error) {
      console.error('Error searching global players:', error);
      setLinkedSearchPlayer(null);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      if (!next.includes(captainId)) {
        setCaptainId('');
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name,
        players: selectedPlayers,
        captainId: captainId || '',
        createdBy: auth.currentUser.uid,
      });
      onBack();
    } catch (error) {
      console.error('Error adding team:', error);
      handleFirestoreError(error, OperationType.CREATE, 'teams');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = allPlayers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selectedPlayerOptions = allPlayers.filter((player) => selectedPlayers.includes(player.id));

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-yellow-500 p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold italic uppercase">Create Team</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Name</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Players ({selectedPlayers.length})</label>
            <button type="button" className="text-yellow-600 text-xs font-bold uppercase tracking-tight">+ New Player</button>
          </div>
          
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
              />
            </div>
            <button 
              type="button"
              onClick={handleGlobalSearch}
              disabled={isSearchingGlobal || search.length < 10}
              className="bg-black text-white px-4 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isSearchingGlobal ? '...' : 'Find'}
            </button>
          </div>

          {linkedSearchPlayer && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <Link2 size={14} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Linked Player Found</p>
                </div>
                <p className="font-black text-gray-900 truncate">{linkedSearchPlayer.name}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                  {linkedSearchPlayer.role} • {linkedSearchPlayer.stats?.runs || 0} Runs • {linkedSearchPlayer.stats?.wickets || 0} Wkts
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePlayer(linkedSearchPlayer.id)}
                className="shrink-0 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {selectedPlayers.includes(linkedSearchPlayer.id) ? 'Added' : 'Add'}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredPlayers.map(player => (
              <button
                key={player.id}
                type="button"
                onClick={() => togglePlayer(player.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  selectedPlayers.includes(player.id) ? 'bg-yellow-50 border-yellow-500 shadow-sm' : 'bg-white border-gray-100'
                }`}
                >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400 overflow-hidden">
                    {player.name[0]}
                  </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                        {captainId === player.id && (
                          <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest">
                            Captain
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
                        {player.phoneNumber && (
                          <p className="text-[10px] text-gray-400 font-medium tracking-tighter">{player.phoneNumber}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">
                        {player.stats?.matches || 0} M • {player.stats?.runs || 0} R • {player.stats?.wickets || 0} W
                      </p>
                    </div>
                  </div>
                {selectedPlayers.includes(player.id) && <CheckCircle2 size={20} className="text-yellow-600" />}
              </button>
            ))}
            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm font-medium italic flex flex-col items-center gap-2">
                <Trophy size={24} className="text-gray-200" />
                <p>No players found</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Captain</label>
            <select
              value={captainId}
              onChange={(e) => setCaptainId(e.target.value)}
              disabled={selectedPlayerOptions.length === 0}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium disabled:opacity-50"
            >
              <option value="">Select captain from selected players</option>
              {selectedPlayerOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Team'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};
