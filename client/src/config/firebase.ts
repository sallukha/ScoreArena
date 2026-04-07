export const firebaseConfig = {
  apiKey:
    (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
    "AIzaSyA2sBh5eTwaAHkKhxbDynOEEcJPxi6Iz0w",
  authDomain:
    (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
    "fir-ath-d32b0.firebaseapp.com",
  projectId:
    (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "fir-ath-d32b0",
  storageBucket:
    (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
    "fir-ath-d32b0.firebasestorage.app",
  messagingSenderId:
    (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "838787006701",
  appId:
    (import.meta as any).env?.VITE_FIREBASE_APP_ID ||
    "1:838787006701:web:6e3299c2bef3c4ab280ce4",
  measurementId:
    (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-55JTD1M2QK",
};
