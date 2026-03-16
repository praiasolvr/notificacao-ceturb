import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configurações via .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 🔥 Garante que o Firebase NÃO será inicializado duas vezes
const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Auth e Firestore
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// 🔥🔥🔥 AQUI ESTÁ O QUE FALTAVA 🔥🔥🔥
// Força o Firebase a manter a sessão no localStorage
setPersistence(auth, browserLocalPersistence)
  .catch((err) => console.error("Erro ao configurar persistência:", err));

export { firebaseApp, auth, db };
