import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Coba ambil dari Environment Variables (Vercel/Production)
// Jika tidak ada, coba ambil dari file lokal (AI Studio Development)
// Catatan: Di produksi, pastikan variabel VITE_FIREBASE_* sudah diatur di dashboard Vercel
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validasi Semua Variabel Penting
const requiredVars = {
  'VITE_FIREBASE_API_KEY': firebaseConfig.apiKey,
  'VITE_FIREBASE_AUTH_DOMAIN': firebaseConfig.authDomain,
  'VITE_FIREBASE_PROJECT_ID': firebaseConfig.projectId
};

Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Variabel ${key} tidak ditemukan di Vercel. Pastikan Anda sudah menambahkannya di Settings > Environment Variables.`);
  }
});

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firestoreDatabaseId);
export const storage = getStorage(app);
