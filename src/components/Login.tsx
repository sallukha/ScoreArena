import React, { useState, useEffect } from 'react';
import { auth, signIn, db, doc, setDoc, getDoc, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Mail, ArrowRight, CheckCircle2, Trophy, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

export const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [method, setMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [devOtp, setDevOtp] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (method === 'phone' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha verified');
        }
      });
    }
  }, [method]);

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
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setDevOtp(confirmation.devOtp || '');
      setOtpMessage(
        confirmation.smsSent
          ? 'OTP has been sent to your mobile number.'
          : confirmation.devOtp
            ? 'SMS provider not configured. Use the OTP shown below for now.'
            : 'OTP request created. Please check your phone.'
      );
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    setError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // Check if user doc exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const newUser: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || `User_${user.uid.slice(0, 5)}`,
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: 'user',
        };
        await setDoc(doc(db, 'users', user.uid), newUser);
      }
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
        <div className="w-24 h-24 bg-yellow-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-12">
          <Trophy size={48} className="text-black -rotate-12" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mt-4">Score Wala</h1>
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
                    {otpMessage && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">{otpMessage}</p>}
                    {devOtp && <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest mt-2">Demo OTP: {devOtp}</p>}
                    <button onClick={() => setStep('phone')} className="text-yellow-600 text-xs font-bold uppercase mt-1">Change Number</button>
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

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <div id="recaptcha-container"></div>

        <div className="flex items-center gap-2 justify-center text-gray-400 mt-4">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure & Encrypted</span>
        </div>

        <div className="mt-12 text-center">
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
