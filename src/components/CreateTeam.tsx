import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, auth, getDocs, query, where, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, Users, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import { Player } from '../types';

export const CreateTeam = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'players'), where('createdBy', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      setAllPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    };
    fetchPlayers();
  }, []);

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name,
        players: selectedPlayers,
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
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
            />
          </div>

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
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                    {player.name[0]}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
                  </div>
                </div>
                {selectedPlayers.includes(player.id) && <CheckCircle2 size={20} className="text-yellow-600" />}
              </button>
            ))}
            {filteredPlayers.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm font-medium italic">No players found</p>
            )}
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
