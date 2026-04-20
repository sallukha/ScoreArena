import { useEffect, useState } from 'react';
import { LogOut, Pencil, Check, X } from 'lucide-react';
import { db, doc, getDocs, setDoc, query, collection, where, onSnapshot, limit } from '../firebase';
import { optimizeProfileImage } from '../lib/imageUtils';
import { useAuth } from '../contexts/AuthContext';
import { StatBox } from '../components/ui/StatBox';
import { findPrimaryPlayerByIdentity, normalizePhone } from '../utils/playerLookup';

export const Profile = () => {
    const { user, logout } = useAuth();
    const [playerStats, setPlayerStats] = useState<any>(null);
    const [phoneInput, setPhoneInput] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [imagePreview, setImagePreview] = useState('');
    const [isSavingImage, setIsSavingImage] = useState(false);
    const [imageMessage, setImageMessage] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [displayNameInput, setDisplayNameInput] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState('');

    useEffect(() => {
        if (!user) return;

        const qByUid = query(collection(db, 'players'), where('createdBy', '==', user.uid), limit(1));
        const unsubByUid = onSnapshot(qByUid, (snap) => {
            if (!snap.empty) {
                setPlayerStats({ id: snap.docs[0].id, ...snap.docs[0].data() });
            } else {
                findPrimaryPlayerByIdentity({
                    uid: user.uid,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                }).then((player) => {
                    setPlayerStats(player || null);
                }).catch((error) => {
                    console.error('Error resolving linked profile player:', error);
                });
            }
        });

        return () => unsubByUid();
    }, [user]);

    useEffect(() => {
        setImagePreview(user?.photoURL || '');
    }, [user?.photoURL]);

    useEffect(() => {
        setDisplayNameInput(user?.displayName || '');
    }, [user?.displayName]);

    const handleLinkPhone = async () => {
        if (!user || !phoneInput || phoneInput.length < 10) return;
        setIsLinking(true);
        try {
            const normalizedPhone = normalizePhone(phoneInput);
            await setDoc(doc(db, 'users', user.uid), {
                ...user,
                phoneNumber: normalizedPhone
            });

            const q = query(collection(db, 'players'), where('phoneNumber', '==', normalizedPhone), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setPlayerStats(snap.docs[0].data());
            }

            setPhoneInput('');
        } catch (error) {
            console.error('Error linking phone:', error);
        } finally {
            setIsLinking(false);
        }
    };

    const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!user || !file) return;

        if (!file.type.startsWith('image/')) {
            setImageMessage('Please choose an image file.');
            event.target.value = '';
            return;
        }

        setIsSavingImage(true);
        setImageMessage('');
        try {
            const optimizedImage = await optimizeProfileImage(file);
            const nextUser = { ...user, photoURL: optimizedImage };
            await setDoc(doc(db, 'users', user.uid), nextUser);
            setImagePreview(optimizedImage);
            setImageMessage('Profile image updated.');
        } catch (error) {
            console.error('Error saving profile image:', error);
            setImageMessage('Profile image save nahi ho paayi. Dusri image try karo.');
        } finally {
            setIsSavingImage(false);
            event.target.value = '';
        }
    };

    const handleRemoveProfileImage = async () => {
        if (!user) return;

        setIsSavingImage(true);
        setImageMessage('');
        try {
            const nextUser = { ...user, photoURL: '' };
            await setDoc(doc(db, 'users', user.uid), nextUser);
            setImagePreview('');
            setImageMessage('Profile image removed.');
        } catch (error) {
            console.error('Error removing profile image:', error);
            setImageMessage('Profile image remove nahi ho paayi.');
        } finally {
            setIsSavingImage(false);
        }
    };

    const handleSaveDisplayName = async () => {
        const trimmedName = displayNameInput.trim();
        if (!user || !trimmedName) return;

        setIsSavingName(true);
        setNameMessage('');
        try {
            const nextUser = { ...user, displayName: trimmedName };
            await setDoc(doc(db, 'users', user.uid), nextUser);

            if (playerStats?.id) {
                await setDoc(doc(db, 'players', playerStats.id), {
                    ...playerStats,
                    name: trimmedName,
                });
                setPlayerStats((prev: any) => prev ? { ...prev, name: trimmedName } : prev);
            }

            setIsEditingName(false);
            setNameMessage('Profile name updated.');
        } catch (error) {
            console.error('Error saving display name:', error);
            setNameMessage('Name update nahi ho paaya.');
        } finally {
            setIsSavingName(false);
        }
    };

    const stats = {
        matches: playerStats?.stats?.matches || 0,
        runs: playerStats?.stats?.runs || 0,
        wickets: playerStats?.stats?.wickets || 0,
        fours: playerStats?.stats?.fours || 0,
        sixes: playerStats?.stats?.sixes || 0,
        balls: playerStats?.stats?.balls || 0,
        ballsBowled: playerStats?.stats?.ballsBowled || 0,
        runsConceded: playerStats?.stats?.runsConceded || 0,
        fifties: playerStats?.stats?.fifties || 0,
        centuries: playerStats?.stats?.centuries || 0
    };

    const battingAvg = stats.matches > 0 ? (stats.runs / stats.matches).toFixed(2) : '0.00';
    const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
    const economy = stats.ballsBowled > 0 ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2) : '0.00';

    return (
        <div className="pb-24">
            <div className="bg-yellow-500 p-8 flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-[2.5rem] bg-white border-4 border-white overflow-hidden shadow-2xl rotate-3">
                    <img
                        src={imagePreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'default'}`}
                        alt="Profile"
                        className="w-full h-full object-cover -rotate-3"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="text-center">
                    {isEditingName ? (
                        <div className="flex flex-col items-center gap-3">
                            <input
                                type="text"
                                value={displayNameInput}
                                onChange={(e) => setDisplayNameInput(e.target.value)}
                                className="bg-white/80 border border-black/10 rounded-2xl px-4 py-3 text-center text-lg font-black text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                                placeholder="Enter your name"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveDisplayName}
                                    disabled={isSavingName || !displayNameInput.trim()}
                                    className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Check size={14} /> {isSavingName ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => {
                                        setDisplayNameInput(user?.displayName || '');
                                        setIsEditingName(false);
                                    }}
                                    disabled={isSavingName}
                                    className="bg-white/80 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/10 flex items-center gap-2"
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">{user?.displayName || 'Cricket Hero'}</h2>
                            <button
                                onClick={() => setIsEditingName(true)}
                                className="rounded-full bg-black/10 p-2 text-black hover:bg-black/20 transition-colors"
                                title="Edit profile name"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>
                    )}
                    <p className="text-black/60 font-bold text-xs uppercase tracking-widest mt-1">{user?.email || user?.phoneNumber || 'Player Profile'}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <label className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {isSavingImage ? 'Saving...' : 'Upload Photo'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleProfileImageChange}
                                className="hidden"
                                disabled={isSavingImage}
                            />
                        </label>
                        {imagePreview && (
                            <button
                                onClick={handleRemoveProfileImage}
                                disabled={isSavingImage}
                                className="bg-white/80 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-black/10 disabled:opacity-60"
                            >
                                Remove Photo
                            </button>
                        )}
                    </div>
                    <p className="text-[9px] text-black/50 font-bold uppercase tracking-widest">JPG, PNG ya WebP image upload kar sakte ho.</p>
                    {imageMessage && <p className="text-[10px] text-black/70 font-bold uppercase tracking-widest mt-2">{imageMessage}</p>}
                    {nameMessage && <p className="text-[10px] text-black/70 font-bold uppercase tracking-widest mt-2">{nameMessage}</p>}
                    {!user?.phoneNumber && (
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="Enter phone to link stats"
                                    className="bg-white/20 border border-black/10 rounded-xl px-4 py-2 text-xs font-bold placeholder:text-black/40 focus:outline-none focus:bg-white/40 transition-all"
                                />
                                <button
                                    onClick={handleLinkPhone}
                                    disabled={isLinking || phoneInput.length < 10}
                                    className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isLinking ? '...' : 'Link'}
                                </button>
                            </div>
                            <p className="text-[8px] text-black/40 font-bold uppercase tracking-widest">Link phone to sync your match history</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 -mt-6">
                <div className="bg-black text-white rounded-[2.5rem] shadow-2xl p-8 grid grid-cols-3 gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full -mr-32 -mt-32" />
                    <StatBox label="Matches" value={String(stats.matches)} />
                    <StatBox label="Runs" value={String(stats.runs)} />
                    <StatBox label="Wickets" value={String(stats.wickets)} />
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Batting Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Average</p>
                            <p className="text-3xl font-black text-black italic leading-none">{battingAvg}</p>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Strike Rate</p>
                            <p className="text-3xl font-black text-black italic leading-none">{strikeRate}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fours</p>
                            <p className="text-xl font-black text-black italic">{stats.fours}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sixes</p>
                            <p className="text-xl font-black text-black italic">{stats.sixes}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">50s</p>
                            <p className="text-xl font-black text-black italic">{stats.fifties}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">100s</p>
                            <p className="text-xl font-black text-black italic">{stats.centuries}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Bowling Performance
                    </h3>
                    <div className="bg-black text-white rounded-3xl p-6 shadow-xl flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Economy</p>
                            <p className="text-3xl font-black text-yellow-500 italic leading-none">{economy}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Best Figures</p>
                            <p className="text-xl font-black text-white italic">--</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 grid grid-cols-2 gap-6 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wickets</p>
                            <p className="text-xl font-black text-black italic">{stats.wickets}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Runs Conceded</p>
                            <p className="text-xl font-black text-black italic">{stats.runsConceded}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 flex items-center justify-center gap-2 mt-4"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
    );
};
