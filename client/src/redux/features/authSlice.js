import { createSlice } from "@reduxjs/toolkit";

// The JWT lives only in the httpOnly auth cookie. Older builds also kept a copy in
// localStorage, where any injected script could read it, so remove it once on load.
try {
  localStorage.removeItem("careerconnect_token");
} catch {
  // Storage is blocked (e.g. private mode), so nothing was stored.
}

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("careerconnect_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: getStoredUser(),
  loading: false,
  isInitialized: false, // Tracks if initial /me check has occurred
  error: null,
  success: null,
  sessionExpired: false, // Set to true when JWT expires mid-session → shows banner on Login page
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // ================= HYDRATION / SET USER =================

    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      state.isInitialized = true;
      state.error = null;
      state.sessionExpired = false;
      if (action.payload) {
        localStorage.setItem("careerconnect_user", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("careerconnect_user");
      }
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setInitialized: (state, action) => {
      state.isInitialized = action.payload;
    },

    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
        localStorage.setItem("careerconnect_user", JSON.stringify(state.user));
      }
    },

    // ================= SESSION EXPIRED =================

    setSessionExpired: (state, action) => {
      state.sessionExpired = action.payload;
    },

    // ================= LOGIN =================

    loginStart: (state) => {
      state.loading = true;
      state.error = null;
      state.success = null;
    },

    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isInitialized = true;
      state.error = null;
      state.success = "Login successful";
      state.sessionExpired = false;
      if (action.payload.user) {
        localStorage.setItem("careerconnect_user", JSON.stringify(action.payload.user));
      }
    },

    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.success = null;
    },

    // ================= SIGNUP =================

    signupStart: (state) => {
      state.loading = true;
      state.error = null;
      state.success = null;
    },

    signupSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isInitialized = true;
      state.error = null;
      state.success = "Account created successfully";
      if (action.payload.user) {
        localStorage.setItem("careerconnect_user", JSON.stringify(action.payload.user));
      }
    },

    signupFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.success = null;
    },

    // ================= CLEAR =================

    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },

    // ================= LOGOUT =================

    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.isInitialized = true; // Still initialized — just not authenticated
      state.error = null;
      state.success = null;
      localStorage.removeItem("careerconnect_user");
      // Do not clear sessionExpired here — Login page reads it to show the message
    },
  },
});

export const {
  setUser,
  setLoading,
  setInitialized,
  updateUserProfile,
  setSessionExpired,

  loginStart,
  loginSuccess,
  loginFailure,

  signupStart,
  signupSuccess,
  signupFailure,

  clearMessages,
  logout,
} = authSlice.actions;

export default authSlice.reducer;