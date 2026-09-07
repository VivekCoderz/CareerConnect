require("dotenv").config();
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

/**
 * Firebase Admin SDK singleton.
 * Initialized once using service account credentials from environment variables.
 */
let firebaseApp = null;
let authInstance = null;

const getFirebaseAuth = () => {
  if (authInstance) return authInstance;

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.warn(
      "[FirebaseAdmin] Missing Firebase credentials in environment variables."
    );
    return null;
  }

  try {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    } else {
      firebaseApp = getApps()[0];
    }
    authInstance = getAuth(firebaseApp);
    console.log("[FirebaseAdmin] Initialized successfully.");
    return authInstance;
  } catch (err) {
    console.error("[FirebaseAdmin] Initialization failed:", err.message);
    return null;
  }
};

const getFirebaseAdmin = () => {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  return {
    auth: () => auth,
    verifyIdToken: (token) => auth.verifyIdToken(token),
    getUser: (uid) => auth.getUser(uid),
  };
};

getFirebaseAdmin.getFirebaseAdmin = getFirebaseAdmin;
getFirebaseAdmin.getFirebaseAuth = getFirebaseAuth;

module.exports = getFirebaseAdmin;
