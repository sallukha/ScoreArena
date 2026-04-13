import React, { useState } from 'react';
import { auth, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, User, ChevronRight, Link2, Trophy } from 'lucide-react';
import { Player } from '../types';
import { findPlayersByContact, normalizeEmail, normalizePhone } from '../utils/playerLookup';
import { useCreatePlayerMutation } from '../features/players/hooks/usePlayerMutations';

export const CreatePlayer = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<Player['role']>('Batsman');
  const [battingStyle, setBattingStyle] = useState('Right Hand Bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [loading, setLoading] = useState(false);
  const [linkedPlayer, setLinkedPlayer] = useState<Player | null>(null);
  const [isCheckingContact, setIsCheckingContact] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const createPlayerMutation = useCreatePlayerMutation();

  const handleContactLookup = async (value: string) => {
    const trimmed = value.trim();
    const canSearch = trimmed.includes('@') ? trimmed.length >= 5 : trimmed.replace(/\D/g, '').length >= 10;
    if (!canSearch) {
      setLinkedPlayer(null);
      setInfoMessage(null);
      return;
    }

    setIsCheckingContact(true);
    try {
      const players = await findPlayersByContact(trimmed);
      const existingPlayer = players.find((player) => player.scope !== 'tournament') || null;
      setLinkedPlayer(existingPlayer);

      if (existingPlayer) {
        setName(existingPlayer.name);
        setEmail(existingPlayer.email || '');
        setPhoneNumber(existingPlayer.phoneNumber || '');
        setRole(existingPlayer.role);
        setBattingStyle(existingPlayer.battingStyle || 'Right Hand Bat');
        setBowlingStyle(existingPlayer.bowlingStyle || 'Right Arm Fast');
        setInfoMessage('Existing player profile found. Stats and history will stay linked with this email/phone.');
      } else {
        setInfoMessage(null);
      }
    } catch (error) {
      console.error('Error finding player by contact:', error);
    } finally {
      setIsCheckingContact(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser) return;

    setLoading(true);
    try {
      if (linkedPlayer) {
        setInfoMessage('This player already exists globally. Use this phone number in team search to add the same profile with full stats.');
        onBack();
        return;
      }

      await createPlayerMutation.mutateAsync({
        name,
        email: normalizeEmail(email) || null,
        phoneNumber: normalizePhone(phoneNumber) || null,
        role,
        battingStyle,
        bowlingStyle,
        createdBy: auth.currentUser.uid,
        scope: 'general',
      });
      onBack();
    } catch (error) {
      console.error('Error adding player:', error);
      handleFirestoreError(error, OperationType.CREATE, 'players');
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
        <h2 className="text-xl font-bold italic uppercase">Add New Player</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Player Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number (Recommended)</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onBlur={(e) => void handleContactLookup(e.target.value)}
              placeholder="Enter phone number"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
            />
          </div>
          <p className="text-[10px] text-gray-400 italic">Same phone/email se existing player profile, stats aur history auto link ho jayegi.</p>
          {isCheckingContact && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Checking existing profile...</p>}
        </div>

        {linkedPlayer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-yellow-700">
              <Link2 size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">Existing Player Linked</p>
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight text-gray-900">{linkedPlayer.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{linkedPlayer.role}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white px-3 py-3 border border-yellow-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Matches</p>
                <p className="mt-1 text-lg font-black text-gray-900">{linkedPlayer.stats?.matches || 0}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 border border-yellow-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Runs</p>
                <p className="mt-1 text-lg font-black text-gray-900">{linkedPlayer.stats?.runs || 0}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 border border-yellow-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Wkts</p>
                <p className="mt-1 text-lg font-black text-gray-900">{linkedPlayer.stats?.wickets || 0}</p>
              </div>
            </div>
          </div>
        )}

        {infoMessage && !linkedPlayer && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Trophy size={16} className="text-blue-600 mt-0.5" />
            <p className="text-xs font-bold text-blue-800">{infoMessage}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Player Email (Optional)</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => void handleContactLookup(e.target.value)}
              placeholder="Enter player email"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
            />
          </div>
          <p className="text-[10px] text-gray-400 italic">Linking email allows the player to see their matches on their phone.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Player Role</label>
          <div className="grid grid-cols-2 gap-3">
            {['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r as Player['role'])}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${role === r ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white border-gray-100 text-gray-500'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Batting Style</label>
          <select
            value={battingStyle}
            onChange={(e) => setBattingStyle(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium appearance-none"
          >
            <option>Right Hand Bat</option>
            <option>Left Hand Bat</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bowling Style</label>
          <select
            value={bowlingStyle}
            onChange={(e) => setBowlingStyle(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium appearance-none"
          >
            <option>Right Arm Fast</option>
            <option>Right Arm Medium</option>
            <option>Right Arm Spin</option>
            <option>Left Arm Fast</option>
            <option>Left Arm Medium</option>
            <option>Left Arm Spin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {loading ? 'Saving...' : linkedPlayer ? 'Use Existing Profile' : 'Save Player'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};
