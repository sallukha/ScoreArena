import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA2sBh5eTwaAHkKhxbDynOEEcJPxi6Iz0w',
  authDomain: 'fir-ath-d32b0.firebaseapp.com',
  projectId: 'fir-ath-d32b0',
  appId: '1:838787006701:web:6e3299c2bef3c4ab280ce4',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
