import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Client-side Firebase config, from public env vars. These are safe to expose
// in the browser — security is enforced by Firebase Auth + Firestore rules and
// our server-side session verification, not by hiding these values.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let cachedAuth: Auth | null = null;
let analyticsInitialization: Promise<boolean> | null = null;

export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

// Lazily initialize so SSR/prerender (where the config is absent) never touches
// the Auth SDK — it's only ever created in the browser, on first use.
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function initializeFirebaseAnalytics(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  ) {
    return Promise.resolve(false);
  }
  if (analyticsInitialization) return analyticsInitialization;

  analyticsInitialization = import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) => {
      if (!(await isSupported())) return false;
      getAnalytics(getFirebaseApp());
      return true;
    })
    .catch(() => false);

  return analyticsInitialization;
}
