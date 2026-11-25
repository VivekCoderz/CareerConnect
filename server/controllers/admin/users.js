// Users, students, employers and company admin accounts.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const crypto = require("crypto");
const User = require("../../models/User");
const Company = require("../../models/Company");
const AuditLog = require("../../models/AuditLog");
const { generateAdminUsername } = require("./shared");

/**
 * GET /api/admin/company-admins
 */
exports.getCompanyAdmins = async (req, res, next) => {
  try {
    const { search = "", companyId = "", page = 1, limit = 15 } = req.query;
    const query = { role: "COMPANY_ADMIN" };

    if (companyId) {
      query.companyId = companyId;
    }

    if (search.trim()) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [admins, total] = await Promise.all([
      User.find(query)
        .populate("companyId", "name industry status")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      admins,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/company-admins
 */
exports.createCompanyAdmin = async (req, res, next) => {
  try {
    const { fullName, email, officialEmail, password, companyId, phone } = req.body;
    const targetEmail = (officialEmail || email || "").trim().toLowerCase();

    if (!fullName || !targetEmail || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Full name, official email, and assigned company are required.",
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Selected company does not exist" });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: targetEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const username = await generateAdminUsername(targetEmail, "admin");

    // If no password provided, initiate Invitation flow
    if (!password) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const admin = await User.create({
        fullName: fullName.trim(),
        email: targetEmail,
        username,
        phone: (phone || "").trim(),
        role: "COMPANY_ADMIN",
        userType: "admin",
        companyId: company._id,
        status: "invited",
        isActive: true,
        isEmailVerified: true,
        isProfileComplete: true,
        hasPassword: false,
        invitationToken: token,
        invitationExpires: expiry,
        invitationStatus: "invited",
      });

      await AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.fullName,
        action: "COMPANY_ADMIN_INVITED",
        module: "Roles",
        target: company.name,
        details: `Invited ${fullName} (${targetEmail}) as Company Admin for ${company.name}`,
        ipAddress: req.ip || "127.0.0.1",
      });

      const activationLink = `/admin/activate?token=${token}`;

      return res.status(201).json({
        success: true,
        message: `Company Admin invitation created successfully for ${company.name}`,
        admin: {
          _id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          companyId: admin.companyId,
          companyName: company.name,
          status: admin.status,
          invitationExpires: expiry,
        },
        activationLink,
        invitationToken: token,
      });
    }

    // Direct creation with password
    const admin = await User.create({
      fullName: fullName.trim(),
      email: targetEmail,
      username,
      phone: (phone || "").trim(),
      password, // Password hashing handled by User pre-save hook
      role: "COMPANY_ADMIN",
      userType: "admin",
      companyId: company._id,
      status: "active",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
      hasPassword: true,
    });

    return res.status(201).json({
      success: true,
      message: `Company Admin created successfully for ${company.name}`,
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        companyName: company.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/company-admins/invite
 * Super Admin creates a secure, time-limited Company Admin invitation without permanent password
 */
exports.inviteCompanyAdmin = async (req, res, next) => {
  try {
    const { fullName, email, officialEmail, phone, companyId } = req.body;
    const targetEmail = (officialEmail || email || "").trim().toLowerCase();

    if (!fullName || !targetEmail || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Full name, official email, and assigned company are required.",
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Selected company does not exist." });
    }

    if (company.status === "inactive" || company.status === "suspended") {
      return res.status(400).json({
        success: false,
        message: `Cannot invite admin to a ${company.status} company. Please activate the company first.`,
      });
    }

    const existing = await User.findOne({ email: targetEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let candidatePhone = (phone || "").trim();
    if (candidatePhone) {
      const existingPhone = await User.findOne({ phone: candidatePhone });
      if (existingPhone) candidatePhone = "";
    }

    const username = await generateAdminUsername(targetEmail, "admin");
    const admin = await User.create({
      fullName: fullName.trim(),
      email: targetEmail,
      username,
      phone: candidatePhone,
      role: "COMPANY_ADMIN",
      userType: "admin",
      companyId: company._id,
      status: "invited",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
      hasPassword: false,
      invitationToken: token,
      invitationExpires: expiry,
      invitationStatus: "invited",
    });

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.fullName,
      action: "COMPANY_ADMIN_INVITED",
      module: "Roles",
      target: company.name,
      details: `Invited ${fullName} (${targetEmail}) as Company Admin for ${company.name}`,
      ipAddress: req.ip || "127.0.0.1",
    });

    const activationLink = `/admin/activate?token=${token}`;

    return res.status(201).json({
      success: true,
      message: `Invitation generated successfully for ${fullName} (${company.name})`,
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        companyName: company.name,
        status: admin.status,
        invitationExpires: expiry,
      },
      activationLink,
      invitationToken: token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/company-admins/:id
 */
exports.updateCompanyAdmin = async (req, res, next) => {
  try {
    const { fullName, email, companyId, status, password } = req.body;
    const admin = await User.findById(req.params.id);

    if (!admin || admin.role !== "COMPANY_ADMIN") {
      return res.status(404).json({ success: false, message: "Company Admin not found" });
    }

    if (fullName) admin.fullName = fullName.trim();
    if (email) admin.email = email.trim().toLowerCase();
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) return res.status(404).json({ success: false, message: "Company not found" });
      admin.companyId = companyId;
    }
    if (status) {
      admin.status = status;
      admin.isActive = status === "active";
    }
    if (password && password.trim().length >= 6) {
      admin.password = password; // Pre-save hook will hash it
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Company Admin updated successfully",
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        status: admin.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/company-admins/:id/status
 */
exports.updateCompanyAdminStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "COMPANY_ADMIN") {
      return res.status(404).json({ success: false, message: "Company Admin not found" });
    }

    admin.status = status;
    admin.isActive = status === "active";
    await admin.save();

    return res.status(200).json({
      success: true,
      message: `Admin status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 6. USER MANAGEMENT (SCOPED / GLOBAL)
// =========================================================================

/**
 * GET /api/admin/users
 */
exports.getAdminUsers = async (req, res, next) => {
  try {
    const {
      userType = "",
      search = "",
      status = "",
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const andConditions = [];

    // Strict Scope: Company Admins only see their own company users
    if (req.user.role === "COMPANY_ADMIN") {
      andConditions.push({ companyId: req.user.companyId });
    } else if (req.isSuperAdmin) {
      // Super Admin can optionally filter by companyId
      if (req.query.companyId) {
        andConditions.push({ companyId: req.query.companyId });
      }
    }

    // User Type Filtering (support student, employer, fresher, professional, admin)
    if (userType && userType !== "all") {
      if (userType === "admin") {
        andConditions.push({
          $or: [
            { role: { $in: ["SUPER_ADMIN", "COMPANY_ADMIN", "admin"] } },
            { userType: "admin" },
          ],
        });
      } else {
        andConditions.push({
          $or: [{ userType: userType }, { role: userType }],
        });
      }
    }

    // Status Filtering (active / inactive)
    if (status && status !== "all") {
      if (status === "active") {
        andConditions.push({
          $or: [{ status: "active" }, { isActive: true }],
        });
      } else if (status === "inactive") {
        andConditions.push({
          $or: [{ status: "inactive" }, { isActive: false }],
        });
      }
    }

    // Search sanitization: Escape regex characters to prevent ReDoS attacks
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({
        $or: [
          { fullName: { $regex: sanitized, $options: "i" } },
          { email: { $regex: sanitized, $options: "i" } },
          { username: { $regex: sanitized, $options: "i" } },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const parsedLimit = limit === "all" ? 1000 : Math.min(Math.max(Number(limit) || 25, 1), 200);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortField = ["createdAt", "fullName", "email"].includes(sortBy) ? sortBy : "createdAt";

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("companyId", "name industry")
        .select("-password -resetPasswordToken -resetPasswordExpire")
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 'active' or 'inactive'",
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Security: Prevent self-deactivation of current administrative account
    if (targetUser._id.toString() === req.user._id.toString() && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Security violation: You cannot deactivate your own administrative account.",
      });
    }

    // Company Admin cannot modify users outside their company
    if (req.user.role === "COMPANY_ADMIN") {
      if (!targetUser.companyId || targetUser.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify users belonging to your company",
        });
      }
    }

    // Super Admin protection: Non-superadmins cannot modify an admin account
    const isTargetAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "admin"].includes(targetUser.role);
    if (isTargetAdmin && req.user.role !== "SUPER_ADMIN" && !req.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Security violation: Only a Super Administrator can alter administrative privileges.",
      });
    }

    targetUser.status = status;
    targetUser.isActive = status === "active";
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        status: targetUser.status,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Aliases for legacy student / employer management
exports.getAdminStudents = async (req, res, next) => {
  req.query.userType = "student";
  return exports.getAdminUsers(req, res, next);
};

exports.updateStudentStatus = async (req, res, next) => {
  return exports.updateUserStatus(req, res, next);
};

exports.updateEmployerStatus = async (req, res, next) => {
  return exports.updateUserStatus(req, res, next);
};

// =========================================================================
// 7. OPPORTUNITY MANAGEMENT (SCOPED / GLOBAL DYNAMIC MODERATION)
// =========================================================================
