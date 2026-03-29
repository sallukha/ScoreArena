import React, { useState } from 'react';
import { db, collection, addDoc, auth, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, User, ChevronRight } from 'lucide-react';
import { Player } from '../types';

export const CreatePlayer = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<Player['role']>('Batsman');
  const [battingStyle, setBattingStyle] = useState('Right Hand Bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right Arm Fast');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'players'), {
        name,
        email: email || null,
        phoneNumber: phoneNumber || null,
        role,
        battingStyle,
        bowlingStyle,
        createdBy: auth.currentUser.uid,
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
              placeholder="Enter phone number"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-medium"
            />
          </div>
          <p className="text-[10px] text-gray-400 italic">Linking phone number allows the player to see their matches and stats on their phone.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Player Email (Optional)</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  role === r ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white border-gray-100 text-gray-500'
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
          {loading ? 'Saving...' : 'Save Player'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};
