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

  const isEmployer =
    req.user.role === "employer" ||
    req.user.userType === "employer" ||
    req.user.role === "COMPANY_ADMIN" ||
    req.user.adminLevel === "COMPANY_ADMIN";

  if (!isEmployer) {
    return res.status(403).json({
      success: false,
      message: "Access restricted: Employer account required",
    });
  }

  next();
};

/**
 * Generic role authorization middleware
 * @param {Array<string>} roles - e.g. ['employer', 'admin', 'user', 'SUPER_ADMIN', 'COMPANY_ADMIN']
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

/**
 * Restricts access to any valid Admin (SUPER_ADMIN, COMPANY_ADMIN, or legacy admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const role = req.user.role;
  if (role !== "SUPER_ADMIN" && role !== "COMPANY_ADMIN" && role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Administrator privileges required",
    });
  }

  next();
};

/**
 * Restricts access strictly to SUPER_ADMIN (Platform-level)
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Allow SUPER_ADMIN or legacy admin with no companyId as super admin
  const isSuper = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
  if (!isSuper) {
    return res.status(403).json({
      success: false,
      message: "Access denied: Super Administrator privileges required",
    });
  }

  next();
};

/**
 * Restricts access strictly to COMPANY_ADMIN (Tenant-level)
 */
const requireCompanyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "COMPANY_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Company Administrator privileges required",
    });
  }

  if (!req.user.companyId) {
    return res.status(403).json({
      success: false,
      message: "Access denied: No company assigned to this Company Administrator",
    });
  }

  next();
};

/**
 * Strict Multi-Tenant Scoping Middleware:
 * - If SUPER_ADMIN: Allows global access or optional company filtering
 * - If COMPANY_ADMIN: Strictly forces query scope to req.user.companyId.
 *   Rejects with 403 Forbidden if client attempts to specify a different companyId
 *   via URL params, query parameters, or request body.
 */
const scopeToCompany = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const isSuper = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);

  if (isSuper) {
    req.isSuperAdmin = true;
    req.companyFilter = req.query.companyId ? { companyId: req.query.companyId } : {};
    return next();
  }

  // COMPANY_ADMIN verification
  if (req.user.role !== "COMPANY_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Insufficient privileges",
    });
  }

  if (!req.user.companyId) {
    return res.status(403).json({
      success: false,
      message: "Access denied: No company assigned to this Company Administrator",
    });
  }

  const userCompanyIdStr = req.user.companyId.toString();

  // Verify URL param if provided (e.g. /companies/:companyId or /companies/:id)
  const requestedCompanyId = req.params.companyId || (req.baseUrl.includes("/companies") && req.params.id ? req.params.id : null);
  if (requestedCompanyId && requestedCompanyId !== userCompanyIdStr) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You cannot access data belonging to another company",
    });
  }

  // Verify query param if provided
  if (req.query.companyId && req.query.companyId !== userCompanyIdStr) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You cannot query data belonging to another company",
    });
  }

  // Verify request body if companyId is present
  if (req.body && req.body.companyId && req.body.companyId.toString() !== userCompanyIdStr) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You cannot assign resources to another company",
    });
  }

  // Auto-scope query filter
  req.isSuperAdmin = false;
  req.companyId = req.user.companyId;
  req.companyFilter = { companyId: req.user.companyId };

  next();
};

module.exports = {
  requireEmployer,
  requireRole,
  requireUserType,
  requireAdmin,
  requireSuperAdmin,
  requireCompanyAdmin,
  scopeToCompany,
};
