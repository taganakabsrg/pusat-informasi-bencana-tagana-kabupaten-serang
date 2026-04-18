import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import firebaseLocalConfig from '../../firebase-applet-config.json';

// Coba ambil dari Environment Variables (Vercel/Production)
// Jika tidak ada, gunakan fallback dari file lokal (AI Studio Development)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseLocalConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseLocalConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseLocalConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseLocalConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseLocalConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseLocalConfig.appId
};

// Validasi minimal
if (!firebaseConfig.apiKey) {
  throw new Error('Konfigurasi Firebase tidak ditemukan. Jika di Vercel, pastikan Environment Variables sudah diatur.');
}

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseLocalConfig.firestoreDatabaseId || '(default)';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firestoreDatabaseId);
export const storage = getStorage(app);
