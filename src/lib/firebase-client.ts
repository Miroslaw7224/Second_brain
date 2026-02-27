import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function ensureFirebaseConfig(): void {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
    throw new Error(
      'Firebase client config missing. In Next.js set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN in .env (see .env.example). Restart the dev server after changing .env.',
    );
  }
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  ensureFirebaseConfig();
  app = getApps().length ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig);
  auth = getAuth(app);
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain);
}