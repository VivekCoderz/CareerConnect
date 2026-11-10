const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

/**
 * Authentication middleware (H09): one login path.
 *
 * The only credential is the JWT in the httpOnly `token` cookie. There is no
 * Authorization: Bearer fallback and no server-side session. A token is valid while
 * its `av` claim matches the user's authVersion; logout, password reset and account
 * deletion change or remove that, which revokes every token issued before.
 *
 * Returns 401 with NOT_AUTHENTICATED, SESSION_EXPIRED, INVALID_TOKEN or USER_NOT_FOUND,
 * and 403 with ACCOUNT_SUSPENDED.
 *
 * The campus portal has its own header-only auth and does not use this middleware.
 */

/** The JWT from the `token` cookie, or null. */
const tokenFromCookie = (req) => {
  const token = req.cookies?.token;
  if (!token || token === "null" || token === "undefined") return null;
  return token;
};

const protect = async (req, res, next) => {
  try {
    const token = tokenFromCookie(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "NOT_AUTHENTICATED",
        message: "Not authenticated",
      });
    }

    let decoded;
    try {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "SESSION_EXPIRED",
          message: "Your session has expired. Please sign in again.",
        });
      }
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token. Please sign in again.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "Account no longer exists. Please sign in again.",
      });
    }

    if ((decoded.av || 0) !== (user.authVersion || 0)) {
      return res.status(401).json({ success: false, code: "SESSION_EXPIRED", message: "Please sign in again." });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message:
          "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: "AUTH_ERROR",
      message: "Authentication failed. Please sign in again.",
    });
  }
};

// Public detail pages can identify an owner without requiring visitors to sign in.
const optionalAuth = async (req, _res, next) => {
  const token = tokenFromCookie(req);
  if (!token || !process.env.JWT_SECRET) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive !== false && (decoded.av || 0) === (user.authVersion || 0)) req.user = user;
  } catch (_) { /* Treat an invalid credential as an anonymous public request. */ }
  next();
};

/**
 * Revokes the cookie's token on logout by moving the user's authVersion on, so a copy
 * of the token stops working too. This signs the user out on every device.
 * An invalid, expired or already-revoked token is ignored.
 */
const revokeCookieToken = async (req) => {
  const token = tokenFromCookie(req);
  if (!token || !process.env.JWT_SECRET) return;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Only a token that is still current can revoke; an old one must not log out a fresh login.
    // Older accounts may have no authVersion stored yet; that counts as 0.
    const av = decoded.av || 0;
    await User.updateOne(
      { _id: decoded.id, authVersion: av === 0 ? { $in: [0, null] } : av },
      { $inc: { authVersion: 1 } }
    );
  } catch (_) { /* Nothing to revoke. */ }
};

module.exports = protect;
module.exports.optionalAuth = optionalAuth;
module.exports.tokenFromCookie = tokenFromCookie;
module.exports.revokeCookieToken = revokeCookieToken;
