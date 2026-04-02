import React, { useEffect, useMemo, useState } from 'react';
import { db, collection, addDoc, auth, getDocs, query, where, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, Trophy, ChevronRight, Calendar, Users, FileText } from 'lucide-react';
import { Team } from '../types';

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
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!auth.currentUser) return;
      const snapshot = await getDocs(query(collection(db, 'teams'), where('createdBy', '==', auth.currentUser.uid)));
      setTeams(snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team)));
    };

    fetchTeams().catch((error) => {
      console.error('Error fetching teams for tournament:', error);
    });
  }, []);

  const selectedTeams = useMemo(
    () => teams.filter((team) => selectedTeamIds.includes(team.id)),
    [teams, selectedTeamIds]
  );

  const playerCount = useMemo(() => {
    const playerIds = new Set<string>();
    for (const team of selectedTeams) {
      (team.players || []).forEach((playerId) => playerIds.add(playerId));
    }
    return playerIds.size;
  }, [selectedTeams]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser || selectedTeamIds.length < 2) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'tournaments'), {
        name,
        city,
        startDate,
        endDate,
        organizer: auth.currentUser.displayName || 'Score Wala Organizer',
        status: 'upcoming',
        format,
        overs,
        description,
        teams: selectedTeamIds,
        teamCount: selectedTeamIds.length,
        playerCount,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
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

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
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
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center justify-between gap-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Tournament Teams
            </label>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {selectedTeamIds.length} teams • {playerCount} players
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-sm font-bold text-gray-700">Pehle teams create karo.</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Tournament me add karne ke liye at least 2 teams chahiye</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {teams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className={`rounded-3xl border p-4 text-left transition-all ${
                      isSelected ? 'border-yellow-500 bg-yellow-50 shadow-sm' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{team.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                          {(team.players || []).length} players in squad
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isSelected ? 'Added' : 'Add Team'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
