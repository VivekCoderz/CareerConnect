// Admin sign-in: login, logout, current admin, invitation check and account activation.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const jwt = require("jsonwebtoken");
const { authCookieOptions, authCookieBaseOptions } = require("../../utils/authCookies");
const { revokeCookieToken } = require("../../middleware/authMiddleware");
const User = require("../../models/User");
const Company = require("../../models/Company");
const AuditLog = require("../../models/AuditLog");
const OrganizationRequest = require("../../models/OrganizationRequest");
const { isCompanyActive } = require("../../utils/employerOwnership");

const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate JWT and set secure cookie for Admin sessions.
 * `av` (authVersion) lets a password reset revoke admin tokens, as for user tokens.
 */
const sendAdminTokenResponse = (user, statusCode, res, populatedCompany = null) => {
  const token = jwt.sign(
    {
      id: user._id,
      userId: user._id,
      role: user.role,
      companyId: user.companyId || null,
      // authMiddleware rejects tokens whose av differs from the user's authVersion
      av: user.authVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Same options as the candidate/employer cookies (SameSite=Lax + Secure in production;
  // see utils/authCookies.js).
  const cookieOptions = authCookieOptions(ADMIN_SESSION_MS);
  res.cookie("admin_token", token, cookieOptions);
  res.cookie("token", token, cookieOptions); // Read by the general auth middleware

  // The JWT goes only in the httpOnly cookies, never in the JSON (where it could end
  // up in script-readable storage).
  return res.status(statusCode).json({
    success: true,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      userType: user.userType,
      companyId: user.companyId || null,
      company: populatedCompany || null,
      status: user.status || (user.isActive ? "active" : "inactive"),
      createdAt: user.createdAt,
    },
  });
};

/**
 * POST /api/admin/login
 * Strictly authenticates SUPER_ADMIN and COMPANY_ADMIN.
 * Any non-admin account gets a generic 401 error.
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, username, emailOrUsername, password } = req.body;
    const loginIdentifier = (email || username || emailOrUsername || "").trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both username/email and password",
      });
    }

    // Find user by email or username, explicitly selecting password
    const user = await User.findOne({
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }],
    }).select("+password");

    // Generic error to avoid revealing account existence
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Role check: ONLY SUPER_ADMIN, COMPANY_ADMIN, or legacy admin
    const isAdmin =
      user.role === "SUPER_ADMIN" ||
      user.role === "COMPANY_ADMIN" ||
      user.role === "admin";

    if (!isAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify account status
    if (user.isActive === false || user.status === "inactive" || user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your administrative account has been deactivated. Please contact platform support.",
      });
    }

    // Verify password with bcrypt

    // Populate company if COMPANY_ADMIN
    let populatedCompany = null;
    if (user.companyId) {
      populatedCompany = await Company.findById(user.companyId).select("name industry logo status");
    }

    // A Company Admin has no access while their company is inactive or deleted (ADM-11/12).
    if (user.role === "COMPANY_ADMIN" && !isCompanyActive(populatedCompany)) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_INACTIVE",
        message: "Your company account is not active. Please contact platform support.",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return sendAdminTokenResponse(user, 200, res, populatedCompany);
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

/**
 * POST /api/admin/logout
 */
exports.adminLogout = async (req, res) => {
  // Revoke the token itself, so a copy of it stops working too (H09).
  await revokeCookieToken(req);
  // Clearing only works when the options match the ones used to set the cookies.
  res.clearCookie("admin_token", authCookieBaseOptions());
  res.clearCookie("token", authCookieBaseOptions());
  return res.status(200).json({
    success: true,
    message: "Admin logged out successfully",
  });
};

/**
 * GET /api/admin/me
 */
exports.getAdminMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("companyId", "name industry logo status");
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 2. ADMIN DASHBOARD (ROLE-AWARE REAL MONGODB AGGREGATION)
// =========================================================================

/**
 * GET /api/admin/activate/verify
 * Public verification of Company Admin invitation token
 */
exports.verifyAdminInvitation = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required.",
      });
    }

    const user = await User.findOne({
      invitationToken: token,
      role: "COMPANY_ADMIN",
    }).select("+invitationToken +invitationExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid or expired invitation token. Please request a new invitation.",
      });
    }

    if (user.invitationExpires && user.invitationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "This invitation token has expired. Please contact the platform administrator.",
      });
    }

    if (user.status === "active" && user.hasPassword) {
      return res.status(400).json({
        success: false,
        code: "INVITATION_ALREADY_USED",
        message: "This invitation has already been used. Please sign in directly.",
      });
    }

    const company = await Company.findById(user.companyId);
    if (!company || company.status === "inactive" || company.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "COMPANY_INACTIVE",
        message: "The associated organization is currently inactive or suspended.",
      });
    }

    return res.status(200).json({
      success: true,
      invitation: {
        fullName: user.fullName,
        email: user.email,
        companyId: company._id,
        companyName: company.name,
        companyLogo: company.logo || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/activate
 * Public first-time Company Admin password creation & account activation
 */
exports.activateAdmin = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Invitation token and password are required.",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    const user = await User.findOne({
      invitationToken: token,
      role: "COMPANY_ADMIN",
    }).select("+invitationToken +invitationExpires +password");

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid invitation token. Please request a new invitation.",
      });
    }

    if (user.invitationExpires && user.invitationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "This invitation token has expired.",
      });
    }

    // An invitation only sets the first password. It must never replace the
    // password of an account that is already in use.
    if (user.hasPassword || user.status === "active") {
      return res.status(409).json({
        success: false,
        code: "ALREADY_ACTIVATED",
        message: "This account is already active. Please sign in, or use Forgot password.",
      });
    }

    const company = await Company.findById(user.companyId);
    if (!company || company.status === "inactive" || company.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "COMPANY_INACTIVE",
        message: "The associated organization is currently inactive or suspended.",
      });
    }

    user.password = password; // User pre-save hook hashes with bcryptjs
    user.hasPassword = true;
    user.status = "active";
    user.isActive = true;
    user.invitationToken = null;
    user.invitationStatus = "used";
    user.lastLogin = new Date();

    await user.save();

    await OrganizationRequest.findOneAndUpdate(
      { adminInvitationToken: token },
      { adminInvitationToken: null }
    );

    await AuditLog.create({
      actorId: user._id,
      actorName: user.fullName,
      companyId: user.companyId,
      action: "COMPANY_ADMIN_ACTIVATED",
      module: "Roles",
      target: company.name,
      details: `Account activated and password configured for ${user.email}`,
      ipAddress: req.ip || "127.0.0.1",
    });

    return sendAdminTokenResponse(user, 200, res, company);
  } catch (error) {
    next(error);
  }
};
