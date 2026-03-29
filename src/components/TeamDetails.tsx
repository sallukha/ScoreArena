import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, updateDoc, collection, query, where, onSnapshot, handleFirestoreError, OperationType, limit, addDoc, serverTimestamp, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, ArrowLeft, Search, X, ChevronRight, Trophy, Shield } from 'lucide-react';
import { Team, Player } from '../types';

interface TeamDetailsProps {
  teamId: string;
  onBack: () => void;
  onPlayerClick: (id: string) => void;
}

export const TeamDetails = ({ teamId, onBack, onPlayerClick }: TeamDetailsProps) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubTeam = onSnapshot(doc(db, 'teams', teamId), (docSnap) => {
      if (docSnap.exists()) {
        const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
        setTeam(teamData);
        
        // Fetch players in this team
        if (teamData.players && teamData.players.length > 0) {
          const q = query(collection(db, 'players'), where('__name__', 'in', teamData.players));
          onSnapshot(q, (playerSnap) => {
            setTeamPlayers(playerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
          });
        } else {
          setTeamPlayers([]);
        }
      }
      setLoading(false);
    });

    // Fetch all players to add to team
    const qAll = query(collection(db, 'players'), limit(50));
    const unsubAll = onSnapshot(qAll, (snap) => {
      setAllPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    return () => {
      unsubTeam();
      unsubAll();
    };
  }, [teamId]);

  const addPlayerToTeam = async (playerId: string) => {
    if (!team) return;
    const currentPlayers = team.players || [];
    if (currentPlayers.includes(playerId)) return;

    try {
      await updateDoc(doc(db, 'teams', teamId), {
        players: [...currentPlayers, playerId]
      });
      setIsAddingPlayer(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const removePlayerFromTeam = async (playerId: string) => {
    if (!team) return;
    const currentPlayers = team.players || [];
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        players: currentPlayers.filter(id => id !== playerId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const handleQuickAdd = async () => {
    if (!newPlayerName.trim() || !auth.currentUser || !team) return;
    setIsSaving(true);
    try {
      const playerRef = await addDoc(collection(db, 'players'), {
        name: newPlayerName.trim(),
        role: 'All-rounder',
        stats: { runs: 0, wickets: 0, matches: 0, average: 0, strikeRate: 0, economy: 0 },
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      } as any);

      const currentPlayers = team.players || [];
      await updateDoc(doc(db, 'teams', teamId), {
        players: [...currentPlayers, playerRef.id]
      });

      setIsQuickAdding(false);
      setNewPlayerName('');
    } catch (error) {
      console.error('Error quick adding player:', error);
      handleFirestoreError(error, OperationType.CREATE, 'players');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPlayers = allPlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !team?.players?.includes(p.id)
  );

  if (loading) return <div className="p-8 text-center font-bold text-gray-400 uppercase tracking-widest">Loading Team...</div>;
  if (!team) return <div className="p-8 text-center font-bold text-red-500 uppercase tracking-widest">Team not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-yellow-500 p-6 pt-12 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <button onClick={onBack} className="relative z-10 mb-6 bg-black text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-3xl font-black text-yellow-600 border-4 border-white rotate-3">
            {team.name[0]}
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-black leading-none">{team.name}</h2>
            <p className="text-black/60 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-1">
              <Users size={12} /> {teamPlayers.length} Members
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 -mt-6">
        <div className="bg-black text-white rounded-[2.5rem] p-6 shadow-2xl grid grid-cols-3 gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Played</p>
            <p className="text-xl font-black text-white italic">0</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Won</p>
            <p className="text-xl font-black text-yellow-500 italic">0</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Lost</p>
            <p className="text-xl font-black text-red-500 italic">0</p>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Squad Members
          </h3>
          <button 
            onClick={() => setIsAddingPlayer(true)}
            className="flex items-center gap-1 text-yellow-600 text-xs font-black uppercase tracking-widest"
          >
            <UserPlus size={14} /> Add Player
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {teamPlayers.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
              <Users size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest italic">No players in squad</p>
            </div>
          ) : (
            teamPlayers.map((player) => (
              <motion.div
                layout
                key={player.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-4" onClick={() => onPlayerClick(player.id)}>
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                    {player.name[0]}
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase tracking-tighter text-gray-900">{player.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{player.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removePlayerFromTeam(player.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Player Modal */}
      <AnimatePresence>
        {isAddingPlayer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingPlayer(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] z-[110] p-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">
                  {isQuickAdding ? 'Quick Add Player' : 'Select Player'}
                </h3>
                <button 
                  onClick={() => { setIsAddingPlayer(false); setIsQuickAdding(false); }} 
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {isQuickAdding ? (
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Enter player name..."
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 font-bold text-sm focus:ring-2 focus:ring-yellow-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsQuickAdding(false)}
                      className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 uppercase text-xs tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleQuickAdd}
                      disabled={isSaving || !newPlayerName.trim()}
                      className="flex-1 py-4 bg-yellow-500 rounded-2xl font-black text-black uppercase text-xs tracking-widest shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Add Player'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <button 
                      onClick={() => setIsQuickAdding(true)}
                      className="bg-black text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                    >
                      Quick Add
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {filteredPlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => addPlayerToTeam(player.id)}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-yellow-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-400">
                            {player.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{player.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{player.role}</p>
                          </div>
                        </div>
                        <UserPlus size={18} className="text-yellow-600" />
                      </button>
                    ))}
                    {filteredPlayers.length === 0 && (
                      <p className="text-center py-8 text-gray-400 font-bold uppercase tracking-widest text-xs">No players found</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
