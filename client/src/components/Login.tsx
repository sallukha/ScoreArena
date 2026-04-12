import React, { useState, useEffect } from 'react';
import { auth, RecaptchaVerifier, signInWithFirebaseIdToken, signInWithPhoneNumber } from '../firebase';
// Capacitor Native Auth Plugin
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

async function waitForRecaptchaContainer(attempts = 10) {
  for (let index = 0; index < attempts; index += 1) {
    const container = document.getElementById('recaptcha-container');
    if (container) return container;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
  return null;
}

function resetRecaptchaVerifier() {
  try {
    if (window.recaptchaVerifier?.clear) {
      window.recaptchaVerifier.clear();
    }
  } catch (err) {
    console.warn('Error clearing reCAPTCHA:', err);
  }
  window.recaptchaVerifier = null;
}

async function ensureRecaptchaVerifier() {
  const container = await waitForRecaptchaContainer();
  if (!container) throw new Error('reCAPTCHA container not found.');
  if (window.recaptchaVerifier) return window.recaptchaVerifier;

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
    callback: () => console.log('Recaptcha verified'),
  });
  return window.recaptchaVerifier;
}

function getFirebaseAuthMessage(err: any) {
  const code = String(err?.code || '');
  switch (code) {
    case 'auth/invalid-phone-number': return 'Invalid 10-digit number.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a while.';
    default: return err.message || 'Error occurred.';
  }
}

export const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [method, setMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => resetRecaptchaVerifier();
  }, []);

  useEffect(() => {
    if (method !== 'phone') {
      resetRecaptchaVerifier();
      setPhoneNumber('');
      setOtp('');
      setStep('phone');
      setError(null);
    }
  }, [method]);

  // Exchange Firebase session with backend and store only server JWT.
  // const handleGoogleLogin = async () => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     let result;
  //     try {
  //       result = await FirebaseAuthentication.signInWithGoogle();
  //     } catch (primaryErr: any) {
  //       const message = String(primaryErr?.message || '').toLowerCase();
  //       const shouldFallback =
  //         message.includes('no credentials available') ||
  //         message.includes('getcredential') ||
  //         message.includes('credential');

  //       if (!shouldFallback) {
  //         throw primaryErr;
  //       }

  //       // Fallback for Android devices where Credential Manager cannot return an account.
  //       result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
  //     }

  //     if (!result.user) {
  //       throw new Error('Google sign-in did not return a user');
  //     }
  //     const { token: idToken } = await FirebaseAuthentication.getIdToken();
  //     localStorage.setItem('scorewala-auth-token', idToken);
  //     if (!idToken) {
  //       throw new Error('Firebase ID token not found after Google sign-in');
  //     }

  //     const profile = (result as any)?.additionalUserInfo?.profile || {};
  //     await signInWithFirebaseIdToken({
  //       idToken,
  //       displayName: result.user.displayName || '',
  //       email: result.user.email || '',
  //       phoneNumber: result.user.phoneNumber || '',
  //       photoURL: result.user.photoUrl || '',
  //       providerId: 'google.com',
  //       googleId: profile.sub || result.user.uid || '',
  //     });

  //     onLoginSuccess();
  //   } catch (err: any) {
  //     console.error('Google login failed:', err);
  //     if (err.code !== '1') { // 1 is user cancel
  //       setError(err?.message || 'Login failed. Check SHA-1.');
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleGoogleLogin = async () => {
  setLoading(true);
  setError(null);

  try {
    let result;
    try {
      result = await FirebaseAuthentication.signInWithGoogle();
    } catch (primaryErr: any) {
      const message = String(primaryErr?.message || '').toLowerCase();
      const shouldFallback =
        message.includes('no credentials available') ||
        message.includes('getcredential') ||
        message.includes('credential');

      if (!shouldFallback) throw primaryErr;

      result = await FirebaseAuthentication.signInWithGoogle({
        useCredentialManager: false,
      });
    }

    if (!result?.user) {
      throw new Error('Google sign-in did not return a user');
    }

    // ✅ Validate token BEFORE storing
    const { token: idToken } = await FirebaseAuthentication.getIdToken();
    if (!idToken) {
      throw new Error('Firebase ID token not found after Google sign-in');
    }
    localStorage.setItem('scorewala-auth-token', idToken);

    const profile = (result as any)?.additionalUserInfo?.profile || {};

    // ✅ This fetch call is the likely source of "failed to fetch"
    // Ensure the URL is HTTPS and reachable from the device
    await signInWithFirebaseIdToken({
      idToken,
      displayName: result.user.displayName || '',
      email: result.user.email || '',
      phoneNumber: result.user.phoneNumber || '',
      photoURL: result.user.photoUrl || '',   // ← lowercase L for Capacitor
      providerId: 'google.com',
      googleId: profile.sub || result.user.uid || '',
    });

    onLoginSuccess();
  } catch (err: any) {
    console.error('Google login failed:', err);

    // ✅ Robust cancel detection
    const isCancelled =
      err.code === '1' ||
      String(err?.message || '').toLowerCase().includes('cancel') ||
      String(err?.message || '').toLowerCase().includes('closed by user');

    if (!isCancelled) {
      setError(err?.message || 'Login failed. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};


  const handleSendOtp = async () => {
    if (!phoneNumber) return;
    setLoading(true);
    setError(null);
    try {
      const verifier = await ensureRecaptchaVerifier();
      const formattedPhone = `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err: any) {
      setError(getFirebaseAuthMessage(err));
      resetRecaptchaVerifier();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);

      resetRecaptchaVerifier();
      onLoginSuccess();
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-12">
        <div className="text-center flex flex-col gap-4">
          <div className="w-40 rounded-full overflow-hidden border-4 border-black bg-[#0f2f24] mx-auto shadow-2xl aspect-square ring-4 ring-yellow-200/70">
            <img src="/scorewala-login-logo.jpg" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mt-4">ScoreArena</h1>
          <p className="text-gray-500 font-medium max-w-xs mx-auto">The #1 Cricket Scoring App.</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setMethod('google')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${method === 'google' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
              <Mail size={18} className="inline mr-2" /> Google
            </button>
            <button onClick={() => setMethod('phone')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${method === 'phone' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
              <Phone size={18} className="inline mr-2" /> Phone
            </button>
          </div>

          <AnimatePresence mode="wait">
            {method === 'google' ? (
                <motion.div key="google" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" /> :
                        <><img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" /> Continue with Google</>}
                  </button>
                </motion.div>
            ) : (
                <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  {step === 'phone' ? (
                      <>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">+91</span>
                          <input type="tel" placeholder="Mobile Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl py-4 pl-14 pr-4 font-bold outline-none" />
                        </div>
                        <button onClick={handleSendOtp} disabled={loading || phoneNumber.length < 10} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50">
                          Send OTP <ArrowRight size={20} />
                        </button>
                      </>
                  ) : (
                      <>
                        <input type="text" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl py-4 text-center text-2xl font-black tracking-widest outline-none" />
                        <button onClick={handleVerifyOtp} className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3">
                          Verify & Login <CheckCircle2 size={20} />
                        </button>
                      </>
                  )}
                </motion.div>
            )}
          </AnimatePresence>

          <div id="recaptcha-container" className={`${method === 'phone' ? 'block' : 'hidden'}`}></div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold text-center border border-red-100">{error}</div>}

          <div className="flex items-center gap-2 justify-center text-gray-400 mt-4">
            <ShieldCheck size={14} /> <span className="text-[10px] font-bold uppercase">Secure & Encrypted</span>
          </div>
        </div>
      </div>
  );
};

declare global { interface Window { recaptchaVerifier: any; } }
