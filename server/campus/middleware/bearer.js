const jwt = require("jsonwebtoken");
const User = require("../../models/User");

// Campus requests are signed in only by the Authorization header. The shared E2Job `protect`
// prefers the session and the `token` cookie, so a browser that is also signed in to E2Job (as an
// admin or employer) would otherwise act as that account inside the university portal.
const bearerAuth = async (req, res, next) => {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ success: false, code: "NOT_AUTHENTICATED", message: "Please sign in." });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const expired = error.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        code: expired ? "SESSION_EXPIRED" : "INVALID_TOKEN",
        message: expired ? "Your session has expired. Please sign in again." : "Please sign in again.",
      });
    }
    const user = await User.findById(decoded.id).select("-password");
    if (!user || (decoded.av || 0) !== (user.authVersion || 0)) {
      return res.status(401).json({ success: false, code: "SESSION_EXPIRED", message: "Please sign in again." });
    }
    if (user.isActive === false) {
      return res.status(403).json({ success: false, code: "ACCOUNT_DISABLED", message: "This account is disabled." });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { bearerAuth };
