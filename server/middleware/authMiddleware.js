const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

/**
 * Protects routes — verifies the CareerConnect JWT from HTTP-only cookie or Bearer header.
 *
 * Returns 401 with distinct messages for:
 *   - "Not authenticated"   → no token present
 *   - "Session expired"     → JWT expired (tokenExpiredError)
 *   - "Invalid token"       → malformed / tampered JWT
 *   - "User not found"      → valid token but user deleted from DB
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

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: "AUTH_ERROR",
      message: "Authentication failed. Please sign in again.",
    });
  }
};

module.exports = protect;