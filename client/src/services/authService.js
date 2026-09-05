import api from "../api/api";

/**
 * Fetches the currently authenticated user from backend.
 * Uses HTTP-only cookie automatically via withCredentials.
 */
export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

/**
 * Logs out the current user (clears HTTP-only cookie).
 */
export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

/**
 * Updates user profile / experience level or user type.
 */
export const updateUserType = async (userType) => {
  const response = await api.patch("/auth/update-experience-level", {
    userType,
  });
  return response.data;
};

/**
 * Google Auth — called after signInWithPopup(auth, googleProvider).
 * Sends the Firebase ID token to the backend which creates/finds the MongoDB user.
 *
 * @param {string} idToken - Firebase ID token from result.user.getIdToken()
 * @param {boolean} keepSignedIn - Whether to issue 7-day (true) or 25-hour (false) JWT
 */
export const googleAuth = async (idToken, keepSignedIn = false) => {
  const response = await api.post("/auth/google-auth", { idToken, keepSignedIn });
  return response.data;
};

/**
 * Firebase Login — called after signInWithEmailAndPassword on the frontend.
 * Sends the Firebase ID token to get a CareerConnect JWT.
 *
 * @param {string} idToken - Firebase ID token
 * @param {boolean} keepSignedIn - Session duration preference
 * @param {string} captchaToken - reCAPTCHA v3 token
 */
export const firebaseLogin = async (idToken, keepSignedIn = false, captchaToken = "") => {
  const response = await api.post("/auth/firebase-login", {
    idToken,
    keepSignedIn,
    captchaToken,
  });
  return response.data;
};

/**
 * Complete Password Setup — called after linkWithCredential succeeds on the frontend.
 * Backend verifies Firebase has "password" provider linked and sets hasPassword=true.
 *
 * @param {string} idToken - Fresh Firebase ID token (force-refreshed after linking)
 * @param {boolean} keepSignedIn - Session duration preference
 */
export const completePasswordSetup = async (idToken, keepSignedIn = false) => {
  const response = await api.post("/auth/complete-password-setup", {
    idToken,
    keepSignedIn,
  });
  return response.data;
};
