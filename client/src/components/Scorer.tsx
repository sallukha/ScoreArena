import { useState, useEffect } from 'react';
import { db, doc, collection, onSnapshot, auth, getDoc, handleFirestoreError, OperationType, getDocs, query, where, orderBy, limit } from '../firebase';
import { ArrowLeft, ChevronRight, User, Settings2, History, CheckCircle2, Search, RotateCcw, XCircle, AlertCircle, Trophy, Star, Target, Share2, Video } from 'lucide-react';
import { Match, Team, Player } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MilestonePoster } from './MilestonePoster';
import { useCreateMatchBallMutation, useDeleteMatchBallMutation, useUpdateMatchMutation } from '../features/matches/hooks/useMatchMutations';
import { useCreatePlayerMutation } from '../features/players/hooks/usePlayerMutations';
import { useUpdateTeamMutation } from '../features/teams/hooks/useTeamMutations';
import { useAuth } from '../contexts/AuthContext';
import { findPlayersByContact, normalizeEmail, normalizePhone, searchPlayersByContact } from '../utils/playerLookup';

const PlayerSelectionModal = ({
  isOpen,
  onClose,
  players,
  onSelect,
  title,
  selectedIds = [],
  dismissedIds = [],
  onAddPlayer,
  onFindPlayerByContact,
  onSearchPlayersByContact,
  onAddExistingPlayer,
}: {
  isOpen: boolean,
  onClose: () => void,
  players: Player[],
  onSelect: (id: string) => void,
  title: string,
  selectedIds?: string[],
  dismissedIds?: string[],
  onAddPlayer?: (payload: { name: string; contact?: string }) => void,
  onFindPlayerByContact?: (contact: string) => Promise<Player | null>,
  onSearchPlayersByContact?: (contact: string) => Promise<Player[]>,
  onAddExistingPlayer?: (player: Player) => void,
}) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [isFindingContact, setIsFindingContact] = useState(false);
  const [contactFoundPlayer, setContactFoundPlayer] = useState<Player | null>(null);
  const [contactSuggestions, setContactSuggestions] = useState<Player[]>([]);
  const [contactMessage, setContactMessage] = useState('');

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const dismissedSet = new Set(dismissedIds);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setIsAdding(false);
      setNewName('');
      setContactInput('');
      setIsFindingContact(false);
      setContactFoundPlayer(null);
      setContactSuggestions([]);
      setContactMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAdding || !onSearchPlayersByContact) return;

    const value = contactInput.trim();
    const canSearch = value.includes('@') ? value.length >= 3 : value.replace(/\D/g, '').length >= 3;
    if (!canSearch) {
      setContactSuggestions([]);
      setContactFoundPlayer(null);
      setContactMessage('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsFindingContact(true);
      try {
        const suggestions = await onSearchPlayersByContact(value);
        setContactSuggestions(suggestions);
        setContactFoundPlayer(suggestions[0] || null);
        if (suggestions.length === 0) {
          setContactMessage('Existing profile nahi mila. Naya player create ho jayega.');
        } else {
          setContactMessage('');
        }
      } finally {
        setIsFindingContact(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [contactInput, isAdding, isOpen, onSearchPlayersByContact]);

  const handleFindByContact = async () => {
    if (!onFindPlayerByContact) return;
    const value = contactInput.trim();
    const canSearch = value.includes('@') ? value.length >= 5 : value.replace(/\D/g, '').length >= 10;
    if (!canSearch) {
      setContactMessage('Valid phone ya email enter karo.');
      setContactFoundPlayer(null);
      return;
    }

    setIsFindingContact(true);
    setContactMessage('');
    try {
      const foundPlayer = await onFindPlayerByContact(value);
      setContactFoundPlayer(foundPlayer);
      if (!foundPlayer) {
        setContactMessage('Existing profile nahi mila. Naya player create ho jayega.');
      }
    } finally {
      setIsFindingContact(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">{title}</h3>
                {!isAdding && onAddPlayer && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100"
                  >
                    + Add Player
                  </button>
                )}
              </div>

              {isAdding ? (
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter player name..."
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-gray-800"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="Phone ya email (optional)"
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
                    />
                    {onFindPlayerByContact && (
                      <button
                        onClick={handleFindByContact}
                        type="button"
                        disabled={isFindingContact || !contactInput.trim()}
                        className="px-4 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {isFindingContact ? '...' : 'Find'}
                      </button>
                    )}
                  </div>
                  {isFindingContact && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Searching existing users...
                    </p>
                  )}
                  {contactSuggestions.length > 0 && onAddExistingPlayer && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-2 flex flex-col gap-2">
                      <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Suggestions</p>
                      {contactSuggestions.map((player) => (
                        <button
                          key={`scorer-contact-${player.id}`}
                          type="button"
                          onClick={() => {
                            onAddExistingPlayer(player);
                            setIsAdding(false);
                          }}
                          className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-left hover:bg-yellow-50 hover:border-yellow-200 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-900 truncate">{player.name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                {player.email || player.phoneNumber || 'No contact'} | {player.stats?.matches || 0} M
                              </p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Use</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {contactFoundPlayer && onAddExistingPlayer && (
                    <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Existing Profile Found</p>
                        <p className="text-sm font-black text-gray-900 truncate mt-1">{contactFoundPlayer.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          {contactFoundPlayer.role} | {contactFoundPlayer.stats?.matches || 0} M | {contactFoundPlayer.stats?.runs || 0} R
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAddExistingPlayer(contactFoundPlayer);
                          setIsAdding(false);
                        }}
                        className="shrink-0 bg-black text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Use
                      </button>
                    </div>
                  )}
                  {contactMessage && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {contactMessage}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsAdding(false)}
                      type="button"
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-50 uppercase text-[10px] tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmedName = newName.trim();
                        if (trimmedName && onAddPlayer) {
                          onAddPlayer({
                            name: trimmedName,
                            contact: contactInput.trim() || undefined,
                          });
                          setIsAdding(false);
                          setNewName('');
                          setContactInput('');
                          setContactFoundPlayer(null);
                          setContactMessage('');
                        }
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-black bg-yellow-500 uppercase text-[10px] tracking-widest shadow-lg shadow-yellow-500/20"
                    >
                      Add & Select
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search player..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-sm font-medium"
                  />
                </div>
              )}
            </div>

            {!isAdding && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {filtered.map(player => (
                  <button
                    key={player.id}
                    onClick={() => { onSelect(player.id); onClose(); }}
                    disabled={selectedIds.includes(player.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedIds.includes(player.id) ? 'opacity-40 bg-gray-50 blur-[1px]' : 'bg-white border-gray-100 hover:border-yellow-500 active:scale-95'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center font-bold text-yellow-600">
                        {player.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{player.role}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">
                          {player.battingStyle || 'Batting not set'} | {player.bowlingStyle || 'Bowling not set'} | {player.handedness || 'Hand not set'}
                        </p>
                      </div>
                    </div>
                    {selectedIds.includes(player.id) && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {dismissedSet.has(player.id) ? 'Out' : 'Selected'}
                        </span>
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-12 opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest">No players found</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const fetchPlayersByIds = async (playerIds: string[]) => {
  const uniqueIds = Array.from(new Set(playerIds.filter(Boolean).map(String)));
  const players: Player[] = [];

  for (let i = 0; i < uniqueIds.length; i += 10) {
    const chunk = uniqueIds.slice(i, i + 10);
    const snap = await getDocs(query(collection(db, 'players'), where('__name__', 'in', chunk)));
    players.push(...snap.docs.map((item) => ({ id: item.id, ...item.data() } as Player)));
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  return uniqueIds.map((id) => byId.get(id)).filter(Boolean) as Player[];
};

const getExtraRunOptions = (extraType: 'wide' | 'no-ball') => {
  return extraType === 'no-ball' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
};

const WicketModal = ({
  isOpen,
  onClose,
  onSelect,
  players,
  battingOptions = [],
}: {
  isOpen: boolean,
  onClose: () => void,
  onSelect: (type: string, fielderId?: string, dismissedBatterId?: string) => void,
  players: Player[],
  battingOptions?: Array<{ id: string; name: string; label: string }>,
}) => {
  const [wicketType, setWicketType] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [dismissedBatterId, setDismissedBatterId] = useState('');
  const needsFielder = wicketType === 'caught' || wicketType === 'run-out' || wicketType === 'stumped';
  const canChooseDismissedBatter = wicketType === 'run-out' || wicketType === 'retired-out' || wicketType === 'retired-hurt';
  const canConfirm = Boolean(wicketType) && (!needsFielder || Boolean(fielderId));

  useEffect(() => {
    if (!isOpen) {
      setWicketType('');
      setFielderId('');
      setDismissedBatterId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!canChooseDismissedBatter) {
      setDismissedBatterId('');
    } else if (!dismissedBatterId && battingOptions[0]?.id) {
      setDismissedBatterId(battingOptions[0].id);
    }
  }, [battingOptions, canChooseDismissedBatter, dismissedBatterId]);

  const types = [
    { id: 'bowled', label: 'Bowled' },
    { id: 'caught', label: 'Caught' },
    { id: 'lbw', label: 'LBW' },
    { id: 'run-out', label: 'Run Out' },
    { id: 'stumped', label: 'Stumped' },
    { id: 'hit-wicket', label: 'Hit Wicket' },
    { id: 'retired-out', label: 'Retired Out' },
    { id: 'retired-hurt', label: 'Retired Hurt' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] p-6 flex flex-col gap-6"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">How was the wicket?</h3>

            <div className="grid grid-cols-2 gap-3">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setWicketType(t.id)}
                  className={`py-4 rounded-2xl font-bold text-sm transition-all border ${wicketType === t.id ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {needsFielder && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Fielder</p>
                <select
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                >
                  <option value="">Select Fielder</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {canChooseDismissedBatter && battingOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dismissed Batter</p>
                <select
                  value={dismissedBatterId}
                  onChange={(e) => setDismissedBatterId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
                >
                  {battingOptions.map((player) => (
                    <option key={player.id} value={player.id}>{player.name} ({player.label})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => { onSelect(wicketType, fielderId || undefined, dismissedBatterId || undefined); onClose(); }}
              disabled={!canConfirm}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest disabled:opacity-50"
            >
              Confirm Wicket
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
const ExtrasModal = ({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean,
  onClose: () => void,
  onSelect: (type: string, runs: number) => void
}) => {
  const [type, setType] = useState('bye');
  const [runs, setRuns] = useState(0);

  const types = [
    { id: 'bye', label: 'Bye' },
    { id: 'leg-bye', label: 'Leg Bye' },
    { id: 'penalty', label: 'Penalty' },
  ];
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-white z-[110] rounded-t-[2.5rem] p-6 flex flex-col gap-6"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            <h3 className="text-xl font-black italic uppercase tracking-tight text-gray-900">Select Extra Type</h3>

            <div className="grid grid-cols-3 gap-3">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`py-4 rounded-2xl font-bold text-xs transition-all border ${type === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Runs</p>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map(r => (
                  <button
                    key={r}
                    onClick={() => setRuns(r)}
                    className={`py-3 rounded-xl font-black text-lg transition-all border ${runs === r ? 'bg-black text-white' : 'bg-gray-50 text-gray-700 border-gray-100'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { onSelect(type, runs); onClose(); }}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest"
            >
              Add Extras
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const Scorer = ({ matchId, onBack }: { matchId: string, onBack: () => void }) => {
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [battingPlayers, setBattingPlayers] = useState<Player[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [recentBalls, setRecentBalls] = useState<any[]>([]);
  const [selectionType, setSelectionType] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{
    player: { name: string; team: string };
    milestone: { type: 'runs' | 'wickets'; value: number; matchInfo: string };
  } | null>(null);
  const [shownMilestones, setShownMilestones] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [isCorrectionMenuOpen, setIsCorrectionMenuOpen] = useState(false);
  const [pendingWicketExtra, setPendingWicketExtra] = useState<null | { type: 'wide' | 'no-ball'; runs: number }>(null);
  const [overEndNotice, setOverEndNotice] = useState<null | {
    overNumber: number;
    bowlerName: string;
    scoreline: string;
  }>(null);
  const [inningsChangeNotice, setInningsChangeNotice] = useState<null | {
    battingTeamName: string;
    bowlingTeamName: string;
    scoreline: string;
    reason: 'all-out' | 'overs-complete';
    target: number;
  }>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isStreamPanelOpen, setIsStreamPanelOpen] = useState(false);
  const [streamUrlInput, setStreamUrlInput] = useState('');
  const [streamMessage, setStreamMessage] = useState('');
  const updateMatchMutation = useUpdateMatchMutation();
  const createMatchBallMutation = useCreateMatchBallMutation();
  const deleteMatchBallMutation = useDeleteMatchBallMutation();
  const createPlayerMutation = useCreatePlayerMutation();
  const updateTeamMutation = useUpdateTeamMutation();

  const handleShareLiveScore = async () => {
    if (!match || !teamA || !teamB) return;

    const inningsScore = match.currentInnings === 1 ? match.scoreA : match.scoreB;
    const shareUrl = `${window.location.origin}${window.location.pathname}?matchId=${encodeURIComponent(matchId)}`;
    const shareText = `Live on ScoreArena: ${teamA.name} vs ${teamB.name}\n\nCurrent score: ${inningsScore.runs}/${inningsScore.wickets} in ${inningsScore.overs}.${inningsScore.balls} overs`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${teamA.name} vs ${teamB.name} - Live Score`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      window.alert('Live scoring link copied. Ab ise share kar sakte ho.');
    } catch (error) {
      console.error('Error sharing live score:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshVersion((version) => version + 1);
    setIsRefreshing(false);
  };
  const [extraMode, setExtraMode] = useState<'wide' | 'no-ball' | null>(null);

  const createEmptyStats = () => ({
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    overs: 0,
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
  });

  const getDismissedBatterIds = (innings: number = match?.currentInnings || 1) => {
    return new Set(
      (match?.fallOfWickets || [])
        .filter((entry) => entry.innings === innings)
        .map((entry) => entry.player)
        .filter(Boolean)
    );
  };

  const handleSaveStreamUrl = async () => {
    if (!match) return;
    const streamUrl = streamUrlInput.trim();
    if (!streamUrl) {
      setStreamMessage('Live stream link paste karo.');
      return;
    }

    try {
      await updateMatchMutation.mutateAsync({
        matchId,
        payload: { streamUrl },
      });
      setStreamMessage('Live stream match page par show ho raha hai.');
      setIsStreamPanelOpen(false);
    } catch (error) {
      console.error('Error saving stream link:', error);
      setStreamMessage('Stream link save nahi ho paya.');
    }
  };

  const handleClearStreamUrl = async () => {
    if (!match) return;
    try {
      await updateMatchMutation.mutateAsync({
        matchId,
        payload: { streamUrl: null },
      });
      setStreamUrlInput('');
      setStreamMessage('Live stream hata diya gaya.');
    } catch (error) {
      console.error('Error clearing stream link:', error);
      setStreamMessage('Stream link remove nahi ho paya.');
    }
  };

  const getWicketsToAllOut = () => Math.max(0, battingPlayers.length - 1);

  const isBattingSideAllOut = (wickets: number) => {
    const wicketsToAllOut = getWicketsToAllOut();
    return wicketsToAllOut > 0 && wickets >= wicketsToAllOut;
  };

  const isLegalDelivery = (isExtra: boolean, extraType?: string | null) => {
    return !isExtra || extraType === 'bye' || extraType === 'leg-bye' || extraType === 'penalty';
  };

  const shouldRotateStrikeForCompletedRuns = (runs: number, extraType?: string | null) => {
    return extraType !== 'penalty' && runs % 2 !== 0;
  };

  const buildSwapInningsPayload = () => ({
    currentInnings: 2 as const,
    isFreeHit: false,
    recentBalls: [],
    striker: null,
    strikerName: null,
    nonStriker: null,
    nonStrikerName: null,
    bowler: null,
    bowlerName: null,
  });

  const openOverEndNotice = (overNumber: number, bowlerName: string, scoreline: string) => {
    setOverEndNotice({
      overNumber,
      bowlerName: bowlerName || 'Current Bowler',
      scoreline,
    });
  };

  const openInningsChangeNotice = (scoreline: string, reason: 'all-out' | 'overs-complete', target: number) => {
    setOverEndNotice(null);
    setInningsChangeNotice({
      battingTeamName: teamB?.name || 'Next Batting Team',
      bowlingTeamName: teamA?.name || 'Fielding Team',
      scoreline,
      reason,
      target,
    });
  };

  const createMatchSnapshot = () => {
    if (!match) return null;
    return {
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
      isFreeHit: Boolean((match as any).isFreeHit),
      currentInnings: match.currentInnings,
      playerStats: match.playerStats || {},
      fallOfWickets: match.fallOfWickets || [],
      recentBalls: match.recentBalls || [],
      striker: match.striker || null,
      strikerName: match.strikerName || null,
      nonStriker: match.nonStriker || null,
      nonStrikerName: match.nonStrikerName || null,
      bowler: match.bowler || null,
      bowlerName: match.bowlerName || null,
    };
  };

  const restoreSnapshotAndDeleteBalls = async (snapshotBefore: any, ballsToDelete: Array<{ id: string }>, message: string) => {
    if (!snapshotBefore) {
      setCorrectionMessage('Is ball ko edit karne ke liye snapshot available nahi hai. Last ball correction use karo.');
      return;
    }

    await updateMatchMutation.mutateAsync({
      matchId,
      payload: {
        scoreA: snapshotBefore.scoreA,
        scoreB: snapshotBefore.scoreB,
        status: snapshotBefore.status,
        isFreeHit: Boolean(snapshotBefore.isFreeHit),
        currentInnings: snapshotBefore.currentInnings,
        playerStats: snapshotBefore.playerStats || {},
        fallOfWickets: snapshotBefore.fallOfWickets || [],
        recentBalls: snapshotBefore.recentBalls || [],
        striker: snapshotBefore.striker || null,
        strikerName: snapshotBefore.strikerName || null,
        nonStriker: snapshotBefore.nonStriker || null,
        nonStrikerName: snapshotBefore.nonStrikerName || null,
        bowler: snapshotBefore.bowler || null,
        bowlerName: snapshotBefore.bowlerName || null,
        statsFinalized: false,
      },
    });

    for (const ball of ballsToDelete) {
      await deleteMatchBallMutation.mutateAsync({ matchId, ballId: ball.id });
    }

    setCorrectionMessage(message);
  };

  useEffect(() => {
    if (!matchId) return;
    const q = query(
      collection(db, 'matches', matchId, 'balls'),
      orderBy('timestamp', 'desc'),
      where('innings', '==', match?.currentInnings || 1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentBalls(snap.docs.map((d: { id: string; data: () => any }) => ({ id: d.id, ...d.data() })).slice(0, 6).reverse());
    });
    return () => unsub();
  }, [matchId, match?.currentInnings]);

  useEffect(() => {
    console.log('Scorer: Initializing match listener for:', matchId);
    const unsub = onSnapshot(doc(db, 'matches', matchId), (snap) => {
      if (snap.exists()) {
        console.log('Scorer: Match data received');
        const { id: _matchDataId, ...data } = snap.data() as Match;
        setMatch({ ...data, id: snap.id });

      } else {
        console.error('Scorer: Match not found:', matchId);
      }
      setLoading(false);
    }, (error) => {
      console.error('Scorer: Error in match listener:', error);
      handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
    });
    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    setStreamUrlInput(match?.streamUrl || '');
  }, [match?.streamUrl]);

  useEffect(() => {
    if (!match?.teamA || !match?.teamB) return;

    let cancelled = false;
    const fetchTeams = async () => {
      try {
        const [sA, sB] = await Promise.all([
          getDoc(doc(db, 'teams', match.teamA)),
          getDoc(doc(db, 'teams', match.teamB)),
        ]);

        if (cancelled) return;
        if (sA.exists()) {
          const { id: _teamADataId, ...teamAData } = sA.data() as Team;
          setTeamA({ ...teamAData, id: sA.id });
        } else {
          setTeamA(null);
        }

        if (sB.exists()) {
          const { id: _teamBDataId, ...teamBData } = sB.data() as Team;
          setTeamB({ ...teamBData, id: sB.id });
        } else {
          setTeamB(null);
        }
      } catch (err) {
        console.error('Scorer: Error fetching teams:', err);
      }
    };

    fetchTeams();
    return () => {
      cancelled = true;
    };
  }, [match?.teamA, match?.teamB, refreshVersion]);

  useEffect(() => {
    if (!match || !teamA || !teamB) return;

    let cancelled = false;
    const battingIds = match.currentInnings === 1 ? (teamA.players || []) : (teamB.players || []);
    const bowlingIds = match.currentInnings === 1 ? (teamB.players || []) : (teamA.players || []);

    const fetchCurrentInningsPlayers = async () => {
      try {
        const loadedPlayers = await fetchPlayersByIds([...battingIds, ...bowlingIds]);
        if (cancelled) return;

        const byId = new Map(loadedPlayers.map((player) => [player.id, player]));
        setBattingPlayers(battingIds.map((id) => byId.get(String(id))).filter(Boolean) as Player[]);
        setBowlingPlayers(bowlingIds.map((id) => byId.get(String(id))).filter(Boolean) as Player[]);
      } catch (err) {
        console.error('Scorer: Error fetching innings players:', err);
      }
    };

    fetchCurrentInningsPlayers();
    return () => {
      cancelled = true;
    };
  }, [
    match?.currentInnings,
    match?.id,
    teamA?.id,
    teamB?.id,
    (teamA?.players || []).join('|'),
    (teamB?.players || []).join('|'),
  ]);

  const updateMatchPlayer = async (type: 'striker' | 'nonStriker' | 'bowler', playerId: string) => {
    if (!match) return;
    console.log(`Scorer: Updating ${type} to ${playerId}`);

    if ((type === 'striker' || type === 'nonStriker') && getDismissedBatterIds().has(playerId)) {
      alert('This batter is already out and cannot bat again.');
      return;
    }

    // Find player name
    const player = (type === 'bowler' ? bowlingPlayers : battingPlayers).find(p => p.id === playerId);
    const playerName = player ? player.name : 'Unknown';

    try {
      await updateMatchMutation.mutateAsync({
        matchId,
        payload: {
          [type]: playerId,
          [`${type}Name`]: playerName,
        },
      });
      console.log(`Scorer: ${type} updated successfully`);
    } catch (error) {
      console.error(`Scorer: Error updating ${type}:`, error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const getTargetTeamIdForSelection = () => {
    if (!match || !selectionType) return null;
    const battingTeamId = match.currentInnings === 1 ? match.teamA : match.teamB;
    const bowlingTeamId = match.currentInnings === 1 ? match.teamB : match.teamA;
    return (selectionType === 'striker' || selectionType === 'nonStriker') ? battingTeamId : bowlingTeamId;
  };

  const addPlayerToTeamIfMissing = async (teamId: string, playerId: string) => {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) return;

    const teamData = teamSnap.data() as Team;
    const existingPlayers = teamData.players || [];
    const nextPlayers = Array.from(new Set([...existingPlayers, playerId]));

    if (!existingPlayers.includes(playerId)) {
      await updateTeamMutation.mutateAsync({
        teamId,
        payload: { players: nextPlayers },
      });
    }

    const { id: _teamDataId, ...teamWithoutId } = teamData;
    const nextTeam = { ...teamWithoutId, id: teamSnap.id, players: nextPlayers } as Team;
    if (teamId === teamA?.id) setTeamA(nextTeam);
    if (teamId === teamB?.id) setTeamB(nextTeam);
  };

  const handleFindPlayerByContact = async (contact: string) => {
    const players = await findPlayersByContact(contact);
    if (players.length === 0) return null;
    const nonTournamentPlayer = players.find((player) => player.scope !== 'tournament');
    return nonTournamentPlayer || players[0];
  };

  const handleSearchPlayersByContact = async (contact: string) => {
    const players = await searchPlayersByContact(contact, 8);
    return players.filter((player) => player.scope !== 'tournament');
  };

  const handleUseExistingPlayer = async (player: Player) => {
    if (!selectionType) return;
    const targetTeamId = getTargetTeamIdForSelection();
    if (!targetTeamId) return;

    await addPlayerToTeamIfMissing(targetTeamId, player.id);
    await updateMatchPlayer(selectionType, player.id);
    setSelectionType(null);
  };

  const handleQuickAddPlayer = async ({ name, contact }: { name: string; contact?: string }) => {
    if (!match || !auth.currentUser || !selectionType) return;

    try {
      const contactValue = (contact || '').trim();
      if (contactValue) {
        const existingPlayer = await handleFindPlayerByContact(contactValue);
        if (existingPlayer) {
          await handleUseExistingPlayer(existingPlayer);
          return;
        }
      }

      const playerId = await createPlayerMutation.mutateAsync({
        name,
        email: contactValue.includes('@') ? normalizeEmail(contactValue) : null,
        phoneNumber: contactValue && !contactValue.includes('@') ? normalizePhone(contactValue) : null,
        role: 'All-rounder',
        battingStyle: 'Right Hand Bat',
        bowlingStyle: 'Right Arm Medium',
        handedness: 'Right-handed',
        playerType: 'Local Player',
        stats: {
          runs: 0,
          wickets: 0,
          matches: 0,
          highestScore: 0,
          bestBowling: '--',
          average: 0,
          strikeRate: 0,
          economy: 0,
          fours: 0,
          sixes: 0,
          balls: 0,
          ballsBowled: 0,
          runsConceded: 0,
          fifties: 0,
          centuries: 0,
        },
        createdBy: auth.currentUser.uid,
      } as any);

      const targetTeamId = getTargetTeamIdForSelection();
      if (!targetTeamId) return;
      await addPlayerToTeamIfMissing(targetTeamId, playerId);
      await updateMatchPlayer(selectionType, playerId);
      setSelectionType(null);
    } catch (error) {
      console.error('Error quick adding player:', error);
      handleFirestoreError(error, OperationType.CREATE, 'players');
    }
  };

  const handleRun = async (runs: number, isExtra: boolean = false, extraType?: string) => {
    if (!match) return;

    if (!match.striker || !match.nonStriker || !match.bowler) {
      alert('Please select striker, non-striker and bowler first!');
      return;
    }

    const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentScoreKey];
    const isCurrentBallFreeHit = Boolean((match as any).isFreeHit);

    let newRuns = currentScore.runs;
    let newBalls = currentScore.balls;
    let newOvers = currentScore.overs;
    let newExtras = currentScore.extras;

    const isLegalBall = isLegalDelivery(isExtra, extraType);
    const isWideOrNoBall = extraType === 'wide' || extraType === 'no-ball';
    const totalExtraRuns = isExtra ? (isWideOrNoBall ? runs : runs) : 0;
    const completedRuns = isWideOrNoBall ? Math.max(0, runs - 1) : runs;
    const batterRuns = !isExtra ? runs : (extraType === 'no-ball' ? completedRuns : 0);

    if (isLegalBall) {
      newBalls += 1;
      if (newBalls === 6) {
        newOvers += 1;
        newBalls = 0;
      }
    }

    if (isExtra) {
      newExtras += totalExtraRuns;
      newRuns += totalExtraRuns;
    } else {
      newRuns += runs;
    }

    // Update Player Stats
    const playerStats = { ...(match.playerStats || {}) };
    const strikerId = match.striker;
    const nonStrikerId = match.nonStriker;
    const bowlerId = match.bowler;

    if (strikerId) {
      const stats = { ...(playerStats[strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      const facesBall = isLegalBall;

      if (facesBall) stats.balls += 1;
      if (batterRuns > 0) {
        stats.runs += batterRuns;
        if (batterRuns === 4) stats.fours += 1;
        if (batterRuns === 6) stats.sixes += 1;
      }
      playerStats[strikerId] = stats;
    }

    if (bowlerId) {
      const stats = { ...(playerStats[bowlerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) {
        stats.ballsBowled += 1;
        if (stats.ballsBowled === 6) {
          stats.overs += 1;
          stats.ballsBowled = 0;
        }
      }

      if (isExtra) {
        if (isWideOrNoBall) {
          stats.runsConceded += totalExtraRuns;
        }
      } else {
        stats.runsConceded += runs;
      }
      playerStats[bowlerId] = stats;
    }

    // Milestone Check for Batsman
    if (strikerId && !isExtra) {
      const stats = playerStats[strikerId];
      const oldRuns = stats.runs - runs;
      const newRunsTotal = stats.runs;

      const checkMilestone = (val: number) => {
        if (oldRuns < val && newRunsTotal >= val && !shownMilestones.has(`${strikerId}-runs-${val}`)) {
          setMilestoneData({
            player: { name: match.strikerName || 'Batsman', team: battingTeam.name },
            milestone: {
              type: 'runs',
              value: val,
              matchInfo: `${match.teamA} vs ${match.teamB}`
            }
          });
          setShownMilestones(prev => new Set(prev).add(`${strikerId}-runs-${val}`));
        }
      };

      checkMilestone(50);
      checkMilestone(100);
      checkMilestone(150);
      checkMilestone(200);
    }

    // Striker Swapping
    let newStriker: string | undefined = strikerId;
    let newNonStriker: string | undefined = nonStrikerId;

    if (shouldRotateStrikeForCompletedRuns(completedRuns, extraType)) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    // Swap on over end
    if (isLegalBall && newBalls === 0) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    let nextIsFreeHit = isCurrentBallFreeHit;
    if (extraType === 'no-ball') {
      nextIsFreeHit = true;
    } else if (isLegalBall) {
      nextIsFreeHit = false;
    }

    try {
      setCorrectionMessage('');
      const snapshotBefore = createMatchSnapshot();
      const isMatchOver = match.currentInnings === 2 &&
        (newRuns > match.scoreA.runs || (newOvers === match.overs && newBalls === 0));

      const isInningsOver = match.currentInnings === 1 &&
        (newOvers === match.overs && newBalls === 0);

      if (isInningsOver) {
        console.log('Scorer: Innings over, resetting players');
        newStriker = undefined;
        newNonStriker = undefined;
      }

      const recentBalls = [...(match.recentBalls || [])];
      recentBalls.push({
        runs: completedRuns,
        isExtra,
        extraType: extraType || null,
        isWicket: false,
        freeHit: isCurrentBallFreeHit,
      });
      if (recentBalls.length > 12) recentBalls.shift();

      await updateMatchMutation.mutateAsync({
        matchId,
        payload: {
          [currentScoreKey]: {
            ...currentScore,
            runs: newRuns,
            balls: newBalls,
            overs: newOvers,
            extras: newExtras,
          },
          status: isMatchOver ? 'completed' : 'live',
          isFreeHit: (isInningsOver || isMatchOver) ? false : nextIsFreeHit,
          ...(isInningsOver ? buildSwapInningsPayload() : {
            currentInnings: match.currentInnings,
            striker: newStriker || null,
            strikerName: newStriker === strikerId ? (match.strikerName || null) : (newStriker === nonStrikerId ? (match.nonStrikerName || null) : null),
            nonStriker: newNonStriker || null,
            nonStrikerName: newNonStriker === nonStrikerId ? (match.nonStrikerName || null) : (newNonStriker === strikerId ? (match.strikerName || null) : null),
            bowler: bowlerId || null,
            bowlerName: match.bowlerName || null,
          }),
          playerStats,
          recentBalls: isInningsOver ? [] : recentBalls,
        },
      });

      // Record ball
      await createMatchBallMutation.mutateAsync({
        matchId,
        payload: {
          innings: match.currentInnings,
          over: isLegalBall && newBalls === 0 ? newOvers - 1 : newOvers,
          ball: isLegalBall && newBalls === 0 ? 6 : newBalls,
          runs: completedRuns,
          extraType: extraType || null,
          freeHit: isCurrentBallFreeHit,
          batsman: strikerId || null,
          bowler: bowlerId || null,
          snapshotBefore,
          timestamp: new Date(),
        },
      });

      if (isInningsOver) {
        openInningsChangeNotice(
          `${newRuns}-${currentScore.wickets}`,
          newOvers === match.overs && newBalls === 0 ? 'overs-complete' : 'all-out',
          newRuns + 1
        );
        return;
      }

      if (isLegalBall && newBalls === 0 && !isInningsOver && !isMatchOver) {
        openOverEndNotice(newOvers, match.bowlerName || 'Current Bowler', `${newRuns}-${currentScore.wickets}`);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const handleWicket = async (
    type: string = 'bowled',
    fielderId?: string,
    extraType?: 'wide' | 'no-ball',
    extraRuns: number = 0,
    dismissedBatterId?: string,
  ) => {
    if (!match) return;

    if (!match.striker || !match.bowler) {
      alert('Please select striker and bowler first!');
      return;
    }

    const currentScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentScoreKey];
    const isCurrentBallFreeHit = Boolean((match as any).isFreeHit);

    if (isCurrentBallFreeHit && type !== 'run-out' && type !== 'retired-hurt') {
      alert('Free hit par sirf run-out allow hai.');
      return;
    }

    const isExtraWicket = Boolean(extraType);
    const isWideOrNoBall = extraType === 'wide' || extraType === 'no-ball';
    const extraTotal = extraType ? extraRuns : 0;
    const completedExtraRuns = isWideOrNoBall ? Math.max(0, extraRuns - 1) : extraRuns;
    const countsAsWicket = type !== 'retired-hurt';
    const newWickets = currentScore.wickets + (countsAsWicket ? 1 : 0);
    const isLegalBall = type !== 'retired-hurt' && !isExtraWicket;

    let newBalls = currentScore.balls;
    let newOvers = currentScore.overs;
    let newRuns = currentScore.runs + extraTotal;
    let newExtras = currentScore.extras + extraTotal;

    if (isLegalBall) {
      newBalls += 1;
      if (newBalls === 6) {
        newOvers += 1;
        newBalls = 0;
      }
    }

    const isAllOut = countsAsWicket && isBattingSideAllOut(newWickets);
    const isTargetReached = match.currentInnings === 2 && newRuns > match.scoreA.runs;
    const isMatchOver = match.currentInnings === 2 && (isTargetReached || isAllOut || (newOvers === match.overs && newBalls === 0));
    const isInningsOver = match.currentInnings === 1 && (isAllOut || (newOvers === match.overs && newBalls === 0));

    // Update Player Stats
    const playerStats = { ...(match.playerStats || {}) };
    const strikerId = match.striker;
    const nonStrikerId = match.nonStriker || null;
    const dismissedId = dismissedBatterId || strikerId;
    const bowlerId = match.bowler;
    const dismissedName = dismissedId
      ? (
        dismissedId === strikerId
          ? (match.strikerName || battingPlayers.find((player) => player.id === dismissedId)?.name || null)
          : (match.nonStrikerName || battingPlayers.find((player) => player.id === dismissedId)?.name || null)
      )
      : null;
    const bowlerName = bowlerId
      ? (match.bowlerName || bowlingPlayers.find((player) => player.id === bowlerId)?.name || null)
      : null;
    const fielderName = fielderId
      ? (bowlingPlayers.find((player) => player.id === fielderId)?.name || null)
      : null;

    if (strikerId) {
      const stats = { ...(playerStats[strikerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) stats.balls += 1;
      if (extraType === 'no-ball') {
        stats.runs += completedExtraRuns;
        if (completedExtraRuns === 4) stats.fours += 1;
        if (completedExtraRuns === 6) stats.sixes += 1;
      }
      playerStats[strikerId] = stats;
    }

    if (bowlerId) {
      const stats = { ...(playerStats[bowlerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 }) };
      if (isLegalBall) {
        stats.ballsBowled += 1;
        if (stats.ballsBowled === 6) {
          stats.overs += 1;
          stats.ballsBowled = 0;
        }
      }
      if (extraType) {
        stats.runsConceded += extraTotal;
      }
      const isBowlerWicket = countsAsWicket && type !== 'run-out' && type !== 'retired-out';
      if (isBowlerWicket) stats.wickets += 1;
      playerStats[bowlerId] = stats;

      // Milestone Check for Bowler
      const checkWicketMilestone = (val: number) => {
        if (stats.wickets === val && !shownMilestones.has(`${bowlerId}-wickets-${val}`)) {
          setMilestoneData({
            player: { name: match.bowlerName || 'Bowler', team: bowlingTeam.name },
            milestone: {
              type: 'wickets',
              value: val,
              matchInfo: `${match.teamA} vs ${match.teamB}`
            }
          });
          setShownMilestones(prev => new Set(prev).add(`${bowlerId}-wickets-${val}`));
        }
      };

      if (isBowlerWicket) {
        checkWicketMilestone(3);
        checkWicketMilestone(4);
        checkWicketMilestone(5);
        checkWicketMilestone(6);
        checkWicketMilestone(7);
      }
    }

    const fallOfWickets = [...(match.fallOfWickets || [])];
    if (dismissedId && countsAsWicket) {
      fallOfWickets.push({
        player: dismissedId,
        playerName: dismissedName || undefined,
        type,
        bowler: bowlerId || 'Unknown',
        bowlerName: bowlerName || undefined,
        fielder: fielderId || null,
        fielderName: fielderName || undefined,
        score: newRuns,
        balls: currentScore.balls + (currentScore.overs * 6),
        innings: match.currentInnings
      });
    }

    const recentBalls = [...(match.recentBalls || [])];
    recentBalls.push({
      runs: completedExtraRuns,
      isExtra: isExtraWicket,
      extraType: extraType || null,
      isWicket: countsAsWicket,
      wicketType: type,
      wicketFielderName: fielderName,
      freeHit: isCurrentBallFreeHit,
    });
    if (recentBalls.length > 12) recentBalls.shift();

    let nextStriker: string | null = null;
    let nextNonStriker: string | null = nonStrikerId;
    let nextStrikerName: string | null = null;
    let nextNonStrikerName: string | null = match.nonStrikerName || null;

    if (!isInningsOver) {
      const dismissedStriker = dismissedId === strikerId;
      const dismissedNonStriker = dismissedId === nonStrikerId;

      if (dismissedNonStriker) {
        nextStriker = match.striker || null;
        nextStrikerName = match.strikerName || null;
        nextNonStriker = null;
        nextNonStrikerName = null;
      } else if (isLegalBall && newBalls === 0) {
        nextStriker = match.nonStriker || null;
        nextStrikerName = match.nonStrikerName || null;
        nextNonStriker = null;
        nextNonStrikerName = null;
      } else if (shouldRotateStrikeForCompletedRuns(completedExtraRuns, extraType)) {
        nextStriker = match.nonStriker || null;
        nextStrikerName = match.nonStrikerName || null;
        nextNonStriker = null;
        nextNonStrikerName = null;
      } else if (!dismissedStriker) {
        nextStriker = match.striker || null;
        nextStrikerName = match.strikerName || null;
      }
    }

    try {
      setCorrectionMessage('');
      const snapshotBefore = createMatchSnapshot();
      await updateMatchMutation.mutateAsync({
        matchId,
        payload: {
          [currentScoreKey]: {
            ...currentScore,
            runs: newRuns,
            wickets: newWickets,
            balls: newBalls,
            overs: newOvers,
            extras: newExtras,
          },
          status: isMatchOver ? 'completed' : 'live',
          isFreeHit: (isInningsOver || isMatchOver) ? false : (isLegalBall ? false : isCurrentBallFreeHit),
          ...(isInningsOver ? buildSwapInningsPayload() : {
            currentInnings: match.currentInnings,
            striker: nextStriker,
            strikerName: nextStrikerName,
            nonStriker: nextNonStriker,
            nonStrikerName: nextNonStrikerName,
            bowler: isLegalBall && newBalls === 0 ? null : (match.bowler || null),
            bowlerName: isLegalBall && newBalls === 0 ? null : (match.bowlerName || null),
          }),
          playerStats,
          fallOfWickets,
          recentBalls: isInningsOver ? [] : recentBalls,
        },
      });

      // Record ball as wicket
      await createMatchBallMutation.mutateAsync({
        matchId,
        payload: {
          innings: match.currentInnings,
          over: newBalls === 0 && isLegalBall ? newOvers - 1 : newOvers,
          ball: newBalls === 0 && isLegalBall ? 6 : newBalls,
          runs: completedExtraRuns,
          extraType: extraType || null,
          wicket: countsAsWicket ? {
            type,
            player: dismissedId || null,
            fielder: fielderId || null,
            fielderName: fielderName || null,
          } : null,
          freeHit: isCurrentBallFreeHit,
          batsman: strikerId || null,
          bowler: bowlerId || null,
          snapshotBefore,
          timestamp: new Date(),
        },
      });

      if (isInningsOver) {
        openInningsChangeNotice(
          `${newRuns}-${newWickets}`,
          isAllOut ? 'all-out' : 'overs-complete',
          newRuns + 1
        );
        return;
      }

      if (isLegalBall && newBalls === 0 && !isInningsOver && !isMatchOver) {
        openOverEndNotice(newOvers, match.bowlerName || 'Current Bowler', `${newRuns}-${newWickets}`);
      }
    } catch (error) {
      console.error('Error recording wicket:', error);
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const undoLastBall = async () => {
    if (!match) return;
    try {
      const q = query(
        collection(db, 'matches', matchId, 'balls'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const lastBall = snap.docs[0].data() as any;
      const lastBallId = snap.docs[0].id;

      if (lastBall.snapshotBefore) {
        await restoreSnapshotAndDeleteBalls(
          lastBall.snapshotBefore,
          [{ id: lastBallId }],
          'Last ball hata diya gaya. Ab sahi ball dubara score kar do.'
        );
        return;
      }

      const scoreKey = lastBall.innings === 2 ? 'scoreB' : 'scoreA';
      const currentScore = (match as any)[scoreKey];

      const isWideOrNoBall = lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball';
      const extraRuns = lastBall.extraType ? (isWideOrNoBall ? Number(lastBall.runs || 0) + 1 : Number(lastBall.runs || 0)) : 0;
      const batterRuns = !lastBall.extraType || lastBall.extraType === 'no-ball' ? Number(lastBall.runs || 0) : 0;
      const isLegalBall = !lastBall.extraType || lastBall.extraType === 'bye' || lastBall.extraType === 'leg-bye';
      const facesBall = !lastBall.extraType || lastBall.extraType === 'no-ball' || lastBall.extraType === 'bye' || lastBall.extraType === 'leg-bye';

      let newRuns = currentScore.runs - (lastBall.extraType ? extraRuns : Number(lastBall.runs || 0));
      let newWickets = currentScore.wickets - (lastBall.wicket ? 1 : 0);
      let newBalls = currentScore.balls;
      let newOvers = currentScore.overs;
      let newExtras = currentScore.extras - extraRuns;

      if (isLegalBall) {
        if (newBalls === 0) {
          newOvers -= 1;
          newBalls = 5;
        } else {
          newBalls -= 1;
        }
      }

      const playerStats = { ...(match.playerStats || {}) };
      const strikerId = lastBall.batsman || '';
      const bowlerId = lastBall.bowler || '';

      if (strikerId) {
        const stats = { ...(playerStats[strikerId] || createEmptyStats()) };
        if (facesBall) stats.balls = Math.max(0, stats.balls - 1);
        stats.runs = Math.max(0, stats.runs - batterRuns);
        if (batterRuns === 4) stats.fours = Math.max(0, stats.fours - 1);
        if (batterRuns === 6) stats.sixes = Math.max(0, stats.sixes - 1);
        playerStats[strikerId] = stats;
      }

      if (bowlerId) {
        const stats = { ...(playerStats[bowlerId] || createEmptyStats()) };
        if (isLegalBall) {
          if (stats.ballsBowled === 0 && stats.overs > 0) {
            stats.overs = Math.max(0, stats.overs - 1);
            stats.ballsBowled = 5;
          } else {
            stats.ballsBowled = Math.max(0, stats.ballsBowled - 1);
          }
        }

        if (lastBall.extraType) {
          if (isWideOrNoBall) {
            stats.runsConceded = Math.max(0, stats.runsConceded - extraRuns);
          }
        } else {
          stats.runsConceded = Math.max(0, stats.runsConceded - Number(lastBall.runs || 0));
        }

        if (lastBall.wicket && lastBall.wicket.type !== 'run-out' && lastBall.wicket.type !== 'retired-hurt') {
          stats.wickets = Math.max(0, stats.wickets - 1);
        }
        playerStats[bowlerId] = stats;
      }

      const fallOfWickets = [...(match.fallOfWickets || [])];
      if (lastBall.wicket) {
        let removeIndex = -1;
        for (let i = fallOfWickets.length - 1; i >= 0; i -= 1) {
          const entry = fallOfWickets[i];
          if (
            entry.player === lastBall.wicket.player &&
            entry.innings === lastBall.innings &&
            entry.type === lastBall.wicket.type
          ) {
            removeIndex = i;
            break;
          }
        }
        if (removeIndex >= 0) {
          fallOfWickets.splice(removeIndex, 1);
        }
      }

      const rebuiltRecentBalls = [...(match.recentBalls || [])];
      rebuiltRecentBalls.pop();

      const strikerName =
        battingPlayers.find((player) => player.id === strikerId)?.name ||
        match.strikerName ||
        null;
      const bowlerName =
        bowlingPlayers.find((player) => player.id === bowlerId)?.name ||
        match.bowlerName ||
        null;

      const shouldRestoreFirstInnings = lastBall.innings === 1 && match.currentInnings === 2;
      const shouldRestoreLive = match.status === 'completed';

      await updateMatchMutation.mutateAsync({
        matchId,
        payload: {
          [scoreKey]: {
            ...currentScore,
            runs: Math.max(0, newRuns),
            wickets: Math.max(0, newWickets),
            balls: Math.max(0, newBalls),
            overs: Math.max(0, newOvers),
            extras: Math.max(0, newExtras),
          },
          currentInnings: shouldRestoreFirstInnings ? 1 : match.currentInnings,
          status: shouldRestoreLive ? 'live' : match.status,
          isFreeHit: Boolean(lastBall.freeHit),
          playerStats,
          fallOfWickets,
          recentBalls: rebuiltRecentBalls,
          striker: strikerId || null,
          strikerName,
          bowler: bowlerId || null,
          bowlerName,
        },
      });

      await deleteMatchBallMutation.mutateAsync({ matchId, ballId: lastBallId });
      setCorrectionMessage('Last ball hata diya gaya. Ab sahi ball dubara score kar do.');
      console.log('Last ball undone');
    } catch (error) {
      console.error('Error undoing ball:', error);
    }
  };

  const correctFromBall = async (ballId: string) => {
    if (!match) return;
    try {
      const ballSnap = await getDocs(
        query(
          collection(db, 'matches', matchId, 'balls'),
          where('innings', '==', match.currentInnings),
          orderBy('timestamp', 'asc')
        )
      );

      const allBalls = ballSnap.docs.map((item) => ({ id: item.id, ...item.data() } as any));
      const selectedIndex = allBalls.findIndex((ball) => ball.id === ballId);
      if (selectedIndex < 0) return;

      const selectedBall = allBalls[selectedIndex];
      const ballsToDelete = allBalls.slice(selectedIndex).map((ball) => ({ id: ball.id }));

      await restoreSnapshotAndDeleteBalls(
        selectedBall.snapshotBefore,
        ballsToDelete,
        'Selected ball aur uske baad ka score hata diya gaya. Ab yahin se sahi scoring continue karo.'
      );
    } catch (error) {
      console.error('Error correcting from selected ball:', error);
    }
  };

  const describeBall = (ball: any) => {
    if (!ball) return 'No last ball';
    if (ball.wicket) {
      const wicketType = String(ball.wicket.type || '');
      const fielderName = ball.wicket.fielderName || ball.wicketFielderName || '';
      if (wicketType === 'caught' && fielderName) return `Wicket • Caught by ${fielderName}`;
      if (wicketType === 'run-out' && fielderName) return `Wicket • Run out by ${fielderName}`;
      if (wicketType === 'stumped' && fielderName) return `Wicket • Stumped by ${fielderName}`;
      return `Wicket${wicketType ? ` • ${wicketType}` : ''}`;
    }
    if (ball.extraType === 'wide') return `${Number(ball.runs || 0) + 1} Wide`;
    if (ball.extraType === 'no-ball') return `${Number(ball.runs || 0) + 1} No Ball`;
    if (ball.extraType) return `${ball.runs} ${ball.extraType}`;
    return `${ball.runs} Run${Number(ball.runs) === 1 ? '' : 's'}`;
  };

  const getBallLabel = (ball: any, index: number) => {
    if (ball?.over != null && ball?.ball != null) {
      return `Over ${Number(ball.over) + 1}.${ball.ball}`;
    }
    return `Ball ${index + 1}`;
  };

  if (loading || !match || !teamA || !teamB) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canUpdateMatch = Boolean(user && (user.uid === match.createdBy || user.role === 'admin'));
  if (!canUpdateMatch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 w-full max-w-md text-center">
          <p className="text-xs font-black uppercase tracking-widest text-red-500">Scoring Locked</p>
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-gray-900 mt-3">
            {teamA.name} vs {teamB.name}
          </h2>
          <p className="text-sm font-bold text-gray-500 mt-3">
            Is live match ka scorer access sirf creator ya admin ke liye enabled hai.
          </p>
          <button
            onClick={onBack}
            className="mt-6 w-full bg-black text-white py-3 rounded-2xl font-black uppercase tracking-widest"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const battingTeam = match.currentInnings === 1 ? teamA : teamB;
  const bowlingTeam = match.currentInnings === 1 ? teamB : teamA;
  const currentScore = match.currentInnings === 1 ? match.scoreA : match.scoreB;
  const isFreeHitActive = Boolean((match as any).isFreeHit);
  const isMatchTie = match.scoreA.runs === match.scoreB.runs;
  const winningTeamName = match.scoreB.runs > match.scoreA.runs ? teamB.name : teamA.name;

  const striker = battingPlayers.find(p => p.id === match.striker);
  const nonStriker = battingPlayers.find(p => p.id === match.nonStriker);
  const bowler = bowlingPlayers.find(p => p.id === match.bowler);
  const dismissedBatterIds = getDismissedBatterIds();

  const strikerStats = match.playerStats?.[match.striker || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = match.playerStats?.[match.nonStriker || ''] || { runs: 0, balls: 0 };
  const bowlerStats = match.playerStats?.[match.bowler || ''] || { overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0 };

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <PlayerSelectionModal
        isOpen={selectionType !== null}
        onClose={() => setSelectionType(null)}
        title={selectionType === 'bowler' ? 'Select Bowler' : 'Select Batsman'}
        players={selectionType === 'bowler' ? bowlingPlayers : battingPlayers}
        onSelect={(id) => selectionType && updateMatchPlayer(selectionType, id)}
        selectedIds={selectionType === 'bowler'
          ? []
          : Array.from(new Set([
            ...Array.from(dismissedBatterIds),
            selectionType === 'striker' ? (match.nonStriker || '') : (match.striker || ''),
          ].filter(Boolean)))}
        dismissedIds={Array.from(dismissedBatterIds)}
        onAddPlayer={handleQuickAddPlayer}
        onFindPlayerByContact={handleFindPlayerByContact}
        onSearchPlayersByContact={handleSearchPlayersByContact}
        onAddExistingPlayer={handleUseExistingPlayer}
      />
      <WicketModal
        isOpen={isWicketModalOpen}
        onClose={() => {
          setIsWicketModalOpen(false);
          setPendingWicketExtra(null);
        }}
        battingOptions={[
          ...(match?.striker ? [{ id: match.striker, name: match.strikerName || 'Striker', label: 'Striker' }] : []),
          ...(match?.nonStriker ? [{ id: match.nonStriker, name: match.nonStrikerName || 'Non-striker', label: 'Non-striker' }] : []),
        ]}
        onSelect={(type, fielderId, dismissedBatterId) => {
          handleWicket(type, fielderId, pendingWicketExtra?.type, pendingWicketExtra?.runs || 0, dismissedBatterId);
          setPendingWicketExtra(null);
        }}
        players={bowlingPlayers}
      />
      <ExtrasModal
        isOpen={isExtrasModalOpen}
        onClose={() => setIsExtrasModalOpen(false)}
        onSelect={(type, runs) => handleRun(runs, true, type)}
      />
      <AnimatePresence>
        {overEndNotice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOverEndNotice(null)}
              className="fixed inset-0 z-[140] bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed inset-x-4 top-1/2 z-[150] -translate-y-1/2 rounded-[2rem] bg-white p-6 shadow-2xl border border-yellow-100 max-w-sm mx-auto"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-600">Over Complete</p>
                    <h3 className="text-3xl font-black italic uppercase tracking-tight text-gray-900 mt-2">
                      {overEndNotice.overNumber} Overs Done
                    </h3>
                  </div>
                  <div className="h-14 w-14 rounded-[1.4rem] bg-yellow-500 text-black flex items-center justify-center shadow-lg shadow-yellow-500/25">
                    <Target size={24} />
                  </div>
                </div>

                <div className="rounded-[1.6rem] bg-gray-50 border border-gray-100 p-4 flex flex-col gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Bowler Spell Update</p>
                  <p className="text-base font-bold text-gray-900">{overEndNotice.bowlerName} ka over finish ho gaya.</p>
                  <p className="text-sm font-bold text-gray-500">Score: {overEndNotice.scoreline}</p>
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                  Agla over shuru karne se pehle next bowler select kar lo.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOverEndNotice(null)}
                    className="rounded-2xl bg-gray-100 text-gray-700 py-3.5 text-[11px] font-black uppercase tracking-[0.18em]"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => {
                      setOverEndNotice(null);
                      setSelectionType('bowler');
                    }}
                    className="rounded-2xl bg-black text-white py-3.5 text-[11px] font-black uppercase tracking-[0.18em] shadow-xl"
                  >
                    Select Bowler
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {inningsChangeNotice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[145] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed inset-x-4 top-1/2 z-[155] -translate-y-1/2 rounded-[2rem] bg-white p-6 shadow-2xl border border-yellow-100 max-w-sm mx-auto"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-600">
                      {inningsChangeNotice.reason === 'all-out' ? 'All Out' : 'Innings Complete'}
                    </p>
                    <h3 className="text-3xl font-black italic uppercase tracking-tight text-gray-900 mt-2">
                      Team Swap
                    </h3>
                  </div>
                  <div className="h-14 w-14 rounded-[1.4rem] bg-yellow-500 text-black flex items-center justify-center shadow-lg shadow-yellow-500/25">
                    <ChevronRight size={26} />
                  </div>
                </div>

                <div className="rounded-[1.6rem] bg-gray-50 border border-gray-100 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Next Batting</p>
                      <p className="text-base font-black text-gray-900 truncate">{inningsChangeNotice.battingTeamName}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Target</p>
                      <p className="text-base font-black text-gray-900">{inningsChangeNotice.target}</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <p className="text-xs font-bold text-gray-500">
                    {inningsChangeNotice.bowlingTeamName} ab bowling karegi. Pehli innings score: {inningsChangeNotice.scoreline}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInningsChangeNotice(null)}
                    className="rounded-2xl bg-gray-100 text-gray-700 py-3.5 text-[11px] font-black uppercase tracking-[0.18em]"
                  >
                    Later
                  </button>
                  <button
                    onClick={() => {
                      setInningsChangeNotice(null);
                      setSelectionType('striker');
                    }}
                    className="rounded-2xl bg-black text-white py-3.5 text-[11px] font-black uppercase tracking-[0.18em] shadow-xl"
                  >
                    Start Batting
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {match.status === 'completed' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-500 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center gap-6 max-w-xs w-full border-4 border-black"
          >
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12">
              <Trophy size={48} className="text-yellow-500 -rotate-12" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-black leading-none">Match Over!</h2>
              <div className="h-1 w-12 bg-black mx-auto rounded-full mt-2" />
            </div>
            <div className="bg-black/5 p-6 rounded-[2rem] border border-black/10 w-full">
              <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">{isMatchTie ? 'Result' : 'Congratulations'}</p>
              <p className="text-2xl font-black italic uppercase tracking-tighter text-black">
                {isMatchTie ? 'Match tie ho gaya!' : `${winningTeamName} Wins!`}
              </p>
            </div>
            <button
              onClick={onBack}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
            >
              Back to Home
            </button>
          </motion.div>
        </div>
      )}
      {milestoneData && (
        <MilestonePoster
          isOpen={!!milestoneData}
          onClose={() => setMilestoneData(null)}
          player={milestoneData.player}
          milestone={milestoneData.milestone}
          shareUrl={`${window.location.origin}${window.location.pathname}?matchId=${encodeURIComponent(matchId)}`}
        />
      )}
      <div className="bg-yellow-500 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tight leading-none">{teamA.name} vs {teamB.name}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60 mt-1">{match.overs} Overs Match</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLiveScore}
            className="p-2 hover:bg-yellow-600 rounded-full transition-colors"
            title="Share Live Score"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={() => {
              setStreamUrlInput(match.streamUrl || '');
              setStreamMessage('');
              setIsStreamPanelOpen((value) => !value);
            }}
            className={`p-2 rounded-full transition-colors ${match.streamUrl ? 'bg-black text-yellow-500' : 'hover:bg-yellow-600'}`}
            title="Live Stream"
          >
            <Video size={20} />
          </button>
          <button
            onClick={handleRefresh}
            className={`p-2 hover:bg-yellow-600 rounded-full transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={undoLastBall}
            className="p-2 hover:bg-yellow-600 rounded-full transition-colors"
            title="Undo Last Ball"
          >
            <History size={20} />
          </button>
          <button className="p-2 hover:bg-yellow-600 rounded-full transition-colors">
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-black text-white p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">{battingTeam.name} Innings</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black italic">{currentScore.runs}-{currentScore.wickets}</span>
              <span className="text-lg font-bold text-gray-400">({currentScore.overs}.{currentScore.balls})</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Extras</p>
            <p className="text-lg font-bold">{currentScore.extras}</p>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex justify-between text-sm font-medium text-gray-400">
          <div className="flex gap-4">
            <span className="text-yellow-500">CRR: {(currentScore.runs / (currentScore.overs + currentScore.balls / 6) || 0).toFixed(2)}</span>
            {isFreeHitActive && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-green-300">
                Free Hit
              </span>
            )}
          </div>
          {match.currentInnings === 2 && (
            <span className="text-white font-bold">Target: {match.scoreA.runs + 1}</span>
          )}
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Streaming</h3>
            <p className="mt-1 truncate text-xs font-bold text-gray-600">
              {match.streamUrl ? 'Stream link active hai' : 'YouTube/Facebook stream link add karo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStreamUrlInput(match.streamUrl || '');
              setStreamMessage('');
              setIsStreamPanelOpen((value) => !value);
            }}
            className="shrink-0 rounded-2xl bg-black px-4 py-3 text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2"
          >
            <Video size={16} />
            {match.streamUrl ? 'Edit Stream' : 'Add Stream'}
          </button>
        </div>
      </div>

      {isStreamPanelOpen && (
        <div className="mx-4 mt-4 rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Streaming</h3>
              <p className="mt-1 text-xs font-bold text-gray-500">YouTube, Facebook ya kisi public live video ka link paste karo.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsStreamPanelOpen(false)}
              className="rounded-full bg-gray-100 p-2 text-gray-500"
              title="Close stream panel"
            >
              <XCircle size={18} />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="url"
              value={streamUrlInput}
              onChange={(event) => setStreamUrlInput(event.target.value)}
              placeholder="https://youtube.com/live/..."
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveStreamUrl}
                disabled={updateMatchMutation.isPending}
                className="rounded-2xl bg-yellow-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                Start Stream
              </button>
              <button
                type="button"
                onClick={handleClearStreamUrl}
                disabled={updateMatchMutation.isPending || !match.streamUrl}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 disabled:opacity-50"
              >
                Stop Stream
              </button>
            </div>
            {streamMessage && (
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">{streamMessage}</p>
            )}
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-4">
        {/* Warning if no players */}
        {(battingPlayers.length === 0 || bowlingPlayers.length === 0) && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-black text-red-600 uppercase tracking-tight">No Players Found</p>
              <p className="text-[10px] text-red-500 font-bold mt-1">
                The teams don't have any players assigned. Use the "+ Add Player" button in the selection modal to add players.
              </p>
            </div>
          </div>
        )}

        {/* Recent Balls Visualization */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Over</h3>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Live</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {recentBalls.map((ball, i) => (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={ball.id || i}
                className={`min-w-[40px] h-10 rounded-full flex items-center justify-center font-black text-xs shadow-sm border-2 ${ball.wicket ? 'bg-red-600 text-white border-red-700' :
                    ball.runs === 4 ? 'bg-green-500 text-white border-green-600' :
                      ball.runs === 6 ? 'bg-purple-600 text-white border-purple-700' :
                        ball.extraType === 'wide' ? 'bg-blue-500 text-white border-blue-600' :
                          ball.extraType === 'no-ball' ? 'bg-orange-500 text-white border-orange-600' :
                            ball.extraType ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
              >
                {ball.wicket ? 'W' :
                  ball.extraType === 'wide' ? `${ball.runs + 1}W` :
                    ball.extraType === 'no-ball' ? `${ball.runs + 1}N` :
                      ball.extraType ? `${ball.runs}${ball.extraType[0].toUpperCase()}` :
                        ball.runs}
              </motion.div>
            ))}
            {/* Empty slots for remaining balls in over */}
            {Array.from({ length: Math.max(0, 6 - recentBalls.filter(b => !b.extraType || b.extraType === 'bye' || b.extraType === 'leg-bye').length) }).map((_, i) => (
              <div key={`empty-${i}`} className="min-w-[40px] h-10 rounded-full border-2 border-dashed border-gray-100" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Correction Panel</h3>
              <p className="text-sm font-bold text-gray-800 mt-1 truncate">
                {describeBall(recentBalls[recentBalls.length - 1])}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                Last ball direct undo karo ya dropdown khol ke over ki kisi bhi ball ko edit karo.
              </p>
            </div>
            <button
              onClick={undoLastBall}
              disabled={recentBalls.length === 0}
              className="shrink-0 rounded-2xl bg-red-50 text-red-600 border border-red-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              Undo Last
            </button>
          </div>
          {correctionMessage && (
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">
              {correctionMessage}
            </p>
          )}
          {recentBalls.length > 0 && (
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
              <button
                onClick={() => setIsCorrectionMenuOpen((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left bg-white"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Edit Ball From This Over
                  </p>
                  <p className="text-sm font-bold text-gray-800 truncate mt-1">
                    {recentBalls.length} ball options
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className={`text-gray-400 transition-transform ${isCorrectionMenuOpen ? 'rotate-90' : ''}`}
                />
              </button>
              {isCorrectionMenuOpen && (
                <div className="p-3 border-t border-gray-100 grid grid-cols-1 gap-2">
                  {recentBalls
                    .slice()
                    .reverse()
                    .map((ball, reverseIndex) => {
                      const actualIndex = recentBalls.length - 1 - reverseIndex;
                      return (
                        <button
                          key={ball.id || actualIndex}
                          onClick={() => correctFromBall(ball.id)}
                          disabled={!ball.snapshotBefore}
                          className="w-full rounded-2xl bg-white border border-gray-100 px-3 py-3 flex items-center justify-between gap-3 text-left disabled:bg-gray-100"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {getBallLabel(ball, actualIndex)}
                            </p>
                            <p className="text-sm font-bold text-gray-800 truncate mt-1">
                              {describeBall(ball)}
                            </p>
                          </div>
                          <span className="rounded-xl bg-black text-white px-3 py-2 text-[10px] font-black uppercase tracking-widest">
                            Edit
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Batsmen & Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button
            onClick={() => setSelectionType('striker')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!striker ? 'bg-red-50 border border-red-100 animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${striker ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                {striker ? striker.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${striker ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {striker ? `${striker.name}*` : 'SELECT STRIKER'}
              </span>
            </div>
            <span className="font-black text-gray-900">{strikerStats.runs} ({strikerStats.balls})</span>
          </button>
          <div className="h-px bg-gray-50" />
          <button
            onClick={() => setSelectionType('nonStriker')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!nonStriker ? 'bg-red-50 border border-red-100 animate-pulse opacity-60' : 'opacity-60'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${nonStriker ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-600'}`}>
                {nonStriker ? nonStriker.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${nonStriker ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {nonStriker ? nonStriker.name : 'SELECT NON-STRIKER'}
              </span>
            </div>
            <span className="font-black text-gray-900">{nonStrikerStats.runs} ({nonStrikerStats.balls})</span>
          </button>
        </div>

        {/* Bowler Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <button
            onClick={() => setSelectionType('bowler')}
            className={`flex justify-between items-center group p-2 rounded-xl transition-all ${!bowler ? 'bg-red-50 border border-red-100 animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${bowler ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                {bowler ? bowler.name[0] : <AlertCircle size={14} />}
              </div>
              <span className={`font-bold ${bowler ? 'text-gray-800' : 'text-red-600 italic'}`}>
                {bowler ? bowler.name : 'SELECT BOWLER'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Figures</span>
              <span className="font-black text-gray-900">{bowlerStats.wickets}-{bowlerStats.runsConceded} ({bowlerStats.overs}.{bowlerStats.ballsBowled})</span>
            </div>
          </button>
        </div>

        {/* Ball by Ball History */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This Over</h3>
            <div className="flex gap-2">
              {recentBalls.map((ball, i) => (
                <div
                  key={ball.id || i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm ${ball.extraType === 'wide' ? 'bg-blue-500 text-white border border-blue-600' :
                      ball.extraType === 'no-ball' ? 'bg-orange-500 text-white border border-orange-600' :
                        ball.runs === 4 ? 'bg-green-500 text-white' :
                          ball.runs === 6 ? 'bg-purple-600 text-white' :
                            ball.extraType ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              'bg-gray-100 text-gray-800'
                    }`}
                >
                  {ball.extraType === 'wide' ? `${ball.runs + 1}W` :
                    ball.extraType === 'no-ball' ? `${ball.runs + 1}N` :
                      ball.runs}
                </div>
              ))}
              {recentBalls.length === 0 && <span className="text-xs text-gray-300 italic">No balls yet</span>}
            </div>
          </div>
        </div>

        {/* Scoring Buttons */}
        <div className="flex flex-col gap-4 mt-4">
          {isFreeHitActive && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Free Hit Active</p>
              <p className="mt-1 text-xs font-bold text-green-600">Is ball par sirf run-out wicket count hoga.</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {extraMode ? (
              <motion.div
                key="extra-runs"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-100 p-4 rounded-3xl flex flex-col gap-4 border-2 border-dashed border-gray-300"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-600">
                    Runs on {extraMode === 'wide' ? 'Wide' : 'No Ball'}
                  </h3>
                  <button
                    onClick={() => setExtraMode(null)}
                    className="text-xs font-black text-red-500 uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {getExtraRunOptions(extraMode).map((total) => (
                    <button
                      key={total}
                      onClick={() => {
                        handleRun(total, true, extraMode);
                        setExtraMode(null);
                      }}
                      className="h-12 bg-white rounded-xl font-black text-lg shadow-sm border-b-2 border-gray-200 active:scale-90 transition-all"
                    >
                      {total}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {getExtraRunOptions(extraMode).map((total) => (
                    <button
                      key={`wicket-${total}`}
                      onClick={() => {
                        setPendingWicketExtra({ type: extraMode, runs: total });
                        setIsWicketModalOpen(true);
                        setExtraMode(null);
                      }}
                      className="h-11 rounded-xl border border-red-100 bg-red-50 text-xs font-black text-red-600 shadow-sm active:scale-90 transition-all"
                    >
                      W+{total}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal-runs"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="grid grid-cols-4 gap-3"
              >
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <button
                    key={run}
                    onClick={() => handleRun(run)}
                    className={`h-16 rounded-2xl font-black text-xl shadow-sm active:scale-90 transition-all border-b-4 ${run === 4 ? 'bg-green-500 text-white border-green-700' :
                        run === 6 ? 'bg-purple-600 text-white border-purple-800' :
                          'bg-white text-gray-900 border-gray-200'
                      }`}
                  >
                    {run}
                  </button>
                ))}
                <button
                  onClick={() => setExtraMode('wide')}
                  className="h-16 rounded-2xl bg-blue-500 text-white font-black text-lg shadow-sm active:scale-90 transition-all border-b-4 border-blue-700"
                >
                  WD
                </button>
                <button
                  onClick={() => setExtraMode('no-ball')}
                  className="h-16 rounded-2xl bg-orange-500 text-white font-black text-lg shadow-sm active:scale-90 transition-all border-b-4 border-orange-700"
                >
                  NB
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsWicketModalOpen(true)}
            className="py-4 rounded-2xl bg-red-600 text-white font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-red-800"
          >
            Wicket
          </button>
          <button
            onClick={() => setIsExtrasModalOpen(true)}
            className="py-4 rounded-2xl bg-gray-800 text-white font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-black"
          >
            Extras
          </button>
        </div>
      </div>
    </div>
  );
};


