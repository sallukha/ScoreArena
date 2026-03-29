import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, auth, getDocs, query, where, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { ArrowLeft, Trophy, ChevronRight, Users, Settings2, CreditCard } from 'lucide-react';
import { Team } from '../types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const StartMatch = ({ onBack, onStart }: { onBack: () => void, onStart: (id: string) => void }) => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState(20);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'teams'), where('createdBy', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      setAllTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    };
    fetchTeams();
  }, []);

  const handlePayment = () => {
    if (!teamA || !teamB || teamA === teamB || !auth.currentUser) return;

    if (typeof window.Razorpay === 'undefined') {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const options = {
      key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SWjp4Hh6Wz1z7O',
      amount: 2500, // 25.00 INR in paise
      currency: "INR",
      name: "Score Wala",
      description: "Live Scoring Match Fee",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=ScoreWala",
      handler: function (response: any) {
        if (response.razorpay_payment_id) {
          createMatch();
        }
      },
      prefill: {
        name: auth.currentUser.displayName || "",
        email: auth.currentUser.email || "",
      },
      theme: {
        color: "#EAB308", // yellow-500
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const createMatch = async () => {
    setLoading(true);
    try {
      const matchData = {
        teamA,
        teamB,
        status: 'live',
        overs,
        scoreA: { runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
        scoreB: { runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0 },
        currentInnings: 1,
        playerStats: {},
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'matches'), matchData);
      onStart(docRef.id);
    } catch (error) {
      console.error('Error starting match:', error);
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPayment(true);
  };

  if (showPayment) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <div className="bg-yellow-500 p-4 flex items-center gap-4">
          <button onClick={() => setShowPayment(false)} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold italic uppercase">Payment Required</h2>
        </div>

        <div className="p-8 flex flex-col items-center justify-center flex-1 gap-8">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
            <CreditCard size={48} />
          </div>
          
          <div className="text-center">
            <h3 className="text-2xl font-black italic uppercase text-gray-900 mb-2">₹25.00</h3>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Live Scoring Fee</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 w-full flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Match</span>
              <span className="font-black text-gray-800 italic">LIVE SCORING</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Amount</span>
              <span className="font-black text-gray-800">₹25.00</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-yellow-500 text-black py-5 rounded-2xl font-black text-xl shadow-xl shadow-yellow-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3 mt-auto"
          >
            {loading ? 'Processing...' : 'Pay Now'}
            {!loading && <ChevronRight size={24} />}
          </button>
          
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            Secure payment via Razorpay
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-yellow-500 p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold italic uppercase">Start Match</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} /> Select Teams
          </label>
          <div className="flex flex-col gap-3">
            <select
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
              required
            >
              <option value="">Select Team A</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <div className="flex items-center justify-center">
              <span className="bg-yellow-100 text-yellow-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-200">VS</span>
            </div>
            <select
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
              required
            >
              <option value="">Select Team B</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Settings2 size={14} /> Match Settings
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-700">Total Overs</p>
            <div className="grid grid-cols-3 gap-3">
              {[5, 6, 8, 10, 20, 50].map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOvers(o)}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                    overs === o ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white border-gray-100 text-gray-500'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
          <Trophy size={20} className="text-blue-500 mt-1" />
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            Starting a match will create a live scorecard. You can add players to the match after starting.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !teamA || !teamB || teamA === teamB}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Scorer'}
          {!loading && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );
};
