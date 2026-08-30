// server/middleware/roleMiddleware.js

/**
 * Middleware to restrict access to users with role === 'employer'
 */
const requireEmployer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "employer" && req.user.userType !== "employer") {
    return res.status(403).json({
      success: false,
      message: "Access restricted: Employer account required",
    });
  }

  next();
};

/**
 * Generic role authorization middleware
 * @param {Array<string>} roles - e.g. ['employer', 'admin', 'user']
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasRole =
      roles.includes(req.user.role) ||
      roles.includes(req.user.userType);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Insufficient permissions",
      });
    }

    next();
  };
};

/**
 * UserType authorization middleware
 * @param {Array<string>} userTypes - e.g. ['student', 'fresher', 'professional', 'employer']
 */
const requireUserType = (...userTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userType = req.user.userType || (req.user.role === "employer" ? "employer" : "student");

    if (!userTypes.includes(userType) && !userTypes.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Restricted to ${userTypes.join(" / ")} profiles`,
      });
    }

    next();
  };
};

module.exports = {
  requireEmployer,
  requireRole,
  requireUserType,
};
