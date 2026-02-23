import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;

export function getFirebaseAuth(): Auth {
  if (typeof auth !== "undefined") return auth;
  app = getApps().length ? getApps()[0] as FirebaseApp : initializeApp(firebaseConfig);
  auth = getAuth(app);
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN);
}
