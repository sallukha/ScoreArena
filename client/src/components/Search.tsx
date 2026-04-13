import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, limit, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, Users, User, Trophy, ArrowLeft, ChevronRight } from 'lucide-react';
import { Player, Team, Tournament } from '../types';

export const Search = ({ onBack, onPlayerClick, onTeamClick, onTournamentClick }: { 
  onBack: () => void,
  onPlayerClick: (id: string) => void,
  onTeamClick: (id: string) => void,
  onTournamentClick: (id: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{
    players: Player[],
    teams: Team[],
    tournaments: Tournament[]
  }>({ players: [], teams: [], tournaments: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'players' | 'teams' | 'tournaments'>('all');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 3) {
        handleSearch();
      } else {
        setResults({ players: [], teams: [], tournaments: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const term = searchTerm.toLowerCase();
      
      // Firestore doesn't support full-text search easily, so we'll do a simple prefix search
      // or just fetch all and filter client-side for small datasets.
      // For a real app, we'd use Algolia or similar.
      
      const [playersSnap, teamsSnap, tournamentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'players'), limit(20))),
        getDocs(query(collection(db, 'teams'), limit(20))),
        getDocs(query(collection(db, 'tournaments'), limit(20)))
      ]);

      const players = playersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Player))
        .filter(p => 
          p.name.toLowerCase().includes(term) || 
          (p.phoneNumber && p.phoneNumber.includes(term)) ||
          (p.email && p.email.toLowerCase().includes(term))
        );
      
      const teams = teamsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Team))
        .filter(t => t.name.toLowerCase().includes(term));
      
      const tournaments = tournamentsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Tournament))
        .filter(t => t.name.toLowerCase().includes(term));

      setResults({ players, teams, tournaments });
    } catch (error) {
      console.error('Search failed', error);
      handleFirestoreError(error, OperationType.GET, 'search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-yellow-500 p-4 sticky top-0 z-50 shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              autoFocus
              type="text"
              placeholder="Search players, teams, tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-900 shadow-sm outline-none focus:ring-2 ring-black/5 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {['all', 'players', 'teams', 'tournaments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab ? 'bg-black text-white' : 'bg-yellow-600/20 text-black/60 hover:bg-yellow-600/30'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Searching Arena...</p>
          </div>
        ) : searchTerm.length < 3 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
            <SearchIcon size={64} className="text-gray-300" />
            <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Type at least 3 characters</p>
          </div>
        ) : (
          <>
            {(activeTab === 'all' || activeTab === 'players') && results.players.length > 0 && (
              <Section title="Players" icon={User}>
                {results.players.map(player => (
                  <ResultItem 
                    key={player.id} 
                    title={player.name} 
                    subtitle={player.role} 
                    onClick={() => onPlayerClick(player.id)} 
                  />
                ))}
              </Section>
            )}

            {(activeTab === 'all' || activeTab === 'teams') && results.teams.length > 0 && (
              <Section title="Teams" icon={Users}>
                {results.teams.map(team => (
                  <ResultItem 
                    key={team.id} 
                    title={team.name} 
                    subtitle={`${team.players?.length || 0} Players`} 
                    onClick={() => onTeamClick(team.id)} 
                  />
                ))}
              </Section>
            )}

            {(activeTab === 'all' || activeTab === 'tournaments') && results.tournaments.length > 0 && (
              <Section title="Tournaments" icon={Trophy}>
                {results.tournaments.map(tournament => (
                  <ResultItem 
                    key={tournament.id} 
                    title={tournament.name} 
                    subtitle={tournament.organizer} 
                    onClick={() => onTournamentClick(tournament.id)} 
                  />
                ))}
              </Section>
            )}

            {results.players.length === 0 && results.teams.length === 0 && results.tournaments.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">No results found for "{searchTerm}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
      <Icon size={14} /> {title}
    </h3>
    <div className="flex flex-col gap-2">
      {children}
    </div>
  </div>
);

const ResultItem = ({ title, subtitle, onClick }: any) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-black text-gray-300 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
        {title[0]}
      </div>
      <div className="text-left">
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-gray-200 group-hover:text-yellow-500 transition-colors" />
  </motion.button>
);
