const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Company = require("../models/Company");
const Report = require("../models/Report");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const PlatformSetting = require("../models/PlatformSetting");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const Interview = require("../models/Interview");

/**
 * Generate JWT and set secure cookie for Admin sessions
 */
const sendAdminTokenResponse = (user, statusCode, res, populatedCompany = null) => {
  const token = jwt.sign(
    {
      id: user._id,
      userId: user._id,
      role: user.role,
      companyId: user.companyId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  res.cookie("admin_token", token, cookieOptions);
  res.cookie("token", token, cookieOptions); // Compatibility with general auth middleware

  return res.status(statusCode).json({
    success: true,
    token,
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
 * Helper to compute date filter based on range
 */
function getStartDateForRange(range) {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "30d":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

// =========================================================================
// 1. ADMIN AUTHENTICATION
// =========================================================================

/**
 * POST /api/admin/login
 * Strictly authenticates SUPER_ADMIN and COMPANY_ADMIN.
 * Any non-admin account gets a generic 401 error.
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = (email || username || "").trim().toLowerCase();

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

    // Verify account status
    if (user.isActive === false || user.status === "inactive" || user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your administrative account has been deactivated. Please contact platform support.",
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Populate company if COMPANY_ADMIN
    let populatedCompany = null;
    if (user.companyId) {
      populatedCompany = await Company.findById(user.companyId).select("name industry logo status");
    }

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
exports.adminLogout = (req, res) => {
  res.clearCookie("admin_token");
  res.clearCookie("token");
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
 * GET /api/admin/dashboard
 * Dynamically switches between SUPER_ADMIN (Platform) and COMPANY_ADMIN (Tenant)
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const { range = "30d" } = req.query;
    const startDate = getStartDateForRange(range);
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);

    // -------------------------------------------------------------------
    // A. COMPANY_ADMIN DASHBOARD: Strictly Scoped to Assigned Company
    // -------------------------------------------------------------------
    if (!isSuperAdmin) {
      const companyId = req.user.companyId;
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No company assigned to this Company Administrator",
        });
      }

      const company = await Company.findById(companyId);

      const [
        companyUsersCount,
        companyJobsCount,
        companyActiveJobsCount,
        companyInternshipsCount,
        companyActiveInternshipsCount,
        companyApplicationsCount,
        companySelectedCount,
        companyReportsCount,
        recentApplications,
        recentOpportunities,
      ] = await Promise.all([
        User.countDocuments({ companyId }),
        Job.countDocuments({ companyId }),
        Job.countDocuments({ companyId, status: { $in: ["Published", "active"] } }),
        Internship.countDocuments({ companyId }),
        Internship.countDocuments({ companyId, status: { $in: ["Published", "active"] } }),
        Application.countDocuments({ companyId }),
        Application.countDocuments({ companyId, status: { $in: ["Selected", "Hired"] } }),
        Report.countDocuments({ companyId, status: "Open" }),
        Application.find({ companyId })
          .populate("candidateId", "fullName email profileImage")
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
        Job.find({ companyId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const totalOpportunities = companyJobsCount + companyInternshipsCount;
      const activeOpportunities = companyActiveJobsCount + companyActiveInternshipsCount;

      const dashboardData = {
        role: "COMPANY_ADMIN",
        scope: "TENANT",
        company: {
          _id: company?._id || companyId,
          name: company?.name || "My Company",
          industry: company?.industry || "Technology",
          logo: company?.logo || "",
          status: company?.status || "active",
        },
        overview: {
          totalUsers: companyUsersCount,
          totalEmployers: 1,
          activeEmployers: 1,
          totalOpportunities,
          activeOpportunities,
          totalApplications: companyApplicationsCount,
          upcomingInterviews: companySelectedCount,
          requiresAttention: companyReportsCount,
        },
        users: {
          students: companyUsersCount,
          freshers: 0,
          professionals: 0,
          employers: 1,
        },
        opportunities: {
          jobs: { total: companyJobsCount, published: companyActiveJobsCount },
          internships: { total: companyInternshipsCount, published: companyActiveInternshipsCount },
        },
        applicationFunnel: {
          total: companyApplicationsCount,
          selected: companySelectedCount,
          byType: { jobs: companyJobsCount, internships: companyInternshipsCount },
        },
        userGrowth: [],
        attention: (await Report.find({ companyId, status: "Open" }).limit(5).lean()).map((r) => ({
          id: r._id,
          title: `${r.reportType}: ${r.targetTitle || "Complaint"}`,
          category: "Reports",
          severity: "high",
          link: "/admin/reports",
        })),
        recentActivity: (recentApplications || []).map((app) => ({
          id: app._id,
          title: `Application for ${app.opportunityTitle || "Role"}`,
          candidate: app.candidateId?.fullName || "Candidate",
          status: app.status || "Applied",
          date: app.createdAt,
        })),
      };

      return res.status(200).json({
        success: true,
        data: dashboardData,
        ...dashboardData,
      });
    }

    // -------------------------------------------------------------------
    // B. SUPER_ADMIN DASHBOARD: Global Platform-Wide Aggregations
    // -------------------------------------------------------------------
    const [
      totalCompanies,
      activeCompanies,
      totalCompanyAdmins,
      totalStudents,
      totalEmployers,
      totalFreshers,
      totalProfessionals,
      totalJobs,
      activeJobs,
      totalInternships,
      activeInternships,
      totalApplications,
      selectedApplications,
      openReports,
      recentCompanies,
      recentApplications,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "active" }),
      User.countDocuments({ role: "COMPANY_ADMIN" }),
      User.countDocuments({ userType: "student" }),
      User.countDocuments({ userType: "employer" }),
      User.countDocuments({ userType: "fresher" }),
      User.countDocuments({ userType: "professional" }),
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ["Published", "active"] } }),
      Internship.countDocuments(),
      Internship.countDocuments({ status: { $in: ["Published", "active"] } }),
      Application.countDocuments(),
      Application.countDocuments({ status: { $in: ["Selected", "Hired"] } }),
      Report.countDocuments({ status: "Open" }),
      Company.find().sort({ createdAt: -1 }).limit(5).lean(),
      Application.find()
        .populate("candidateId", "fullName email profileImage")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const totalUsers = totalStudents + totalEmployers + totalFreshers + totalProfessionals;
    const totalOpportunities = totalJobs + totalInternships;
    const activeOpportunities = activeJobs + activeInternships;

    // Monthly Trends aggregation
    const applicationTrends = await Application.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const superAdminDashboardData = {
      role: "SUPER_ADMIN",
      scope: "GLOBAL",
      overview: {
        totalUsers,
        totalEmployers,
        activeEmployers: activeCompanies || totalEmployers,
        totalOpportunities,
        activeOpportunities,
        totalApplications,
        upcomingInterviews: selectedApplications,
        requiresAttention: openReports,
        totalCompanies,
        activeCompanies,
        totalCompanyAdmins,
      },
      users: {
        students: totalStudents,
        employers: totalEmployers,
        freshers: totalFreshers,
        professionals: totalProfessionals,
      },
      opportunities: {
        jobs: { total: totalJobs, published: activeJobs },
        internships: { total: totalInternships, published: activeInternships },
      },
      applicationFunnel: {
        total: totalApplications,
        selected: selectedApplications,
        byType: { jobs: totalJobs, internships: totalInternships },
      },
      userGrowth: applicationTrends.map((item) => ({ date: item._id, count: item.count })),
      attention: (await Report.find({ status: "Open" }).limit(5).lean()).map((r) => ({
        id: r._id,
        title: `${r.reportType}: ${r.targetTitle || "Flagged Content"}`,
        category: "Reports",
        severity: "high",
        link: "/admin/reports",
      })),
      recentActivity: (recentApplications || []).map((app) => ({
        id: app._id,
        title: `Application for ${app.opportunityTitle || "Role"}`,
        candidate: app.candidateId?.fullName || "Candidate",
        status: app.status || "Applied",
        date: app.createdAt,
      })),
      recentCompanies: (recentCompanies || []).map((c) => ({
        _id: c._id,
        name: c.name,
        industry: c.industry,
        status: c.status,
        createdAt: c.createdAt,
      })),
    };

    return res.status(200).json({
      success: true,
      data: superAdminDashboardData,
      ...superAdminDashboardData,
    });
  } catch (error) {
    console.error("Admin dashboard aggregation error:", error);
    next(error);
  }
};

// =========================================================================
// 3. COMPANY MANAGEMENT (SUPER_ADMIN ONLY)
// =========================================================================

/**
 * GET /api/admin/companies
 */
exports.getAdminCompanies = async (req, res, next) => {
  try {
    const { search = "", status = "", page = 1, limit = 15 } = req.query;
    const query = {};

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { industry: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [companies, total] = await Promise.all([
      Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Company.countDocuments(query),
    ]);

    // Attach company admin count and opportunities count for each company
    const enrichedCompanies = await Promise.all(
      companies.map(async (c) => {
        const [adminCount, jobsCount, appsCount] = await Promise.all([
          User.countDocuments({ companyId: c._id, role: "COMPANY_ADMIN" }),
          Job.countDocuments({ companyId: c._id }),
          Application.countDocuments({ companyId: c._id }),
        ]);
        return {
          ...c,
          adminCount,
          opportunitiesCount: jobsCount,
          applicationsCount: appsCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      companies: enrichedCompanies,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to generate a unique lowercase username for admin users
 */
const generateAdminUsername = async (email, prefix = "admin") => {
  const base = (email ? email.split("@")[0] : prefix)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 18) || prefix;
  let candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
  let attempts = 0;
  while (attempts < 5) {
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
    candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    attempts++;
  }
  return `${base}_${Date.now().toString().slice(-4)}`;
};

/**
 * POST /api/admin/companies
 */
exports.createAdminCompany = async (req, res, next) => {
  try {
    const {
      name,
      description,
      email,
      phone,
      website,
      industry,
      location,
      status,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    const existing = await Company.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A company with this name already exists" });
    }

    const company = await Company.create({
      name: name.trim(),
      description: description || "",
      email: email || "",
      phone: phone || "",
      website: website || "",
      industry: industry || "Information Technology",
      location: location || "",
      status: status || "active",
    });

    // Optionally provision primary Company Admin with login credentials in the same step
    let createdAdmin = null;
    const loginEmail = (adminEmail || email || "").trim().toLowerCase();

    if (adminPassword && adminPassword.trim()) {
      if (adminPassword.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: "Company Admin password must be at least 6 characters long",
        });
      }
      if (!loginEmail) {
        return res.status(400).json({
          success: false,
          message: "Please provide an Official Email or Admin Email to create the admin account",
        });
      }
    }

    if (adminPassword && adminPassword.trim().length >= 6 && loginEmail) {
      const existingUser = await User.findOne({ email: loginEmail });
      if (existingUser) {
        existingUser.role = "COMPANY_ADMIN";
        existingUser.companyId = company._id;
        existingUser.password = adminPassword; // User pre-save hook will hash with bcrypt
        existingUser.status = "active";
        existingUser.isActive = true;
        await existingUser.save();
        createdAdmin = existingUser;
      } else {
        const username = await generateAdminUsername(loginEmail, "admin");
        createdAdmin = await User.create({
          fullName: (adminName || `${name.trim()} Administrator`).trim(),
          email: loginEmail,
          username,
          password: adminPassword,
          role: "COMPANY_ADMIN",
          userType: "admin",
          companyId: company._id,
          phone: phone || "",
          countryCode: "+91",
          status: "active",
          isActive: true,
          isEmailVerified: true,
          isProfileComplete: true,
          hasPassword: true,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: createdAdmin
        ? `Company ${company.name} and Company Admin (${loginEmail}) provisioned successfully`
        : `Company ${company.name} created successfully`,
      company,
      admin: createdAdmin
        ? {
            _id: createdAdmin._id,
            fullName: createdAdmin.fullName,
            email: createdAdmin.email,
            role: createdAdmin.role,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/companies/:id
 */
exports.getAdminCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const [admins, totalJobs, totalInternships, totalApplications] = await Promise.all([
      User.find({ companyId: company._id, role: "COMPANY_ADMIN" }).select("fullName email status createdAt"),
      Job.countDocuments({ companyId: company._id }),
      Internship.countDocuments({ companyId: company._id }),
      Application.countDocuments({ companyId: company._id }),
    ]);

    return res.status(200).json({
      success: true,
      company,
      admins,
      stats: {
        totalOpportunities: totalJobs + totalInternships,
        totalApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/companies/:id
 */
exports.updateAdminCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/companies/:id/status
 */
exports.updateAdminCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    return res.status(200).json({
      success: true,
      message: `Company status updated to ${status}`,
      company,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/companies/:id
 */
exports.deleteAdminCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Clean up or dissociate company users
    await User.updateMany({ companyId: req.params.id }, { $set: { companyId: null, isActive: false } });

    return res.status(200).json({
      success: true,
      message: "Company and associations removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 4. OWN COMPANY PROFILE (COMPANY_ADMIN)
// =========================================================================

/**
 * GET /api/admin/company
 */
exports.getOwnCompany = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: "No company assigned" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const [users, jobsCount, appsCount] = await Promise.all([
      User.find({ companyId }).select("fullName email role status createdAt"),
      Job.countDocuments({ companyId }),
      Application.countDocuments({ companyId }),
    ]);

    return res.status(200).json({
      success: true,
      company,
      users,
      stats: {
        totalOpportunities: jobsCount,
        totalApplications: appsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/company
 */
exports.updateOwnCompany = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: "No company assigned" });
    }

    // Whitelist editable fields for company admin
    const { description, phone, website, industry, location, settings } = req.body;
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;
    if (location !== undefined) updateData.location = location;
    if (settings !== undefined) updateData.settings = settings;

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Company details updated successfully",
      company,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 5. COMPANY ADMIN MANAGEMENT (SUPER_ADMIN ONLY)
// =========================================================================

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
    const { fullName, email, password, companyId } = req.body;

    if (!fullName || !email || !password || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, password, and assigned company are required",
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Selected company does not exist" });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const username = await generateAdminUsername(email, "admin");
    const admin = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      username,
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
    const { userType = "", search = "", status = "", page = 1, limit = 15 } = req.query;
    const query = {};

    // Strict Scope: Company Admins only see their own company users
    if (req.user.role === "COMPANY_ADMIN") {
      query.companyId = req.user.companyId;
    } else if (req.isSuperAdmin) {
      // Super Admin can optionally filter by companyId
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
    }

    if (userType && userType !== "all") {
      query.userType = userType;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search.trim()) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { username: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .populate("companyId", "name industry")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
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
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
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

    targetUser.status = status;
    targetUser.isActive = status === "active";
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user: targetUser,
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

exports.getAdminEmployers = async (req, res, next) => {
  req.query.userType = "employer";
  return exports.getAdminUsers(req, res, next);
};

exports.updateEmployerStatus = async (req, res, next) => {
  return exports.updateUserStatus(req, res, next);
};

// =========================================================================
// 7. OPPORTUNITY MANAGEMENT (SCOPED / GLOBAL DYNAMIC MODERATION)
// =========================================================================

/**
 * GET /api/admin/opportunities
 * Comprehensive server-side filtering, dynamic KPIs, application counts, and attention items
 */
exports.getAdminOpportunities = async (req, res, next) => {
  try {
    const {
      type = "all",
      status = "all",
      companyId = "",
      search = "",
      startDate = "",
      endDate = "",
      page = 1,
      limit = 12,
    } = req.query;

    const isCompanyAdmin = req.user.role === "COMPANY_ADMIN";
    const effectiveCompanyId = isCompanyAdmin ? req.user.companyId : companyId;

    // Base filter for KPI counts (scoped to company if company admin or company filter passed)
    const statsBaseFilter = {};
    if (effectiveCompanyId) {
      statsBaseFilter.companyId = effectiveCompanyId;
    }

    const now = new Date();

    // 1. DYNAMIC KPIS (Real MongoDB countDocuments)
    const [
      totalJobs,
      totalInternships,
      publishedJobs,
      publishedInternships,
      pendingJobs,
      pendingInternships,
      closedJobs,
      closedInternships,
      expiredJobs,
      expiredInternships,
      rejectedJobs,
      rejectedInternships,
      featuredJobs,
      featuredInternships,
    ] = await Promise.all([
      Job.countDocuments(statsBaseFilter),
      Internship.countDocuments(statsBaseFilter),
      // Active & Published: status Published and not past deadline
      Job.countDocuments({
        ...statsBaseFilter,
        status: "Published",
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      }),
      Internship.countDocuments({
        ...statsBaseFilter,
        status: "Published",
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      }),
      // Pending Review
      Job.countDocuments({ ...statsBaseFilter, status: "Pending Approval" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Pending Approval" }),
      // Manually Closed
      Job.countDocuments({ ...statsBaseFilter, status: "Closed" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Closed" }),
      // Expired (deadline passed & still Published)
      Job.countDocuments({ ...statsBaseFilter, status: "Published", deadline: { $lt: now } }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Published", deadline: { $lt: now } }),
      // Rejected
      Job.countDocuments({ ...statsBaseFilter, status: "Rejected" }),
      Internship.countDocuments({ ...statsBaseFilter, status: "Rejected" }),
      // Featured
      Job.countDocuments({ ...statsBaseFilter, isFeatured: true }),
      Internship.countDocuments({ ...statsBaseFilter, isFeatured: true }),
    ]);

    const totalListings = totalJobs + totalInternships;
    const activePublished = publishedJobs + publishedInternships;
    const pendingReview = pendingJobs + pendingInternships;
    const closedExpired = (closedJobs + closedInternships) + (expiredJobs + expiredInternships);

    const stats = {
      total: totalListings,
      totalJobs,
      totalInternships,
      published: activePublished,
      pending: pendingReview,
      closed: closedExpired,
      rejected: rejectedJobs + rejectedInternships,
      featured: featuredJobs + featuredInternships,
    };

    // 2. BUILD QUERY FILTER FOR LISTINGS
    const queryFilter = {};
    if (effectiveCompanyId) {
      queryFilter.companyId = effectiveCompanyId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      queryFilter.$or = [
        { title: { $regex: s, $options: "i" } },
        { companyName: { $regex: s, $options: "i" } },
        { location: { $regex: s, $options: "i" } },
        { city: { $regex: s, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      queryFilter.createdAt = {};
      if (startDate) queryFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        queryFilter.createdAt.$lte = eDate;
      }
    }

    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "pending" || normalizedStatus === "pending review" || normalizedStatus === "pending approval") {
      queryFilter.status = "Pending Approval";
    } else if (normalizedStatus === "published" || normalizedStatus === "approved" || normalizedStatus === "active") {
      queryFilter.status = "Published";
      queryFilter.$and = queryFilter.$and || [];
      queryFilter.$and.push({
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }],
      });
    } else if (normalizedStatus === "closed") {
      queryFilter.status = "Closed";
    } else if (normalizedStatus === "expired") {
      queryFilter.deadline = { $lt: now };
    } else if (normalizedStatus === "rejected") {
      queryFilter.status = "Rejected";
    } else if (normalizedStatus === "featured") {
      queryFilter.isFeatured = true;
    } else if (status !== "all" && status !== "") {
      queryFilter.status = status;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    let items = [];
    let total = 0;

    const populateFields = [
      { path: "companyId", select: "name logo status isVerified location industry" },
      { path: "createdBy", select: "fullName email phone" },
      { path: "approvedBy", select: "fullName email" },
      { path: "rejectedBy", select: "fullName email" },
    ];

    if (type === "job" || type === "jobs") {
      [items, total] = await Promise.all([
        Job.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Job.countDocuments(queryFilter),
      ]);
      items = items.map((j) => ({ ...j, opportunityType: "Job" }));
    } else if (type === "internship" || type === "internships") {
      [items, total] = await Promise.all([
        Internship.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Internship.countDocuments(queryFilter),
      ]);
      items = items.map((i) => ({ ...i, opportunityType: "Internship" }));
    } else {
      const [jobsTotal, internshipsTotal] = await Promise.all([
        Job.countDocuments(queryFilter),
        Internship.countDocuments(queryFilter),
      ]);
      total = jobsTotal + internshipsTotal;

      const [jobs, internships] = await Promise.all([
        Job.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .limit(skip + limitNum)
          .lean(),
        Internship.find(queryFilter)
          .populate(populateFields)
          .sort({ createdAt: -1 })
          .limit(skip + limitNum)
          .lean(),
      ]);

      const combined = [
        ...jobs.map((j) => ({ ...j, opportunityType: "Job" })),
        ...internships.map((i) => ({ ...i, opportunityType: "Internship" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      items = combined.slice(skip, skip + limitNum);
    }

    // 3. REAL DYNAMIC APPLICATION COUNTS
    const oppIds = items.map((it) => it._id);
    if (oppIds.length > 0) {
      const appCounts = await Application.aggregate([
        {
          $match: {
            $or: [{ jobId: { $in: oppIds } }, { internshipId: { $in: oppIds } }],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$jobId", "$internshipId"] },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap = {};
      appCounts.forEach((ac) => {
        if (ac._id) countMap[ac._id.toString()] = ac.count;
      });

      items = items.map((it) => ({
        ...it,
        applicationsCount: countMap[it._id.toString()] || 0,
        isExpired: it.deadline ? new Date(it.deadline) < now : false,
      }));
    }

    // 4. REQUIRES ATTENTION SECTION (Real MongoDB alerts only)
    const attentionItems = [];
    if (pendingReview > 0) {
      attentionItems.push({
        id: "pending-approvals",
        type: "pending",
        severity: "warning",
        title: `${pendingReview} Opportunities Awaiting Review`,
        description: "Employer listings waiting for administrative approval to go live.",
        actionFilter: "Pending Approval",
      });
    }

    const openReportsCount = await Report.countDocuments({
      targetType: { $in: ["job", "internship", "Job", "Internship"] },
      status: "Open",
    });
    if (openReportsCount > 0) {
      attentionItems.push({
        id: "reported-opportunities",
        type: "reported",
        severity: "danger",
        title: `${openReportsCount} Reported Opportunities`,
        description: "Opportunities reported by users for misleading or inappropriate content.",
        link: "/admin/reports",
      });
    }

    const suspendedCompanies = await Company.find({ status: "suspended" }).select("_id name").lean();
    if (suspendedCompanies.length > 0) {
      const suspendedIds = suspendedCompanies.map((c) => c._id);
      const suspendedActiveOpps = await Promise.all([
        Job.countDocuments({ companyId: { $in: suspendedIds }, status: "Published" }),
        Internship.countDocuments({ companyId: { $in: suspendedIds }, status: "Published" }),
      ]);
      const suspendedActiveCount = suspendedActiveOpps[0] + suspendedActiveOpps[1];
      if (suspendedActiveCount > 0) {
        attentionItems.push({
          id: "suspended-company-listings",
          type: "suspended_company",
          severity: "danger",
          title: `${suspendedActiveCount} Active Listings from Suspended Companies`,
          description: "Companies currently suspended still have active opportunities visible to candidates.",
          actionFilter: "Published",
        });
      }
    }

    const expiredActiveCount = expiredJobs + expiredInternships;
    if (expiredActiveCount > 0) {
      attentionItems.push({
        id: "expired-active-listings",
        type: "expired",
        severity: "info",
        title: `${expiredActiveCount} Opportunities Past Deadline`,
        description: "Listings that have surpassed their application deadline.",
        actionFilter: "expired",
      });
    }

    // 5. RECENT MODERATION ACTIVITY (Real from AuditLog)
    const recentActivity = await AuditLog.find({
      module: { $in: ["Jobs", "Opportunities", "Internships"] },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        opportunities: items,
        stats,
        attention: attentionItems,
        recentActivity: (recentActivity || []).map((a) => ({
          _id: a._id,
          action: a.action,
          target: a.target,
          details: a.details,
          actorName: a.actorName,
          createdAt: a.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("getAdminOpportunities error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/opportunities/companies-list
 * Helper for filter dropdowns
 */
exports.getOpportunityCompaniesList = async (req, res, next) => {
  try {
    const companies = await Company.find({ status: { $ne: "deleted" } })
      .select("_id name logo industry status isVerified")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/opportunities/:type/:id/approve
 * Approves a pending opportunity and marks it Published (visible to candidates)
 */
exports.approveOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { adminNote = "" } = req.body;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    // Scoped security check for COMPANY_ADMIN
    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only approve opportunities belonging to your company",
        });
      }
    }

    opp.status = "Published";
    opp.approvedBy = req.user._id;
    opp.approvedAt = new Date();
    opp.rejectedBy = null;
    opp.rejectedAt = null;
    opp.rejectionReason = null;
    if (adminNote) opp.adminNote = adminNote.trim();

    await opp.save();

    // Create Audit Log
    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "APPROVE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity approved and published. ${adminNote ? `Note: ${adminNote}` : ""}`.trim(),
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    // Notify creator/employer if applicable
    if (opp.createdBy) {
      try {
        await Notification.create({
          recipient: opp.createdBy,
          recipientId: opp.createdBy,
          senderRole: "admin",
          sender: "CareerConnect Moderation Team",
          title: "Opportunity Approved",
          preview: `Your listing "${opp.title}" has been approved.`,
          message: `Your opportunity listing "${opp.title}" has been reviewed and approved by Platform Administration. It is now active and accepting candidate applications.`,
          category: "system_alert",
          notificationType: "info",
        });
      } catch (notifErr) {
        console.warn("Notification creation warning:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" approved and published successfully.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/opportunities/:type/:id/reject
 * Rejects opportunity with required reason and optional admin note (does not delete)
 */
exports.rejectOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { rejectionReason, adminNote = "" } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid rejection reason is required.",
      });
    }

    const Model = type.toLowerCase() === "internship" ? Internship : Job;
    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only moderate opportunities belonging to your company",
        });
      }
    }

    opp.status = "Rejected";
    opp.rejectedBy = req.user._id;
    opp.rejectedAt = new Date();
    opp.rejectionReason = rejectionReason.trim();
    opp.adminNote = adminNote.trim();

    await opp.save();

    // Create Audit Log
    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "REJECT_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Rejected for reason: ${rejectionReason}. Note: ${adminNote}`.trim(),
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    // Send Notification to creator
    if (opp.createdBy) {
      try {
        await Notification.create({
          recipient: opp.createdBy,
          recipientId: opp.createdBy,
          senderRole: "admin",
          sender: "CareerConnect Moderation Team",
          title: "Opportunity Listing Rejected",
          preview: `Listing "${opp.title}" requires modifications.`,
          message: `Your listing "${opp.title}" was rejected during moderation. Reason: ${rejectionReason}.${
            adminNote ? ` Admin note: ${adminNote}` : ""
          } Please review and update your listing.`,
          category: "system_alert",
          notificationType: "warning",
        });
      } catch (notifErr) {
        console.warn("Notification creation warning:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" marked as Rejected.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/opportunities/:type/:id
 * Direct edit of existing opportunity details in MongoDB
 */
exports.editOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only edit opportunities belonging to your company",
        });
      }
    }

    const {
      title,
      department,
      category,
      subCategory,
      workMode,
      location,
      city,
      state,
      country,
      description,
      requiredSkills,
      preferredSkills,
      openings,
      deadline,
      salaryRange,
      stipend,
      duration,
      isFeatured,
      status,
    } = req.body;

    if (title) opp.title = title.trim();
    if (department !== undefined) opp.department = department;
    if (category !== undefined) opp.category = category;
    if (subCategory !== undefined) opp.subCategory = subCategory;
    if (workMode !== undefined) opp.workMode = workMode;
    if (location) opp.location = location.trim();
    if (city !== undefined) opp.city = city;
    if (state !== undefined) opp.state = state;
    if (country !== undefined) opp.country = country;
    if (description) opp.description = description.trim();
    if (requiredSkills !== undefined) {
      opp.requiredSkills = Array.isArray(requiredSkills)
        ? requiredSkills
        : String(requiredSkills).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (preferredSkills !== undefined) {
      opp.preferredSkills = Array.isArray(preferredSkills)
        ? preferredSkills
        : String(preferredSkills).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (openings !== undefined) opp.openings = Math.max(1, Number(openings) || 1);
    if (deadline !== undefined) opp.deadline = deadline ? new Date(deadline) : null;
    if (salaryRange !== undefined && opp.salaryRange) {
      opp.salaryRange = { ...opp.salaryRange.toObject?.() || opp.salaryRange, ...salaryRange };
    }
    if (stipend !== undefined) opp.stipend = stipend;
    if (duration !== undefined) opp.duration = duration;
    if (isFeatured !== undefined) opp.isFeatured = Boolean(isFeatured);
    if (status !== undefined) opp.status = status;

    await opp.save();

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "EDIT_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity updated by Admin.`,
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Opportunity updated successfully",
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/close
 * Closes opportunity (stops accepting new applications without deleting history)
 */
exports.closeOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only close opportunities belonging to your company",
        });
      }
    }

    opp.status = "Closed";
    await opp.save();

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "CLOSE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: "Opportunity closed. No further applications accepted.",
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" has been closed.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/feature
 * Toggles isFeatured in MongoDB
 */
exports.featureOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { isFeatured } = req.body;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    opp.isFeatured = Boolean(isFeatured);
    await opp.save();

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: opp.isFeatured ? "FEATURE_OPPORTUNITY" : "UNFEATURE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity ${opp.isFeatured ? "featured on candidate discovery" : "unfeatured"}.`,
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity ${opp.isFeatured ? "marked as Featured" : "unfeatured"} successfully.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/status
 * General status update (kept for backward compatibility)
 */
exports.updateOpportunityStatus = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify opportunities belonging to your company",
        });
      }
    }

    opp.status = status;
    if (status === "Published") {
      opp.approvedBy = req.user._id;
      opp.approvedAt = new Date();
    } else if (status === "Rejected") {
      opp.rejectedBy = req.user._id;
      opp.rejectedAt = new Date();
    }
    await opp.save();

    return res.status(200).json({
      success: true,
      message: `Opportunity status updated to ${status}`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 8. APPLICATION MANAGEMENT (SCOPED / GLOBAL)
// =========================================================================

/**
 * GET /api/admin/applications
 */
exports.getAdminApplications = async (req, res, next) => {
  try {
    const { status = "all", search = "", page = 1, limit = 15 } = req.query;
    const filter = {};

    // Strict Scope: Company Admins only see applications for their company
    if (req.user.role === "COMPANY_ADMIN") {
      filter.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (status !== "all") {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate("candidateId", "fullName email profileImage phone city")
        .populate("companyId", "name logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      applications,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/applications/:id/status
 */
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Company Admin access control: must belong to their assigned company
    if (req.user.role === "COMPANY_ADMIN") {
      if (!application.companyId || application.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify applications belonging to your company",
        });
      }
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 9. REPORTS & TRUST MODERATION (SCOPED / GLOBAL DYNAMIC SYSTEM)
// =========================================================================

/**
 * GET /api/admin/reports
 * Rich server-side filtering, dynamic summary KPIs, repeat-target clustering, attention alerts, and audit feed
 */
exports.getAdminReports = async (req, res, next) => {
  try {
    const {
      status = "all",
      category = "all",
      type = "all",
      priority = "all",
      companyId = "",
      search = "",
      dateRange = "all",
      startDate = "",
      endDate = "",
      page = 1,
      limit = 12,
    } = req.query;

    const isCompanyAdmin = req.user.role === "COMPANY_ADMIN";
    const effectiveCompanyId = isCompanyAdmin ? req.user.companyId : companyId;

    // 1. BASE FILTER FOR STATS
    const statsFilter = {};
    if (effectiveCompanyId) {
      statsFilter.companyId = effectiveCompanyId;
    }

    const [totalReports, openReports, investigatingReports, resolvedReports, dismissedReports, criticalReports] =
      await Promise.all([
        Report.countDocuments(statsFilter),
        Report.countDocuments({ ...statsFilter, status: "Open" }),
        Report.countDocuments({ ...statsFilter, status: { $in: ["Investigating", "Under Review"] } }),
        Report.countDocuments({ ...statsFilter, status: "Resolved" }),
        Report.countDocuments({ ...statsFilter, status: "Dismissed" }),
        Report.countDocuments({ ...statsFilter, priority: "Critical", status: { $in: ["Open", "Investigating", "Under Review"] } }),
      ]);

    const stats = {
      total: totalReports,
      open: openReports,
      investigating: investigatingReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
      critical: criticalReports,
    };

    // 2. QUERY FILTER FOR LISTINGS
    const filter = {};
    if (effectiveCompanyId) {
      filter.companyId = effectiveCompanyId;
    }

    // Status filter
    if (status && status !== "all") {
      if (status.toLowerCase() === "investigating" || status.toLowerCase() === "under review") {
        filter.status = { $in: ["Investigating", "Under Review"] };
      } else {
        filter.status = status;
      }
    }

    // Category / ReportType filter
    const cat = category !== "all" ? category : type !== "all" ? type : "";
    if (cat) {
      filter.$or = filter.$or || [];
      filter.$or.push({ category: cat }, { reportType: cat });
    }

    // Priority filter
    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    // Date filtering
    const now = new Date();
    if (dateRange === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: startOfDay };
    } else if (dateRange === "7d") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: past7 };
    } else if (dateRange === "30d") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: past30 };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = eDate;
      }
    }

    // Server-side Search
    if (search && search.trim()) {
      const s = search.trim();
      const searchConditions = [
        { details: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { category: { $regex: s, $options: "i" } },
        { reportType: { $regex: s, $options: "i" } },
        { targetTitle: { $regex: s, $options: "i" } },
        { reportedByName: { $regex: s, $options: "i" } },
      ];

      if (mongoose.Types.ObjectId.isValid(s)) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(s) });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("companyId", "name logo status isVerified industry")
        .populate("reportedBy", "fullName email role userType phone profileImage")
        .populate("opportunityId", "title companyName workMode location status deadline openings")
        .populate("applicationId", "opportunityTitle status createdAt studentName studentEmail")
        .populate("interviewId", "title roundName interviewType status date time roundNumber")
        .populate("reportedUserId", "fullName email role userType phone profileImage")
        .populate("resolvedBy", "fullName email")
        .populate("dismissedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Report.countDocuments(filter),
    ]);

    // 3. MULTI-TARGET DETECTION (Detect repeat reports on same Opportunity/Company)
    const targetIds = reports
      .map((r) => r.opportunityId?._id || r.targetId || r.companyId?._id)
      .filter(Boolean);

    let repeatCountMap = {};
    if (targetIds.length > 0) {
      const repeatCounts = await Report.aggregate([
        {
          $match: {
            $or: [
              { opportunityId: { $in: targetIds } },
              { targetId: { $in: targetIds } },
              { companyId: { $in: targetIds } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$opportunityId", { $ifNull: ["$targetId", "$companyId"] }] },
            count: { $sum: 1 },
          },
        },
      ]);
      repeatCounts.forEach((rc) => {
        if (rc._id) repeatCountMap[rc._id.toString()] = rc.count;
      });
    }

    const enhancedReports = reports.map((r) => {
      const tId = (r.opportunityId?._id || r.targetId || r.companyId?._id)?.toString();
      const repeatCount = tId ? repeatCountMap[tId] || 1 : 1;
      return {
        ...r,
        repeatCount,
        hasRepeatAlert: repeatCount > 1,
      };
    });

    // 4. REQUIRES ATTENTION ALERTS (Real MongoDB issues only)
    const attentionItems = [];
    if (criticalReports > 0) {
      attentionItems.push({
        id: "critical-reports",
        severity: "danger",
        title: `${criticalReports} Critical Priority Reports`,
        description: "Severe reports involving safety, fraud, or acute policy violations requiring urgent review.",
        actionFilter: "Open",
      });
    }

    const openFraudCount = await Report.countDocuments({
      ...statsFilter,
      $or: [{ category: "Spam / Fraud" }, { reportType: { $regex: "fraud|fake|scam", $options: "i" } }],
      status: { $in: ["Open", "Investigating"] },
    });
    if (openFraudCount > 0) {
      attentionItems.push({
        id: "fraud-complaints",
        severity: "danger",
        title: `${openFraudCount} Unresolved Fraud / Scam Complaints`,
        description: "Reports flagged for deceptive listings or impersonation on the platform.",
        actionFilter: "Open",
      });
    }

    // Targets with repeat complaints
    const multiReportTargets = await Report.aggregate([
      { $match: { ...statsFilter, status: { $in: ["Open", "Investigating"] } } },
      {
        $group: {
          _id: { $ifNull: ["$opportunityId", { $ifNull: ["$targetId", "$companyId"] }] },
          count: { $sum: 1 },
          title: { $first: { $ifNull: ["$targetTitle", "$title"] } },
        },
      },
      { $match: { count: { $gte: 2 }, _id: { $ne: null } } },
      { $limit: 3 },
    ]);

    if (multiReportTargets.length > 0) {
      multiReportTargets.forEach((mrt) => {
        attentionItems.push({
          id: `repeat-target-${mrt._id}`,
          severity: "warning",
          title: `${mrt.count} Repeated Reports Filed on Same Entity`,
          description: `Multiple candidates or users filed separate complaints regarding "${mrt.title || "Target Entity"}".`,
          actionFilter: "Open",
        });
      });
    }

    // 5. RECENT MODERATION ACTIVITY
    const recentActivity = await AuditLog.find({ module: "Reports" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        reports: enhancedReports,
        stats,
        attention: attentionItems,
        recentActivity: (recentActivity || []).map((a) => ({
          _id: a._id,
          action: a.action,
          target: a.target,
          details: a.details,
          actorName: a.actorName,
          createdAt: a.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
      reports: enhancedReports,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error("getAdminReports error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/reports/:id
 * Deep detailed report record with full related entities and repeat history
 */
exports.getAdminReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("companyId", "name logo status isVerified location industry website email phone")
      .populate("reportedBy", "fullName email role userType phone profileImage createdAt")
      .populate("opportunityId", "title companyName workMode location status deadline openings category description")
      .populate("applicationId", "opportunityTitle status createdAt studentName studentEmail resumeUrl coverNote")
      .populate("interviewId", "title roundName interviewType status date time roundNumber meetingLink")
      .populate("reportedUserId", "fullName email role userType phone profileImage createdAt")
      .populate("resolvedBy", "fullName email")
      .populate("dismissedBy", "fullName email")
      .populate("adminNotes.authorId", "fullName email");

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId._id.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: This report does not belong to your company",
        });
      }
    }

    const targetRef = report.opportunityId?._id || report.targetId || report.companyId?._id;
    let relatedReports = [];
    if (targetRef) {
      relatedReports = await Report.find({
        _id: { $ne: report._id },
        $or: [{ opportunityId: targetRef }, { targetId: targetRef }, { companyId: targetRef }],
      })
        .select("category reportType details status priority createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    return res.status(200).json({
      success: true,
      report,
      relatedReports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id/status
 * Updates status (Open -> Investigating -> Resolved/Dismissed)
 */
exports.updateAdminReportStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes, adminNote } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only update reports belonging to your company",
        });
      }
    }

    const previousStatus = report.status;
    report.status = status;

    if (resolutionNotes) {
      report.resolutionNote = resolutionNotes;
      report.resolutionNotes = resolutionNotes;
    }

    if (status === "Resolved") {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    } else if (status === "Dismissed") {
      report.dismissedBy = req.user._id;
      report.dismissedAt = new Date();
    }

    if (adminNote && adminNote.trim()) {
      report.adminNotes.push({
        note: adminNote.trim(),
        authorId: req.user._id,
        authorName: req.user.fullName || "Admin",
        createdAt: new Date(),
      });
    }

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "UPDATE_REPORT_STATUS",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Status changed from ${previousStatus} to ${status}.`,
      });
    } catch (logErr) {}

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id/priority
 * Allows Super Admin to adjust severity / priority
 */
exports.updateAdminReportPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
      return res.status(400).json({ success: false, message: "Invalid priority level" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const previousPriority = report.priority;
    report.priority = priority;
    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "UPDATE_REPORT_PRIORITY",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Priority updated from ${previousPriority} to ${priority}.`,
      });
    } catch (logErr) {}

    return res.status(200).json({
      success: true,
      message: `Priority set to ${priority}`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/notes
 * Adds an internal admin note without overwriting user complaint
 */
exports.addAdminReportNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: "Admin note content is required" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const newNote = {
      note: note.trim(),
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    };

    report.adminNotes.push(newNote);
    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "ADD_REPORT_NOTE",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Added internal administrative note.`,
      });
    } catch (logErr) {}

    return res.status(200).json({
      success: true,
      message: "Admin note added successfully",
      note: newNote,
      adminNotes: report.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/resolve
 * Resolves report with mandatory resolution note and notifies submitter
 */
exports.resolveAdminReport = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;
    if (!resolutionNote || !resolutionNote.trim()) {
      return res.status(400).json({
        success: false,
        message: "A resolution note detailing findings or corrective action is required.",
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    report.status = "Resolved";
    report.resolutionNote = resolutionNote.trim();
    report.resolutionNotes = resolutionNote.trim();
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();

    report.adminNotes.push({
      note: `Resolved: ${resolutionNote.trim()}`,
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    });

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "RESOLVE_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Report resolved: ${resolutionNote.trim()}`,
      });
    } catch (logErr) {}

    if (report.reportedBy) {
      try {
        await Notification.create({
          recipient: report.reportedBy,
          recipientId: report.reportedBy,
          senderRole: "admin",
          sender: "CareerConnect Trust & Safety",
          title: "Your Report Has Been Resolved",
          preview: `Report #${report._id.toString().slice(-6)} has been reviewed and resolved.`,
          message: `Your report regarding "${report.title || report.category || "an issue"}" has been thoroughly investigated and resolved. Action note: ${resolutionNote.trim()}. Thank you for helping keep CareerConnect safe.`,
          category: "system_alert",
          notificationType: "info",
        });
      } catch (notifErr) {}
    }

    return res.status(200).json({
      success: true,
      message: "Report marked as Resolved successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/dismiss
 * Dismisses report with mandatory reason and notifies submitter
 */
exports.dismissAdminReport = async (req, res, next) => {
  try {
    const { dismissalReason, adminNote = "" } = req.body;
    if (!dismissalReason || !dismissalReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A dismissal reason (e.g. 'No violation found', 'Duplicate report') is required.",
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    report.status = "Dismissed";
    report.dismissalReason = dismissalReason.trim();
    report.dismissedBy = req.user._id;
    report.dismissedAt = new Date();

    const noteText = `Dismissed: ${dismissalReason.trim()}${adminNote ? ` (${adminNote.trim()})` : ""}`;
    report.adminNotes.push({
      note: noteText,
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    });

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "DISMISS_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: noteText,
      });
    } catch (logErr) {}

    if (report.reportedBy) {
      try {
        await Notification.create({
          recipient: report.reportedBy,
          recipientId: report.reportedBy,
          senderRole: "admin",
          sender: "CareerConnect Trust & Safety",
          title: "Update on Your Submitted Report",
          preview: `Report #${report._id.toString().slice(-6)} has been reviewed.`,
          message: `Your report regarding "${report.title || report.category || "an issue"}" has been reviewed by moderation. It was closed with the following outcome: ${dismissalReason.trim()}.`,
          category: "system_alert",
          notificationType: "info",
        });
      } catch (notifErr) {}
    }

    return res.status(200).json({
      success: true,
      message: "Report marked as Dismissed",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports
 * Create report with rich categories and entity connections
 */
exports.createAdminReport = async (req, res, next) => {
  try {
    const {
      category = "Opportunity",
      reportType,
      title = "",
      details,
      description = "",
      priority = "Medium",
      companyId,
      opportunityId,
      opportunityModel = "Job",
      applicationId,
      interviewId,
      reportedUserId,
      targetType,
      targetId,
      targetTitle,
    } = req.body;

    const finalDetails = details || description;
    if (!finalDetails) {
      return res.status(400).json({ success: false, message: "Report details/description is required" });
    }

    const report = await Report.create({
      category: category || "Opportunity",
      reportType: reportType || category || "Opportunity",
      title: title || `${category} Report`,
      details: finalDetails,
      description: finalDetails,
      priority: priority || "Medium",
      companyId: companyId || (req.user.role === "COMPANY_ADMIN" ? req.user.companyId : null),
      opportunityId: opportunityId || null,
      opportunityModel: opportunityModel || "Job",
      applicationId: applicationId || null,
      interviewId: interviewId || null,
      reportedUserId: reportedUserId || null,
      targetType: targetType || "Opportunity",
      targetId: targetId || opportunityId || null,
      targetTitle: targetTitle || title || "",
      reportedBy: req.user._id,
      reportedByName: req.user.fullName || "User",
      status: "Open",
    });

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "User",
        actorEmail: req.user.email || "",
        action: "CREATE_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Report created for category ${category}`,
      });
    } catch (logErr) {}

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 10. SETTINGS MANAGEMENT (GLOBAL VS TENANT)
// =========================================================================

/**
 * GET /api/admin/settings
 */
exports.getAdminSettings = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);

    if (isSuperAdmin) {
      const settings = await PlatformSetting.find().lean();
      return res.status(200).json({
        success: true,
        scope: "GLOBAL",
        settings: settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
      });
    }

    // COMPANY_ADMIN: Return assigned company settings
    const company = await Company.findById(req.user.companyId).select("name settings");
    return res.status(200).json({
      success: true,
      scope: "TENANT",
      companyName: company?.name,
      settings: company?.settings || {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings
 */
exports.updateAdminSettings = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);

    if (isSuperAdmin) {
      const updates = req.body;
      for (const [key, value] of Object.entries(updates)) {
        await PlatformSetting.findOneAndUpdate(
          { key },
          { key, value, updatedBy: req.user._id },
          { upsert: true, new: true }
        );
      }
      return res.status(200).json({
        success: true,
        message: "Global platform settings updated successfully",
      });
    }

    // COMPANY_ADMIN: Updates ONLY assigned company settings
    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $set: { settings: req.body } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Company settings updated successfully",
      settings: company?.settings,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 11. SEARCH & NOTIFICATIONS
// =========================================================================

/**
 * GET /api/admin/search
 */
exports.searchAdmin = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) {
      return res.status(200).json({ success: true, results: {} });
    }

    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
    const companyScope = !isSuperAdmin ? { companyId: req.user.companyId } : {};

    const [users, jobs, companies] = await Promise.all([
      User.find({
        ...companyScope,
        $or: [
          { fullName: { $regex: q.trim(), $options: "i" } },
          { email: { $regex: q.trim(), $options: "i" } },
        ],
      }).select("fullName email userType role").limit(5).lean(),
      Job.find({
        ...companyScope,
        title: { $regex: q.trim(), $options: "i" },
      }).select("title companyName status").limit(5).lean(),
      isSuperAdmin
        ? Company.find({ name: { $regex: q.trim(), $options: "i" } }).select("name industry status").limit(5).lean()
        : [],
    ]);

    return res.status(200).json({
      success: true,
      results: {
        users,
        jobs,
        companies,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notifications
 */
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
    const filter = isSuperAdmin ? {} : { companyId: req.user.companyId };

    const [openReports, pendingOpportunities] = await Promise.all([
      Report.find({ ...filter, status: "Open" }).sort({ createdAt: -1 }).limit(5).lean(),
      Job.find({ ...filter, status: "Pending" }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const notifications = [
      ...openReports.map((r) => ({
        id: r._id,
        title: `Report: ${r.reportType}`,
        message: r.details,
        type: "warning",
        createdAt: r.createdAt,
      })),
      ...pendingOpportunities.map((j) => ({
        id: j._id,
        title: `Pending Job Approval: ${j.title}`,
        message: `Opportunity posted for ${j.companyName}`,
        type: "info",
        createdAt: j.createdAt,
      })),
    ];

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};
