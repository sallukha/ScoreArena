import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { Trophy, Medal, Target, Zap, Award } from 'lucide-react';
import { Player } from '../types';

export const Leaderboard = ({ onPlayerClick }: { onPlayerClick: (id: string) => void }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'runs' | 'wickets' | 'average' | 'strikeRate'>('runs');

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'players'),
      orderBy(`stats.${category}`, 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'players');
    });

    return () => unsub();
  }, [category]);

  const categories = [
    { id: 'runs', label: 'Runs', icon: Target },
    { id: 'wickets', label: 'Wickets', icon: Zap },
    { id: 'average', label: 'Avg', icon: Award },
    { id: 'strikeRate', label: 'S/R', icon: Medal },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="bg-black text-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-yellow-500/10 rounded-full -mr-24 -mt-24 sm:-mr-32 sm:-mt-32" />
        <div className="relative z-10 flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-yellow-500">Hall of Fame</h2>
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Top Performers in the Arena</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id as any)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
              category === cat.id ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white text-gray-400 border border-gray-100'
            }`}
          >
            <cat.icon size={14} className="sm:size-4" />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-400">No stats recorded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player, index) => (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={player.id}
                onClick={() => onPlayerClick(player.id)}
                className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-yellow-200 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-200 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase tracking-tighter text-gray-900 text-lg leading-tight">{player.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{player.role}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-3xl font-black text-black italic leading-none">
                    {category === 'runs' ? player.stats?.runs :
                     category === 'wickets' ? player.stats?.wickets :
                     category === 'average' ? player.stats?.average :
                     player.stats?.strikeRate || 0}
                  </p>
                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mt-1">{category}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
