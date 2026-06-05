import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'missing',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'missing',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'missing',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'missing',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'missing',
};

if (Object.values(firebaseConfig).includes('missing')) {
  console.error('🔥 Firebase ENV missing:', firebaseConfig);
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

export default app;
