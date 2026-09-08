const session = require("express-session");
const Session = require("../models/Session");

// Session Inactivity / Idle timeout (configurable via .env, default: 15 minutes)
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES) || 15;
const IDLE_TIMEOUT_SECONDS = SESSION_TIMEOUT_MINUTES * 60;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;

/**
 * Custom Mongoose-backed Session Store for express-session.
 * Replaces Redis with direct MongoDB storage via Mongoose.
 * Automatic expiration is handled by MongoDB TTL index on the `expiresAt` field.
 */
class MongooseStore extends session.Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || IDLE_TIMEOUT_SECONDS;
  }

  async get(sid, callback) {
    try {
      const doc = await Session.findById(sid).lean();
      if (!doc) return callback(null, null);

      if (doc.expiresAt && new Date() > new Date(doc.expiresAt)) {
        await Session.findByIdAndDelete(sid);
        return callback(null, null);
      }

      return callback(null, doc.session);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const maxAge = sessionData?.cookie?.maxAge;
      const ttlMs = typeof maxAge === "number" ? maxAge : this.ttl * 1000;
      const expiresAt = new Date(Date.now() + ttlMs);

      await Session.findByIdAndUpdate(
        sid,
        {
          _id: sid,
          session: sessionData,
          expiresAt,
        },
        { upsert: true, new: true }
      );

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      const maxAge = sessionData?.cookie?.maxAge;
      const ttlMs = typeof maxAge === "number" ? maxAge : this.ttl * 1000;
      const expiresAt = new Date(Date.now() + ttlMs);

      await Session.findByIdAndUpdate(sid, { expiresAt });
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await Session.findByIdAndDelete(sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async clear(callback) {
    try {
      await Session.deleteMany({});
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async length(callback) {
    try {
      const count = await Session.countDocuments();
      if (callback) callback(null, count);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async all(callback) {
    try {
      const docs = await Session.find().lean();
      const sessions = docs.reduce((acc, doc) => {
        acc[doc._id] = doc.session;
        return acc;
      }, {});
      if (callback) callback(null, sessions);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Production-ready Express Session Configuration with Mongoose
 * - rolling: true resets cookie expiration & MongoDB TTL on every user activity
 * - resave: false prevents unnecessary session writes when untouched
 * - saveUninitialized: false avoids creating sessions for unauthenticated visitors
 */
const sessionMiddleware = session({
  store: new MongooseStore({ ttl: IDLE_TIMEOUT_SECONDS }),
  name: "sid", // Session cookie name
  secret: process.env.SESSION_SECRET || "careerconnect_session_secure_key_2026",
  resave: false,
  saveUninitialized: false,
  rolling: true, // Resets idle expiration timer on each incoming request
  cookie: {
    maxAge: IDLE_TIMEOUT_MS, // 15 minutes idle timeout
    httpOnly: true, // Protects cookie from XSS access
    secure: isProduction, // Set to true on HTTPS production
    sameSite: isProduction ? "none" : "lax", // Cross-site support in prod, lax in dev
    path: "/",
  },
});

module.exports = sessionMiddleware;
