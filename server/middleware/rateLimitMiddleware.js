const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/**
 * Helper to get clean, normalized client IP using express-rate-limit's ipKeyGenerator
 */
const getClientIp = (req) => {
  return ipKeyGenerator(req.ip || "127.0.0.1");
};

/**
 * Helper to dynamically read limit with fallback
 */
const getLimitMax = (envVar, defaultVal) => {
  const raw = process.env[envVar];
  if (raw !== undefined && raw !== null && raw !== "") {
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultVal;
};

const commonRateLimitOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
};

/**
 * Global API Rate Limiter
 * Default: 300 requests / 15 minutes per IP (RATE_LIMIT_GLOBAL_MAX)
 * Skips OPTIONS preflights and health check routes
 */
const globalLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_GLOBAL_MAX", 300),
  keyGenerator: (req) => getClientIp(req),
  skip: (req) => {
    return (
      req.method === "OPTIONS" ||
      req.path === "/health" ||
      req.path === "/" ||
      req.originalUrl === "/health" ||
      req.originalUrl === "/" ||
      req.originalUrl?.startsWith("/health")
    );
  },
});

/**
 * OTP Send Rate Limiter
 * Default: 5 requests / 15 minutes per IP + normalized email/phone (RATE_LIMIT_OTP_SEND_MAX)
 */
const otpSendLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_OTP_SEND_MAX", 5),
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const identifier = (
      req.body?.email ||
      req.body?.phone ||
      req.body?.emailOrUsername ||
      req.body?.username ||
      ""
    )
      .trim()
      .toLowerCase();
    return `${ip}:${identifier}`;
  },
});

/**
 * OTP Verify Rate Limiter
 * Default: 10 requests / 15 minutes per IP + normalized email/phone (RATE_LIMIT_OTP_VERIFY_MAX)
 */
const otpVerifyLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_OTP_VERIFY_MAX", 10),
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const identifier = (
      req.body?.email ||
      req.body?.phone ||
      req.body?.emailOrUsername ||
      req.body?.username ||
      ""
    )
      .trim()
      .toLowerCase();
    return `${ip}:${identifier}`;
  },
});

/**
 * AI & Resume Endpoints Rate Limiter
 * Default: 20 requests / 60 minutes (RATE_LIMIT_AI_MAX)
 * Key: user:<req.user._id> when logged in, otherwise ip:<ip>
 */
const aiResumeLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_AI_MAX", 20),
  keyGenerator: (req) => {
    const userId = req.user?._id || req.user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    const ip = getClientIp(req);
    return `ip:${ip}`;
  },
});

/**
 * Daily AI quota, shared by every Gemini-backed feature (resume parse, tailor,
 * generate, ATS optimize, AI assistant) so the free Gemini tier lasts the day.
 * Default: 40 AI actions / 24 hours per user (RATE_LIMIT_AI_DAILY_MAX)
 * The count is kept in memory, so it resets when the server restarts.
 */
const aiDailyLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 24 * 60 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_AI_DAILY_MAX", 40),
  keyGenerator: (req) => {
    const userId = req.user?._id || req.user?.id;
    return userId ? `ai-daily:user:${userId}` : `ai-daily:ip:${getClientIp(req)}`;
  },
  message: {
    success: false,
    code: "AI_DAILY_LIMIT",
    message: "You've used today's free AI limit. It resets within 24 hours.",
  },
});

/**
 * Live Internships Aggregator Limiter
 * Default: 60 requests / 1 minute per IP (RATE_LIMIT_LIVE_MAX)
 */
const internshipsLiveLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 1 * 60 * 1000,
  max: () => getLimitMax("RATE_LIMIT_LIVE_MAX", 60),
  keyGenerator: (req) => getClientIp(req),
});

/**
 * Login Rate Limiter (Preserved with standardHeaders draft-7)
 */
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: "LOGIN_RATE_LIMIT_EXCEEDED",
      message:
        "Too many login attempts. Limit is 10 requests per minute. Please try again after 1 minute.",
      retryAfterSeconds: 60,
    });
  },
});

/**
 * Password Reset Limiter (Preserved with standardHeaders draft-7)
 */
const passwordResetLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = req.body?.email ? req.body.email.trim().toLowerCase() : "";
    return `${ip}_${email}`;
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: "PASSWORD_RESET_LIMIT_24H",
      message:
        "You can only send 3 password reset requests per 24 hours. Limit reached. Please try again later.",
      retryAfterHours: 24,
    });
  },
});

// No-op middleware for backwards compatibility
const noopMiddleware = (req, res, next) => next();

module.exports = {
  // Real active limiters
  globalLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  aiResumeLimiter,
  aiDailyLimiter,
  internshipsLiveLimiter,
  loginLimiter,
  passwordResetLimiter,

  // Aliases for backwards compatibility
  otpLimiter: otpSendLimiter,
  passwordResetLimiter24h: passwordResetLimiter,
  resetLimiter: passwordResetLimiter,
  authLimiter: loginLimiter,
  ipBlockerMiddleware: noopMiddleware,
  getClientIp,
};
