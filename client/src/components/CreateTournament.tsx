import React, { useEffect, useMemo, useState } from 'react';
import {
  db,
  collection,
  auth,
  getDocs,
  query,
  where,
  limit,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { ArrowLeft, Trophy, ChevronRight, Calendar, Users, FileText, UserPlus, PlusCircle } from 'lucide-react';
import { Team, Player } from '../types';
import { useCreateTournamentMutation } from '../features/tournaments/hooks/useTournamentMutations';
import { useCreateTeamMutation } from '../features/teams/hooks/useTeamMutations';
import { useCreatePlayerMutation } from '../features/players/hooks/usePlayerMutations';
import { findPlayersByPhone } from '../utils/playerLookup';

const formats = ['League', 'Knockout', 'League + Knockout'];
const oversOptions = [5, 6, 8, 10, 15, 20, 30, 50];

export const CreateTournament = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('League');
  const [overs, setOvers] = useState(20);
  const [description, setDescription] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isUnlimitedTeams, setIsUnlimitedTeams] = useState(false);
  const [maxTeamsInput, setMaxTeamsInput] = useState<number>(10);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [contactInput, setContactInput] = useState('');
  const [contactFoundPlayer, setContactFoundPlayer] = useState<Player | null>(null);
  const [isFindingContact, setIsFindingContact] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<Player['role']>('All-rounder');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamPlayerSearch, setTeamPlayerSearch] = useState('');
  const [selectedTeamPlayerIds, setSelectedTeamPlayerIds] = useState<string[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [loading, setLoading] = useState(false);
  const createTournamentMutation = useCreateTournamentMutation();
  const createTeamMutation = useCreateTeamMutation();
  const createPlayerMutation = useCreatePlayerMutation();

  useEffect(() => {
    const fetchCoreData = async () => {
      if (!auth.currentUser) return;
      const [teamsSnapshot, playersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('createdBy', '==', auth.currentUser.uid))),
        getDocs(query(collection(db, 'players'), where('createdBy', '==', auth.currentUser.uid))),
      ]);
      const nextTeams = teamsSnapshot.docs
        .map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team))
        .filter((team) => team.scope !== 'tournament');
      const nextPlayers = playersSnapshot.docs
        .map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player))
        .filter((player) => player.scope !== 'tournament');
      setTeams(nextTeams);
      setPlayers(nextPlayers);
    };

    fetchCoreData().catch((error) => {
      console.error('Error fetching data for tournament:', error);
    });
  }, []);

  const selectedTeams = useMemo(
    () => teams.filter((team) => selectedTeamIds.includes(team.id)),
    [teams, selectedTeamIds],
  );

  const playerCount = useMemo(() => {
    const playerIds = new Set<string>();
    for (const team of selectedTeams) {
      (team.players || []).forEach((playerId) => playerIds.add(playerId));
    }
    return playerIds.size;
  }, [selectedTeams]);

  const maxTeams = useMemo(() => {
    if (isUnlimitedTeams) return null;
    const parsed = Number(maxTeamsInput);
    if (!Number.isFinite(parsed)) return 2;
    return Math.max(2, Math.floor(parsed));
  }, [isUnlimitedTeams, maxTeamsInput]);

  const capacityReached = maxTeams !== null && selectedTeamIds.length >= maxTeams;

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      }

      if (maxTeams !== null && prev.length >= maxTeams) {
        alert(`Team limit reached. Is tournament me max ${maxTeams} teams allowed hain.`);
        return prev;
      }

      return [...prev, teamId];
    });
  };

  const openPlayerModal = () => {
    setIsPlayerModalOpen(true);
    setContactInput('');
    setContactFoundPlayer(null);
    setNewPlayerName('');
    setNewPlayerPhone('');
    setNewPlayerEmail('');
    setNewPlayerRole('All-rounder');
  };

  const openTeamModal = () => {
    setIsTeamModalOpen(true);
    setTeamNameInput('');
    setTeamPlayerSearch('');
    setSelectedTeamPlayerIds([]);
  };

  const findPlayerByContact = async () => {
    const value = contactInput.trim();
    if (!value) return;

    setIsFindingContact(true);
    try {
      let found: Player[] = [];
      if (value.includes('@')) {
        const byEmail = await getDocs(
          query(collection(db, 'players'), where('email', '==', value), limit(5)),
        );
        found = byEmail.docs.map((playerDoc) => ({ id: playerDoc.id, ...playerDoc.data() } as Player));
      } else {
        found = await findPlayersByPhone(value);
      }
      setContactFoundPlayer(found[0] || null);
      if (found[0]) {
        setNewPlayerName(found[0].name || '');
        setNewPlayerRole(found[0].role || 'All-rounder');
        setNewPlayerPhone(found[0].phoneNumber || '');
        setNewPlayerEmail(found[0].email || '');
      }
    } catch (error) {
      console.error('Error finding player by contact:', error);
      setContactFoundPlayer(null);
    } finally {
      setIsFindingContact(false);
    }
  };

  const useExistingPlayer = () => {
    if (!contactFoundPlayer) return;
    setPlayers((prev) => {
      if (prev.some((player) => player.id === contactFoundPlayer.id)) return prev;
      return [...prev, contactFoundPlayer];
    });
    setIsPlayerModalOpen(false);
  };

  const handleCreatePlayer = async () => {
    if (!auth.currentUser || !newPlayerName.trim()) return;

    if (contactFoundPlayer) {
      useExistingPlayer();
      return;
    }

    setIsSavingPlayer(true);
    try {
      const playerId = await createPlayerMutation.mutateAsync({
        name: newPlayerName.trim(),
        email: newPlayerEmail.trim() || null,
        phoneNumber: newPlayerPhone.trim() || null,
        role: newPlayerRole,
        battingStyle: 'Right Hand Bat',
        bowlingStyle: 'Right Arm Fast',
        createdBy: auth.currentUser.uid,
        scope: 'general',
      } as any);

      const nextPlayer: Player = {
        id: playerId,
        name: newPlayerName.trim(),
        email: newPlayerEmail.trim() || '',
        phoneNumber: newPlayerPhone.trim() || '',
        role: newPlayerRole,
        battingStyle: 'Right Hand Bat',
        bowlingStyle: 'Right Arm Fast',
        createdBy: auth.currentUser.uid,
        scope: 'general',
      };
      setPlayers((prev) => [...prev, nextPlayer]);
      setIsPlayerModalOpen(false);
    } catch (error) {
      console.error('Error creating player from tournament:', error);
      alert('Player create nahi ho paaya. Please try again.');
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const toggleTeamPlayerSelection = (playerId: string) => {
    setSelectedTeamPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  const teamModalPlayers = useMemo(() => {
    const term = teamPlayerSearch.trim().toLowerCase();
    if (!term) return players;
    return players.filter((player) => {
      const byName = player.name.toLowerCase().includes(term);
      const byPhone = (player.phoneNumber || '').toLowerCase().includes(term);
      const byEmail = (player.email || '').toLowerCase().includes(term);
      return byName || byPhone || byEmail;
    });
  }, [players, teamPlayerSearch]);

  const handleCreateTeam = async () => {
    if (!auth.currentUser || !teamNameInput.trim()) return;
    if (selectedTeamPlayerIds.length === 0) {
      alert('Team me at least 1 player select karo.');
      return;
    }

    setIsSavingTeam(true);
    try {
      const teamId = await createTeamMutation.mutateAsync({
        name: teamNameInput.trim(),
        players: Array.from(new Set(selectedTeamPlayerIds)),
        captainId: selectedTeamPlayerIds[0] || '',
        createdBy: auth.currentUser.uid,
        scope: 'general',
      });
      const nextTeam: Team = {
        id: teamId,
        name: teamNameInput.trim(),
        players: Array.from(new Set(selectedTeamPlayerIds)),
        captainId: selectedTeamPlayerIds[0] || '',
        createdBy: auth.currentUser.uid,
        scope: 'general',
      };
      setTeams((prev) => [...prev, nextTeam]);
      setSelectedTeamIds((prev) => {
        if (prev.includes(teamId)) return prev;
        if (maxTeams !== null && prev.length >= maxTeams) return prev;
        return [...prev, teamId];
      });
      setIsTeamModalOpen(false);
    } catch (error) {
      console.error('Error creating team from tournament:', error);
      alert('Team create nahi ho payi. Please try again.');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser || selectedTeamIds.length < 2) return;

    if (maxTeams !== null && selectedTeamIds.length > maxTeams) {
      alert(`Selected teams limit se zyada hain. Max allowed: ${maxTeams}`);
      return;
    }

    setLoading(true);
    try {
      await createTournamentMutation.mutateAsync({
        name,
        city,
        startDate,
        endDate,
        organizer: auth.currentUser.displayName || 'ScoreArena Organizer',
        status: 'upcoming',
        format,
        overs,
        description,
        teams: selectedTeamIds,
        maxTeams,
        teamCount: selectedTeamIds.length,
        playerCount,
        createdBy: auth.currentUser.uid,
      });
      onBack();
    } catch (error) {
      console.error('Error adding tournament:', error);
      handleFirestoreError(error, OperationType.CREATE, 'tournaments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-yellow-500 p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold italic uppercase">Create Tournament</h2>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tournament Name</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Cricket Cup"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
            >
              {formats.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tournament Description</label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tournament rules, venue note, prize details..."
              className="w-full min-h-28 bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Overs Per Match</label>
          <div className="grid grid-cols-4 gap-2">
            {oversOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setOvers(option)}
                className={`rounded-2xl px-3 py-3 text-sm font-black transition-all ${
                  overs === option ? 'bg-black text-white' : 'bg-gray-50 border border-gray-100 text-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Capacity</label>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Team Limit</p>
              <p className="text-xs font-bold text-gray-700 mt-1">Enable if you want unlimited teams</p>
            </div>
            <button
              type="button"
              onClick={() => setIsUnlimitedTeams((prev) => !prev)}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${isUnlimitedTeams ? 'bg-black' : 'bg-gray-300'}`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                  isUnlimitedTeams ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!isUnlimitedTeams && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Teams (minimum 2)</label>
              <input
                type="number"
                min={2}
                value={maxTeamsInput}
                onChange={(e) => setMaxTeamsInput(Number(e.target.value || 2))}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Tournament Teams
            </label>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">
              {selectedTeamIds.length} teams | {playerCount} players | {maxTeams === null ? 'Unlimited' : `Max ${maxTeams}`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openPlayerModal}
              className="rounded-2xl bg-black text-white py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <UserPlus size={14} />
              Add Player (Phone/Email)
            </button>
            <button
              type="button"
              onClick={openTeamModal}
              className="rounded-2xl bg-yellow-500 text-black py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <PlusCircle size={14} />
              Create Team
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-sm font-bold text-gray-700">Pehle teams create karo.</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                Tournament me add karne ke liye at least 2 teams chahiye
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {teams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                const disabled = !isSelected && capacityReached;

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    disabled={disabled}
                    className={`rounded-3xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                        : 'border-gray-100 bg-white'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{team.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                          {(team.players || []).length} players in squad
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isSelected ? 'Added' : 'Add Team'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-gray-500 font-medium">
            Tournament create hone ke baad bhi aap Tournament Details se aur teams add kar sakte ho.
          </p>
        </div>

        {isPlayerModalOpen && (
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">Add Player Via Phone Or Email</h3>
              <button
                type="button"
                onClick={() => setIsPlayerModalOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder="Phone number or email"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                type="button"
                onClick={findPlayerByContact}
                disabled={isFindingContact || !contactInput.trim()}
                className="rounded-2xl bg-black text-white px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isFindingContact ? 'Finding...' : 'Find'}
              </button>
            </div>

            {contactFoundPlayer && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Existing Player Found</p>
                <p className="mt-1 text-sm font-black text-gray-900">{contactFoundPlayer.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                  {contactFoundPlayer.role} | {contactFoundPlayer.phoneNumber || '-'} | {contactFoundPlayer.email || '-'}
                </p>
                <button
                  type="button"
                  onClick={useExistingPlayer}
                  className="mt-3 rounded-xl bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                  Use This Player
                </button>
              </div>
            )}

            {!contactFoundPlayer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value as Player['role'])}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicket-keeper">Wicket-keeper</option>
                </select>
                <input
                  type="text"
                  value={newPlayerPhone}
                  onChange={(e) => setNewPlayerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <input
                  type="email"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleCreatePlayer}
              disabled={isSavingPlayer || (!contactFoundPlayer && !newPlayerName.trim())}
              className="rounded-2xl bg-yellow-500 text-black py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSavingPlayer ? 'Saving Player...' : contactFoundPlayer ? 'Use Existing Player' : 'Create Player'}
            </button>
          </div>
        )}

        {isTeamModalOpen && (
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">Create Team For Tournament</h3>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500"
              >
                Close
              </button>
            </div>

            <input
              type="text"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value)}
              placeholder="Team name"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <input
              type="text"
              value={teamPlayerSearch}
              onChange={(e) => setTeamPlayerSearch(e.target.value)}
              placeholder="Search player by name/phone/email"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />

            {teamModalPlayers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm font-bold text-gray-700">Players nahi mil rahe.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">
                  Add Player button se pehle players add karo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {teamModalPlayers.map((player) => {
                  const selected = selectedTeamPlayerIds.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleTeamPlayerSelection(player.id)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        selected ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                            {player.role} | {player.phoneNumber || '-'} | {player.email || '-'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${selected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {selected ? 'Selected' : 'Add'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateTeam}
              disabled={isSavingTeam || !teamNameInput.trim() || selectedTeamPlayerIds.length === 0}
              className="rounded-2xl bg-yellow-500 text-black py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isSavingTeam ? 'Creating Team...' : `Create Team (${selectedTeamPlayerIds.length} Players)`}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || selectedTeamIds.length < 2}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 mt-2 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Tournament'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};

