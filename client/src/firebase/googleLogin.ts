import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from './config';

const provider = new GoogleAuthProvider();

export async function loginWithGoogle({ onSuccess, onError, setLoading }: {
  onSuccess: (jwt: string) => void,
  onError: (errMsg: string) => void,
  setLoading: (loading: boolean) => void,
}) {
  setLoading(true);
  try {
    let userCredential;
    if (window.Capacitor?.isNativePlatform?.()) {
      await signInWithRedirect(auth, provider);
      setLoading(false);
      return;
    } else {
      userCredential = await signInWithPopup(auth, provider);
    }

    const idToken = await userCredential.user.getIdToken();

    const response = await fetch('https://scorearena-1.onrender.com/api/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error('Invalid Firebase token or backend error');
    }

    const { token: jwt } = await response.json();
    if (!jwt) throw new Error('JWT not returned from backend');

    localStorage.setItem('scorewala-auth-token', jwt);

    onSuccess(jwt);
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked') {
      onError('Popup blocked: Please allow popups for this site.');
    } else if (err.code === 'auth/popup-closed-by-user') {
      onError('Login cancelled: The login popup was closed.');
    } else if (err.code === 'auth/network-request-failed') {
      onError('Network error: Please check your connection.');
    } else {
      onError(err.message || 'Google login failed');
    }
  } finally {
    setLoading(false);
  }
}
