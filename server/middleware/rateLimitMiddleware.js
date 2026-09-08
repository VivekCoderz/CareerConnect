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

/**
 * 2. Password Reset Limiter:
 * Maximum 3 requests per 24 hours (1 day).
 * No 24-hour IP blocking.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours (1 day)
  max: 3,                         // Maximum 3 calls per day
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = req.body?.email ? req.body.email.trim().toLowerCase() : "";
    return `${ip}_${email}`;
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: "PASSWORD_RESET_LIMIT_24H",
      message: "Aap 24 ghante (din) me sirf 3 baar hi password reset ki request bhej sakte hain. Limit poori ho chuki hai. Kripya baad me koshish karein.",
      retryAfterHours: 24,
    });
  },
});

// No-op middleware for backwards compatibility or disabled rate limiters
const noopMiddleware = (req, res, next) => next();

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  // Aliases for compatibility
  passwordResetLimiter24h: passwordResetLimiter,
  resetLimiter: passwordResetLimiter,
  authLimiter: loginLimiter,
  // Disabled / No-op
  ipBlockerMiddleware: noopMiddleware,
  globalLimiter: noopMiddleware,
  otpLimiter: noopMiddleware,
  aiResumeLimiter: noopMiddleware,
  getClientIp,
};
