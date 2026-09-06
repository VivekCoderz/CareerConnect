const rateLimit = require("express-rate-limit");

/**
 * Intelligent Rate Limiting & Dynamic IP Abuse Blocker
 *
 * 1. Tracks rate limit violations per IP.
 * 2. If an IP exceeds violation thresholds (e.g. repeated brute force / spamming),
 *    the IP is actively BLOCKED for a penalty duration (e.g. 15 minutes).
 * 3. Any request from a blocked IP is immediately rejected with HTTP 403 Forbidden.
 * 4. Provides global protection across all /api routes, plus strict limiters on auth.
 */

const isDev = process.env.NODE_ENV !== "production";

// In-memory store for blocked IPs: Map<ip, { unblockTime: number, reason: string }>
const blockedIPs = new Map();

// In-memory store for tracking violations: Map<ip, { count: number, firstViolation: number }>
const violations = new Map();

const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block
const VIOLATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes window
const MAX_VIOLATIONS_BEFORE_BLOCK = isDev ? 15 : 4; // Block after 4 violations in prod

/**
 * Helper to get clean client IP
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

/**
 * Record a rate-limit violation. If violations exceed threshold, block the IP.
 */
const recordViolation = (req, reason = "Excessive requests") => {
  const ip = getClientIp(req);
  const now = Date.now();

  let record = violations.get(ip);
  if (!record || now - record.firstViolation > VIOLATION_WINDOW_MS) {
    record = { count: 1, firstViolation: now };
  } else {
    record.count += 1;
  }
  violations.set(ip, record);

  console.warn(
    `⚠️ [RateLimit Violation] IP: ${ip} | Violations: ${record.count}/${MAX_VIOLATIONS_BEFORE_BLOCK} | Reason: ${reason}`
  );

  if (record.count >= MAX_VIOLATIONS_BEFORE_BLOCK) {
    const unblockTime = now + BLOCK_DURATION_MS;
    blockedIPs.set(ip, { unblockTime, reason });
    violations.delete(ip);
    console.error(
      `🚫 [IP BLOCKED] IP: ${ip} has been BLOCKED until ${new Date(unblockTime).toLocaleTimeString()} due to repeated requests.`
    );
  }
};

/**
 * Middleware that immediately blocks requests from blocked IPs.
 * Mount this globally before any routes.
 */
const ipBlockerMiddleware = (req, res, next) => {
  const ip = getClientIp(req);
  const blockInfo = blockedIPs.get(ip);

  if (blockInfo) {
    const now = Date.now();
    if (now < blockInfo.unblockTime) {
      const remainingMinutes = Math.ceil((blockInfo.unblockTime - now) / 60000);
      res.setHeader("Retry-After", remainingMinutes * 60);
      return res.status(403).json({
        success: false,
        code: "IP_BLOCKED",
        message: `Your IP has been temporarily blocked due to repeated excessive requests. Please try again after ${remainingMinutes} minute(s).`,
      });
    } else {
      // Penalty expired, unblock
      blockedIPs.delete(ip);
      console.log(`✅ [IP UNBLOCKED] IP: ${ip} block expired. Access restored.`);
    }
  }

  next();
};

/**
 * Global API rate limiter — protects all /api endpoints from DoS flooding
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 300,  // 300 requests per 15 minutes in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    recordViolation(req, "Global API limit exceeded");
    return res.status(429).json({
      success: false,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP. Please slow down and wait a few minutes.",
    });
  },
});

/**
 * Strict Auth Limiter — login, register, google-auth, firebase-login
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 200 : 20,    // 20 attempts per window in prod
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    recordViolation(req, "Auth attempts limit exceeded");
    return res.status(429).json({
      success: false,
      code: "AUTH_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
    });
  },
});

/**
 * OTP Limiter — send-otp, forgot-password
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isDev ? 100 : 5,     // 5 OTP sends per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    recordViolation(req, "OTP request limit exceeded");
    return res.status(429).json({
      success: false,
      code: "OTP_LIMIT_EXCEEDED",
      message: "Too many OTP requests. Please wait 10 minutes before requesting another code.",
    });
  },
});

/**
 * Reset Limiter — verify-reset-otp, reset-password, complete-password-setup
 */
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10,    // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    recordViolation(req, "Password reset limit exceeded");
    return res.status(429).json({
      success: false,
      code: "RESET_LIMIT_EXCEEDED",
      message: "Too many password reset attempts. Please wait 15 minutes.",
    });
  },
});

module.exports = {
  ipBlockerMiddleware,
  globalLimiter,
  authLimiter,
  otpLimiter,
  resetLimiter,
  recordViolation,
  blockedIPs,
};
