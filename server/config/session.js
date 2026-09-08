const session = require("express-session");

// Session Inactivity / Idle timeout (configurable via .env, default: 15 minutes)
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES) || 15;
const IDLE_TIMEOUT_SECONDS = SESSION_TIMEOUT_MINUTES * 60;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Express Session Configuration
 * - Built-in session store (no Redis server dependency)
 * - rolling: true resets cookie expiration on every user activity
 * - resave: false prevents unnecessary session writes when untouched
 * - saveUninitialized: false avoids creating sessions for unauthenticated visitors
 */
const sessionMiddleware = session({
  name: "sid", // Session cookie name
  secret: process.env.SESSION_SECRET || "careerconnect_session_secure_key_2026",
  resave: false,
  saveUninitialized: false,
  rolling: true, // Resets the idle timer on each incoming request
  cookie: {
    maxAge: IDLE_TIMEOUT_MS, // 15 minutes idle timeout
    httpOnly: true, // Protects cookie from XSS access
    secure: isProduction, // Set to true on HTTPS production
    sameSite: isProduction ? "none" : "lax", // Cross-site support in prod, lax in dev
    path: "/",
  },
});

module.exports = sessionMiddleware;
