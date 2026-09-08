const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

/**
 * Authentication Middleware with Mongoose Session Support & Fallback JWT Verification
 * 
 * 1. Checks MongoDB Session (`req.session.user`).
 * 2. On activity, updates in-session `lastActive` timestamp (rolling: true extends TTL).
 * 3. Falls back to Bearer / Cookie JWT if token is provided.
 * 4. Returns 401 with distinct codes for NOT_AUTHENTICATED, SESSION_EXPIRED, INVALID_TOKEN, and USER_NOT_FOUND.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Primary Authentication: Active MongoDB Session
    if (req.session && req.session.user && req.session.user.userId) {
      const user = await User.findById(req.session.user.userId).select("-password");

      if (!user) {
        // User deleted or invalid in MongoDB -> destroy stale session
        req.session.destroy(() => {});
        return res.status(401).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "Account no longer exists. Please sign in again.",
        });
      }

      // Update session activity time
      req.session.user.lastActive = new Date();

      // Attach user & session details to request
      req.user = user;
      req.sessionUser = req.session.user;
      return next();
    }

    // 2. Secondary / Fallback Authentication: JWT Token (Cookie or Header)
    let token = req.cookies?.token;
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "NOT_AUTHENTICATED",
        message: "Not authenticated",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
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

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message:
          "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    req.user = user;
    // Automatically seed MongoDB session if not yet active
    if (req.session && !req.session.user) {
      req.session.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        userType: user.userType,
        loginTime: new Date(),
        lastActive: new Date(),
      };
    }
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: "AUTH_ERROR",
      message: "Authentication failed. Please sign in again.",
    });
  }
};

module.exports = protect;