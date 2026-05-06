import React, { useState, useEffect } from 'react';
import { db, doc, query, collection, where, onSnapshot, getDocs, handleFirestoreError, OperationType, limit, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, ArrowLeft, Search, X, ChevronRight, Trophy, Shield, Link2, Trash2 } from 'lucide-react';
import { Team, Player } from '../types';
import { findPlayersByContact, searchPlayersByContact } from '../utils/playerLookup';
import { useUpdateTeamMutation } from '../features/teams/hooks/useTeamMutations';
import { useCreatePlayerMutation } from '../features/players/hooks/usePlayerMutations';

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
  const [phoneLookupQuery, setPhoneLookupQuery] = useState('');
  const [linkedPhonePlayer, setLinkedPhonePlayer] = useState<Player | null>(null);
  const [contactSuggestions, setContactSuggestions] = useState<Player[]>([]);
  const [isLoadingContactSuggestions, setIsLoadingContactSuggestions] = useState(false);
  const [addPlayerMessage, setAddPlayerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const updateTeamMutation = useUpdateTeamMutation();
  const createPlayerMutation = useCreatePlayerMutation();

  const captain = teamPlayers.find((player) => player.id === team?.captainId);

  useEffect(() => {
    const unsubTeam = onSnapshot(doc(db, 'teams', teamId), async (docSnap) => {
      if (docSnap.exists()) {
        const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
        setTeam(teamData);

        const playerIds = Array.from(new Set((teamData.players || []).filter(Boolean).map(String)));
        if (playerIds.length > 0) {
          const loadedPlayers: Player[] = [];
          for (let index = 0; index < playerIds.length; index += 10) {
            const chunk = playerIds.slice(index, index + 10);
            const playerSnap = await getDocs(query(collection(db, 'players'), where('__name__', 'in', chunk)));
            loadedPlayers.push(...playerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
          }

          const playersById = new Map(loadedPlayers.map((player) => [player.id, player]));
          setTeamPlayers(playerIds.map((id) => playersById.get(id)).filter(Boolean) as Player[]);
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
    if (currentPlayers.includes(playerId)) {
      setAddPlayerMessage('Player already exists in this team.');
      return;
    }

    try {
      await updateTeamMutation.mutateAsync({
        teamId,
        payload: {
          players: Array.from(new Set([...currentPlayers, playerId])),
        },
      });
      setAddPlayerMessage('');
      setIsAddingPlayer(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const updateCaptain = async (playerId: string) => {
    if (!team) return;
    try {
      await updateTeamMutation.mutateAsync({
        teamId,
        payload: {
          captainId: playerId,
        },
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const removePlayerFromTeam = async (playerId: string) => {
    if (!team) return;
    const currentPlayers = team.players || [];
    const player = teamPlayers.find((item) => item.id === playerId);
    const confirmed = window.confirm(
      `${player?.name || 'This player'} ko team se remove karna hai?\n\nYe action sirf is team se player ko hataega.`
    );
    if (!confirmed) return;

    try {
      await updateTeamMutation.mutateAsync({
        teamId,
        payload: {
          players: currentPlayers.filter(id => id !== playerId),
          captainId: team.captainId === playerId ? '' : team.captainId || '',
        },
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const handleQuickAdd = async () => {
    if (!newPlayerName.trim() || !auth.currentUser || !team) return;
    setIsSaving(true);
    try {
      const playerId = await createPlayerMutation.mutateAsync({
        name: newPlayerName.trim(),
        role: 'All-rounder',
        scope: team.scope === 'tournament' ? 'tournament' : 'general',
        tournamentId: team.scope === 'tournament' ? team.tournamentId : undefined,
        stats: { runs: 0, wickets: 0, matches: 0, average: 0, strikeRate: 0, economy: 0 },
        createdBy: auth.currentUser.uid,
      } as any);

      const currentPlayers = team.players || [];
      await updateTeamMutation.mutateAsync({
        teamId,
        payload: {
          players: Array.from(new Set([...currentPlayers, playerId])),
        },
      } as any);

      setAddPlayerMessage('');
      setIsQuickAdding(false);
      setNewPlayerName('');
    } catch (error) {
      console.error('Error quick adding player:', error);
      handleFirestoreError(error, OperationType.CREATE, 'players');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneLookup = async () => {
    const value = phoneLookupQuery.trim();
    const canSearch = value.includes('@') ? value.length >= 5 : value.replace(/\D/g, '').length >= 10;
    if (!canSearch) return;

    try {
      const players = await findPlayersByContact(value);
      setLinkedPhonePlayer(players[0] || null);
    } catch (error) {
      console.error('Error finding player by phone:', error);
      setLinkedPhonePlayer(null);
    }
  };

  useEffect(() => {
    const value = phoneLookupQuery.trim();
    const isContactQuery = value.includes('@') || value.replace(/\D/g, '').length >= 3;

    if (!isContactQuery) {
      setContactSuggestions([]);
      setLinkedPhonePlayer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingContactSuggestions(true);
      try {
        const results = await searchPlayersByContact(value, 8);
        const filtered = results.filter((player) => !team?.players?.includes(player.id));
        setContactSuggestions(filtered);
        setLinkedPhonePlayer(filtered[0] || null);
      } catch (error) {
        console.error('Error searching contact suggestions:', error);
        setContactSuggestions([]);
      } finally {
        setIsLoadingContactSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phoneLookupQuery, team?.players]);

  const filteredPlayers = allPlayers.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notInTeam = !team?.players?.includes(p.id);
    const isTournamentTeam = team?.scope === 'tournament';

    const scopeMatches = isTournamentTeam
      ? p.scope === 'tournament' && p.tournamentId === team?.tournamentId
      : p.scope !== 'tournament';

    return matchesSearch && notInTeam && scopeMatches;
  });

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
            <p className="text-black/70 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-1">
              <Shield size={12} /> Captain: {captain?.name || 'Not Selected'}
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
            onClick={() => {
              setAddPlayerMessage('');
              setIsAddingPlayer(true);
            }}
            className="flex items-center gap-1 text-yellow-600 text-xs font-black uppercase tracking-widest"
          >
            <UserPlus size={14} /> Add Player
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {teamPlayers.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Select Captain</p>
              <select
                value={team.captainId || ''}
                onChange={(e) => updateCaptain(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 font-bold text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="">Choose captain</option>
                {teamPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-black italic uppercase tracking-tighter text-gray-900">{player.name}</h4>
                      {team.captainId === player.id && (
                        <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest">
                          Captain
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{player.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => removePlayerFromTeam(player.id)}
                  className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 transition-colors"
                  title="Remove player from team"
                >
                  <Trash2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Remove</span>
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
                  onClick={() => { setIsAddingPlayer(false); setIsQuickAdding(false); setAddPlayerMessage(''); }}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              {addPlayerMessage && (
                <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">{addPlayerMessage}</p>
                </div>
              )}

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

                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="Find by phone or email..."
                      value={phoneLookupQuery}
                      onChange={(e) => setPhoneLookupQuery(e.target.value)}
                      className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl py-4 px-4 font-bold text-sm focus:ring-2 focus:ring-yellow-500"
                    />
                    <button
                      onClick={handlePhoneLookup}
                      type="button"
                      className="bg-yellow-500 text-black px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                      disabled={isLoadingContactSuggestions || !phoneLookupQuery.trim()}
                    >
                      {isLoadingContactSuggestions ? '...' : 'Find'}
                    </button>
                  </div>

                  {contactSuggestions.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-2 flex flex-col gap-2">
                      <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Suggestions</p>
                      {contactSuggestions.map((player) => (
                        <button
                          key={`team-contact-${player.id}`}
                          type="button"
                          onClick={() => addPlayerToTeam(player.id)}
                          className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-left hover:bg-yellow-50 hover:border-yellow-200 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">
                                {player.email || player.phoneNumber || 'No contact'} | {player.stats?.matches || 0} M
                              </p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Add</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {linkedPhonePlayer && !team?.players?.includes(linkedPhonePlayer.id) && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-yellow-700 mb-2">
                          <Link2 size={14} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Existing Profile Found</p>
                        </div>
                        <p className="font-black text-gray-900 truncate">{linkedPhonePlayer.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          {linkedPhonePlayer.role} | {linkedPhonePlayer.stats?.matches || 0} M | {linkedPhonePlayer.stats?.runs || 0} R | {linkedPhonePlayer.stats?.wickets || 0} W
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addPlayerToTeam(linkedPhonePlayer.id)}
                        className="shrink-0 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Add Player
                      </button>
                    </div>
                  )}
                  {linkedPhonePlayer && team?.players?.includes(linkedPhonePlayer.id) && (
                    <div className="mb-6 bg-gray-100 border border-gray-200 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                        {linkedPhonePlayer.name} is already in this team.
                      </p>
                    </div>
                  )}

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
                            <p className="text-[10px] text-gray-400 font-bold mt-1">
                              {player.stats?.matches || 0} M | {player.stats?.runs || 0} R | {player.stats?.wickets || 0} W
                            </p>
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
