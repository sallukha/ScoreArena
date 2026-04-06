import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, signIn, logOut, onAuthStateChanged, db, doc, getDoc, setDoc, onSnapshot } from '../firebase';
import { UserProfile } from '../types';

const WELCOME_SESSION_KEY_PREFIX = 'scorewala-welcome-shown';

function getWelcomeSessionKey(uid: string) {
    return `${WELCOME_SESSION_KEY_PREFIX}:${uid}`;
}

type AuthContextValue = {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    error: null,
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('AuthProvider: Initializing auth listener...');
        let unsubscribeUserDoc: (() => void) | undefined;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('AuthProvider: Auth state changed:', firebaseUser?.uid);
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
                unsubscribeUserDoc = undefined;
            }
            try {
                if (firebaseUser) {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        console.log('AuthProvider: User doc found');
                        unsubscribeUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
                            if (snapshot.exists()) {
                                setUser(snapshot.data() as UserProfile);
                            }
                        });
                    } else {
                        console.log('AuthProvider: Creating new user doc');
                        const newUser: UserProfile = {
                            uid: firebaseUser.uid,
                            displayName: firebaseUser.displayName || 'Anonymous',
                            email: firebaseUser.email || '',
                            photoURL: firebaseUser.photoURL || '',
                            role: 'user',
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                        setUser(newUser);
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('AuthProvider: Error in auth listener:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
            }
            unsubscribe();
        };
    }, []);

    const login = async () => {
        setError(null);
        try {
            await signIn();
        } catch (err: any) {
            console.error('Login failed', err);
            if (err.code === 'auth/network-request-failed') {
                setError('Network error: Please check your internet connection, disable ad-blockers, and ensure your app domain is authorized in Firebase Console.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('Login cancelled: The login popup was closed before completion.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Popup blocked: Please allow popups for this site to continue with Google.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        }
    };

    const logout = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser?.uid) {
                sessionStorage.removeItem(getWelcomeSessionKey(currentUser.uid));
            }
            await logOut();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
