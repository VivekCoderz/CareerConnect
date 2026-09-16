const rateLimit = require("express-rate-limit");

/**
 * Helper to get clean client IP
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  );
};

/**
 * 1. Login Rate Limiter:
 * Exactly 10 requests per 1 minute on login endpoints.
 * No 24-hour IP blocking.
 */
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,                 // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: "LOGIN_RATE_LIMIT_EXCEEDED",
      message: "Too many login attempts. Limit is 10 requests per minute. Please try again after 1 minute.",
      retryAfterSeconds: 60,
    });
  },
});

// No-op middleware for backwards compatibility or disabled rate limiters
const noopMiddleware = (req, res, next) => next();

/**
 * 2. Password Reset Limiter:
 * Disabled upon request (was 3 requests per 24 hours).
 */
const passwordResetLimiter = noopMiddleware;

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  // Aliases for compatibility
  passwordResetLimiter24h: noopMiddleware,
  resetLimiter: noopMiddleware,
  authLimiter: loginLimiter,
  // Disabled / No-op
  ipBlockerMiddleware: noopMiddleware,
  globalLimiter: noopMiddleware,
  otpLimiter: noopMiddleware,
  aiResumeLimiter: noopMiddleware,
  getClientIp,
};
