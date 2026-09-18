import { initializeApp, getApps } from "firebase/app";
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

// Check if Firebase is properly configured with a valid API key
const rawApiKey = firebaseConfig.apiKey;
export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  typeof rawApiKey === "string" &&
  rawApiKey.trim() !== "" &&
  !rawApiKey.includes("your-") &&
  !rawApiKey.includes(":") &&
  rawApiKey !== "undefined"
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account", // Always show account picker
    });
  } catch (err) {
    console.error("[Firebase] Error initializing Firebase Auth:", err);
  }
} else {
  console.warn(
    "[Firebase] Firebase API key is missing or invalid in client/.env (VITE_FIREBASE_API_KEY).\n" +
    "Firebase Auth / Google Sign-in will be disabled until valid credentials are configured."
  );
}

export { auth, googleProvider };
export default app;
