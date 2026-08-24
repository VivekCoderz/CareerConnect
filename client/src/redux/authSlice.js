import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Replace this with your actual backend URL
const API_URL = 'http://localhost:5000';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,

  isLoading: false,
  error: null,

  toast: null,

  forgotPasswordLoading: false,
  forgotPasswordSuccess: false,
  forgotPasswordError: null,
};

// ===============================
// LOGIN
// ===============================

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ emailOrUsername, password, rememberMe }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          emailOrUsername,
          password,
          rememberMe,
        },
        {
          // Important for cookie-based authentication
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Invalid email or password'
      );
    }
  }
);

// ===============================
// REGISTER
// ===============================

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (
    {
      fullName,
      username,
      email,
      phoneNumber,
      password,
      confirmPassword,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/register`,
        {
          fullName,
          username,
          email,
          phoneNumber,
          password,
          confirmPassword,
        },
        {
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create account'
      );
    }
  }
);

// ===============================
// GOOGLE / LINKEDIN LOGIN
// ===============================

export const socialLogin = createAsyncThunk(
  'auth/socialLogin',
  async ({ provider }, { rejectWithValue }) => {
    try {
      // These URLs will depend on your backend OAuth implementation
      window.location.href = `${API_URL}/auth/${provider}`;

      return { provider };
    } catch (error) {
      return rejectWithValue(
        `Failed to authenticate via ${provider}`
      );
    }
  }
);

// ===============================
// FORGOT PASSWORD
// ===============================

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        { email },
        {
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          'Something went wrong'
      );
    }
  }
);

// ===============================
// CHECK CURRENT USER
// ===============================

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/auth/me`,
        {
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          'User is not authenticated'
      );
    }
  }
);

// ===============================
// LOGOUT
// ===============================

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          'Failed to logout'
      );
    }
  }
);

// ===============================
// AUTH SLICE
// ===============================

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    clearError(state) {
      state.error = null;
      state.forgotPasswordError = null;
    },

    clearToast(state) {
      state.toast = null;
    },

    resetForgotPassword(state) {
      state.forgotPasswordLoading = false;
      state.forgotPasswordSuccess = false;
      state.forgotPasswordError = null;
    },

    // Used when frontend needs to clear auth state
    clearAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },

  extraReducers: (builder) => {
    builder

      // ===============================
      // LOGIN
      // ===============================

      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;

        state.user = action.payload.user;
        state.isAuthenticated = true;

        state.toast = {
          message: 'Successfully logged in!',
          type: 'success',
        };
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;

        state.toast = {
          message: action.payload,
          type: 'error',
        };
      })

      // ===============================
      // REGISTER
      // ===============================

      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })

      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;

        state.user = action.payload.user;
        state.isAuthenticated = true;

        state.toast = {
          message: 'Account created successfully!',
          type: 'success',
        };
      })

      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;

        state.toast = {
          message: action.payload,
          type: 'error',
        };
      })

      // ===============================
      // SOCIAL LOGIN
      // ===============================

      .addCase(socialLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })

      .addCase(socialLogin.fulfilled, (state) => {
        state.isLoading = false;

        // Backend OAuth will set the cookie.
        // User information can be fetched using /auth/me.
        state.toast = {
          message: 'Authentication successful!',
          type: 'success',
        };
      })

      .addCase(socialLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;

        state.toast = {
          message: action.payload,
          type: 'error',
        };
      })

      // ===============================
      // CURRENT USER
      // ===============================

      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })

      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;

        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })

      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;

        state.user = null;
        state.isAuthenticated = false;
      })

      // ===============================
      // FORGOT PASSWORD
      // ===============================

      .addCase(forgotPassword.pending, (state) => {
        state.forgotPasswordLoading = true;
        state.forgotPasswordSuccess = false;
        state.forgotPasswordError = null;
      })

      .addCase(forgotPassword.fulfilled, (state) => {
        state.forgotPasswordLoading = false;
        state.forgotPasswordSuccess = true;

        state.toast = {
          message: 'Password reset instructions sent to your email!',
          type: 'success',
        };
      })

      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPasswordLoading = false;
        state.forgotPasswordError = action.payload;

        state.toast = {
          message: action.payload,
          type: 'error',
        };
      })

      // ===============================
      // LOGOUT
      // ===============================

      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;

        state.user = null;
        state.isAuthenticated = false;

        state.toast = {
          message: 'Logged out successfully',
          type: 'success',
        };
      })

      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearToast,
  resetForgotPassword,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;