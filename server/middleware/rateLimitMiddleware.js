const rateLimit = require("express-rate-limit");

/**
 * Named rate limiters for CareerConnect auth endpoints.
 *
 * authLimiter      — login, register, google-auth, firebase-login
 * otpLimiter       — send-otp, forgot-password
 * resetLimiter     — verify-reset-otp, reset-password, complete-password-setup
 *
 * Limits are generous enough not to block normal users but strict enough to
 * slow down brute-force attacks.
 */

const isDev = process.env.NODE_ENV !== "production";

// General authentication operations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 200 : 20,    // 20 requests per window in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please wait 15 minutes before trying again.",
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

// OTP send operations (can be costly — email sending)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isDev ? 100 : 5,     // 5 OTP sends per 10 min in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 10 minutes before requesting another code.",
  },
});

// Password reset operations
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10,    // 10 reset attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please wait 15 minutes.",
  },
});

module.exports = { authLimiter, otpLimiter, resetLimiter };
