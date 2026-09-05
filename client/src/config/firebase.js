import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase client SDK configuration.
 * All values come from Vite environment variables (VITE_FIREBASE_*).
 *
 * These are PUBLIC keys — safe to include in frontend code.
 * Security is enforced server-side via Firebase Admin SDK token verification.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app (singleton)
const app = initializeApp(firebaseConfig);

// Auth instance
export const auth = getAuth(app);

// Google OAuth provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account", // Always show account picker
});

export default app;
