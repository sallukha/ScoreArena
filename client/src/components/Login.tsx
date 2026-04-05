import React, { useState, useEffect } from 'react';
import { auth, signIn, db, doc, setDoc, getDoc, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Mail, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

async function waitForRecaptchaContainer(attempts = 10) {
  for (let index = 0; index < attempts; index += 1) {
    const container = document.getElementById('recaptcha-container');
    if (container) {
      return container;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  return null;
}

function resetRecaptchaVerifier() {
  console.log('Resetting reCAPTCHA verifier');
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
  if (!container) {
    throw new Error('reCAPTCHA container not found. Page refresh karke dobara try karo.');
  }

  // Don't recreate if already exists
  if (window.recaptchaVerifier) {
    console.log('Using existing reCAPTCHA verifier');
    return window.recaptchaVerifier;
  }

  console.log('Creating new reCAPTCHA verifier');
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
    callback: () => {
      console.log('Recaptcha verified successfully');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired, will need to reverify');
    },
  });

  return window.recaptchaVerifier;
}

function getFirebaseAuthMessage(err: any) {
  const code = String(err?.code || err?.customData?._tokenResponse?.error?.message || '');
  const rawMessage = String(
    err?.customData?._tokenResponse?.error?.message ||
      err?.customData?.serverResponse?.error?.message ||
      err?.message ||
      ''
  );

  // Check for reCAPTCHA specific errors
  if (rawMessage.includes('reCAPTCHA') || code.includes('captcha')) {
    return 'reCAPTCHA issue. Page ko refresh karke dobara try karo ya Firefox use karo.';
  }
  
  if (rawMessage.includes('element has been removed')) {
    return 'reCAPTCHA widget removed. Page refresh karke try karo.';
  }

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Firebase Console mein Phone sign-in enable karo.';
    case 'auth/invalid-app-credential':
      return 'reCAPTCHA verify nahi ho pa raha. Authorized domains aur Phone Auth settings check karo.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA failed hua. Page refresh karke dobara try karo.';
    case 'auth/invalid-phone-number':
      return 'Phone number invalid hai. Sahi 10-digit mobile number dalo.';
    case 'auth/too-many-requests':
      return 'Bahut zyada attempts ho gaye. Thodi der baad try karo.';
    case 'auth/quota-exceeded':
      return 'Firebase SMS quota exceed ho gaya hai.';
    default:
      return rawMessage ? `OTP error: ${rawMessage}` : 'OTP send karne mein problem aa rahi hai.';
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

  // Cleanup reCAPTCHA when component unmounts
  useEffect(() => {
    return () => {
      console.log('Login component unmounting, cleaning up reCAPTCHA');
      resetRecaptchaVerifier();
    };
  }, []);

  // Reset reCAPTCHA verifier when switching away from phone method
  useEffect(() => {
    if (method !== 'phone') {
      console.log('Switched away from phone method, resetting reCAPTCHA');
      resetRecaptchaVerifier();
      // Reset phone login state when switching methods
      setPhoneNumber('');
      setOtp('');
      setStep('phone');
      setConfirmationResult(null);
      setError(null);
    }
  }, [method]);

  // Reset phone state when switching back to phone from OTP step
  const handleChangeNumber = () => {
    console.log('User requested to change phone number');
    setStep('phone');
    setOtp('');
    setError(null);
    // Don't reset the verifier yet - they might want to reuse it
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Starting OTP send flow');
      
      // Ensure verifier is ready before attempting to send OTP
      const verifier = await ensureRecaptchaVerifier();
      console.log('reCAPTCHA verifier ready');
      
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      console.log('Attempting to sign in with phone:', formattedPhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      console.log('OTP request successful, waiting for user confirmation');
      
      setConfirmationResult(confirmation);
      setStep('otp');
      setError(null);
    } catch (err: any) {
      console.error('OTP send error:', err);
      setError(getFirebaseAuthMessage(err));
      // Reset verifier on error so it can be retried
      resetRecaptchaVerifier();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Verifying OTP');
      
      // Confirm OTP and exchange Firebase token with backend
      const authResult = await confirmationResult.confirm(otp);
      
      console.log('OTP verified successfully:', authResult.user.uid);
      
      // Clean up reCAPTCHA after successful login
      resetRecaptchaVerifier();
      
      onLoginSuccess();
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(getFirebaseAuthMessage(err) || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-12">
      <div className="text-center flex flex-col gap-4">
        <div className="w-40 rounded-full overflow-hidden border-4 border-black bg-[#0f2f24] mx-auto shadow-2xl aspect-square ring-4 ring-yellow-200/70">
          <img src="/scorewala-login-logo.jpg" alt="ScoreArena logo" className="w-full h-full object-cover scale-110" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mt-4">ScoreArena</h1>
        <p className="text-gray-500 font-medium max-w-xs mx-auto">
          The #1 Cricket Scoring App for Local Cricket Heroes.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setMethod('google')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${method === 'google' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
          >
            <Mail size={18} /> Google
          </button>
          <button 
            onClick={() => setMethod('phone')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${method === 'phone' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
          >
            <Phone size={18} /> Phone
          </button>
        </div>

        <AnimatePresence mode="wait">
          {method === 'google' ? (
            <motion.div
              key="google"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold text-lg shadow-xl shadow-yellow-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {step === 'phone' ? (
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">+91</span>
                    <input
                      type="tel"
                      placeholder="Enter Mobile Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-14 pr-4 font-bold focus:border-yellow-500 outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading || phoneNumber.length < 10}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Send OTP <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-500">OTP sent to <span className="font-bold text-black">+91 {phoneNumber}</span></p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Firebase verification in progress</p>
                    <button onClick={handleChangeNumber} className="text-yellow-600 text-xs font-bold uppercase mt-1">Change Number</button>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 text-center text-2xl font-black tracking-[0.5em] focus:border-yellow-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify & Login <CheckCircle2 size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* reCAPTCHA container - keep in DOM always, just hide visually when not needed */}
        <div
          className={`rounded-2xl border border-gray-200 bg-gray-50 p-3 transition-all overflow-hidden ${
            method === 'phone' ? 'block min-h-[78px]' : 'hidden h-0'
          }`}
          style={{
            visibility: method === 'phone' ? 'visible' : 'hidden',
            pointerEvents: method === 'phone' ? 'auto' : 'none',
          }}
        >
          <div id="recaptcha-container" className="min-h-[78px] overflow-hidden"></div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 justify-center text-gray-400 mt-4">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure & Encrypted</span>
        </div>

        <div className="mt-12 text-center">
          <img
            src="/haris-photo.jpeg"
            alt="Md Haris"
            className="w-20 h-20 rounded-[1.5rem] object-cover mx-auto mb-3 border-4 border-yellow-100 shadow-lg"
          />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Developed by</p>
          <p className="text-xl font-black italic uppercase tracking-tighter text-gray-900 mt-1">Md Haris</p>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
