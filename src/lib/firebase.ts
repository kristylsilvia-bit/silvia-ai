import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// True when running inside the Tauri desktop wrapper (window.__TAURI__ is injected by Tauri at runtime)
export const isTauriApp = "__TAURI__" in window;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Auth is optional: when the Firebase env vars are absent (local previews,
 * forks), initialization fails and the app runs in guest mode instead of
 * crashing before React can mount.
 */
let initializedAuth: Auth | null = null;
let initializedDb: Firestore | null = null;
try {
  const app: FirebaseApp = initializeApp(firebaseConfig);
  initializedAuth = getAuth(app);
  // Persistent local cache keeps Firestore usable offline and across reloads;
  // the multi-tab manager lets several open tabs share one cache safely.
  initializedDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  console.warn("Silvia AI: Firebase is not configured - running in guest mode.");
}

export const auth = initializedAuth;
export const db = initializedDb;
export const googleProvider = new GoogleAuthProvider();

function requireAuth(): Auth {
  if (!auth) throw new Error("Sign-in is not configured for this deployment.");
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(requireAuth(), googleProvider);
  return result.user;
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function signUpEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export { onAuthStateChanged, updateProfile, type User };
