import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loading: false,
  isInitialized: false, // Tracks if initial /me check has occurred
  error: null,
  success: null,
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
      }
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
      state.isInitialized = true;
      state.error = null;
      state.success = null;
    },
  },
});

export const {
  setUser,
  setLoading,
  setInitialized,
  updateUserProfile,

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