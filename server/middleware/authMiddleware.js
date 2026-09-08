const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

/**
 * Authentication Middleware (JWT-based Verification)
 * 
 * 1. Checks Bearer token in headers or Cookie token.
 * 2. Verifies JWT payload and signature with JWT_SECRET.
 * 3. Validates that account exists and is not suspended.
 * 4. Attaches authenticated `req.user` to the request pipeline.
 */
const protect = async (req, res, next) => {
  try {
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