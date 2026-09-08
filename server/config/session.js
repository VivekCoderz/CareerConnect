const session = require("express-session");
const { RedisStore } = require("connect-redis");
const redisClient = require("./redis.js");

// Session Inactivity / Idle timeout (configurable via .env, default: 15 minutes)
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES) || 15;
const IDLE_TIMEOUT_SECONDS = SESSION_TIMEOUT_MINUTES * 60;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;

// Compatibility adapter: connect-redis v8+ uses node-redis format (passing options object to set()),
// while ioredis expects positional arguments ('EX', ttl).
const redisAdapter = {
  get: (key) => redisClient.get(key),
  set: (key, val, options) => {
    if (options && options.expiration) {
      const { type, value } = options.expiration;
      if (type === "EX") return redisClient.set(key, val, "EX", value);
      if (type === "PX") return redisClient.set(key, val, "PX", value);
      if (type === "EXAT") return redisClient.set(key, val, "EXAT", value);
      if (type === "PXAT") return redisClient.set(key, val, "PXAT", value);
    }
    if (options && options.EX) {
      return redisClient.set(key, val, "EX", options.EX);
    }
    if (options && options.PX) {
      return redisClient.set(key, val, "PX", options.PX);
    }
    return redisClient.set(key, val);
  },
  del: (keys) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length === 0) return Promise.resolve(0);
    return redisClient.del(...keyArray);
  },
  expire: (key, ttl) => redisClient.expire(key, ttl),
  mGet: async (keys) => {
    if (!keys || keys.length === 0) return [];
    return redisClient.mget(...keys);
  },
  async *scanIterator(options) {
    let cursor = "0";
    const match = options?.MATCH || "*";
    const count = options?.COUNT || 100;
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", match, "COUNT", count);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        yield keys;
      }
    } while (cursor !== "0");
  },
};

// Initialize RedisStore for express-session
const redisStore = new RedisStore({
  client: redisAdapter,
  prefix: "sess:", // Prefix all session keys in Redis with sess:
  ttl: IDLE_TIMEOUT_SECONDS, // Default TTL in Redis
});

const isProduction = process.env.NODE_ENV === "production";

/**
 * Production-ready Express Session Configuration
 * - rolling: true resets cookie expiration & Redis TTL on every user activity
 * - resave: false prevents unnecessary session writes when untouched
 * - saveUninitialized: false avoids creating sessions for unauthenticated visitors
 */
const sessionMiddleware = session({
  store: redisStore,
  name: "sid", // Session cookie name
  secret: process.env.SESSION_SECRET || "careerconnect_redis_session_secure_key_2026",
  resave: false,
  saveUninitialized: false,
  rolling: true, // Key requirement: resets the idle timer on each incoming request
  cookie: {
    maxAge: IDLE_TIMEOUT_MS, // 15 minutes idle timeout
    httpOnly: true, // Protects cookie from XSS access
    secure: isProduction, // Set to true on HTTPS production
    sameSite: isProduction ? "none" : "lax", // Cross-site support in prod, lax in dev
    path: "/",
  },
});

module.exports = sessionMiddleware;
