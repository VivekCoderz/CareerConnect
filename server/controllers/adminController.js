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
    process.env.JWT_SECRET || "your_secret_key",
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
// 7. OPPORTUNITY MANAGEMENT (SCOPED / GLOBAL)
// =========================================================================

/**
 * GET /api/admin/opportunities
 */
exports.getAdminOpportunities = async (req, res, next) => {
  try {
    const { type = "all", status = "all", search = "", page = 1, limit = 15 } = req.query;
    const filter = {};

    // Strict Scope: Company Admins only see their own company opportunities
    if (req.user.role === "COMPANY_ADMIN") {
      filter.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { companyName: { $regex: search.trim(), $options: "i" } },
        { department: { $regex: search.trim(), $options: "i" } },
      ];
    }

    let items = [];
    let total = 0;
    const skip = (Number(page) - 1) * Number(limit);

    if (type === "job") {
      [items, total] = await Promise.all([
        Job.find(filter).populate("companyId", "name logo").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Job.countDocuments(filter),
      ]);
      items = items.map((i) => ({ ...i, opportunityType: "Job" }));
    } else if (type === "internship") {
      [items, total] = await Promise.all([
        Internship.find(filter).populate("companyId", "name logo").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Internship.countDocuments(filter),
      ]);
      items = items.map((i) => ({ ...i, opportunityType: "Internship" }));
    } else {
      // Both Jobs & Internships
      const [jobs, internships, jobsTotal, internshipsTotal] = await Promise.all([
        Job.find(filter).populate("companyId", "name logo").sort({ createdAt: -1 }).limit(Number(limit)).lean(),
        Internship.find(filter).populate("companyId", "name logo").sort({ createdAt: -1 }).limit(Number(limit)).lean(),
        Job.countDocuments(filter),
        Internship.countDocuments(filter),
      ]);

      const combined = [
        ...jobs.map((j) => ({ ...j, opportunityType: "Job" })),
        ...internships.map((i) => ({ ...i, opportunityType: "Internship" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      items = combined.slice(skip, skip + Number(limit));
      total = jobsTotal + internshipsTotal;
    }

    return res.status(200).json({
      success: true,
      opportunities: items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/status
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

    // Company Admin access control: must belong to their assigned company
    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify opportunities belonging to your company",
        });
      }
    }

    opp.status = status;
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
// 9. REPORTS MANAGEMENT (SCOPED / GLOBAL)
// =========================================================================

/**
 * GET /api/admin/reports
 */
exports.getAdminReports = async (req, res, next) => {
  try {
    const { status = "all", type = "all", page = 1, limit = 15 } = req.query;
    const filter = {};

    // Scoped to company for COMPANY_ADMIN
    if (req.user.role === "COMPANY_ADMIN") {
      filter.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (status !== "all") filter.status = status;
    if (type !== "all") filter.reportType = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("companyId", "name")
        .populate("reportedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports
 */
exports.createAdminReport = async (req, res, next) => {
  try {
    const { reportType, details, targetType, targetId, targetTitle, companyId } = req.body;
    if (!reportType || !details) {
      return res.status(400).json({ success: false, message: "Report type and details are required" });
    }

    const report = await Report.create({
      reportType,
      details,
      targetType: targetType || "Opportunity",
      targetId: targetId || null,
      targetTitle: targetTitle || "",
      companyId: companyId || (req.user.role === "COMPANY_ADMIN" ? req.user.companyId : null),
      reportedBy: req.user._id,
      reportedByName: req.user.fullName,
      status: "Open",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id/status
 */
exports.updateAdminReportStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    // Company Admin check
    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only resolve reports belonging to your company",
        });
      }
    }

    report.status = status;
    if (resolutionNotes) report.resolutionNotes = resolutionNotes;
    if (status === "Resolved" || status === "Dismissed") {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    }
    await report.save();

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
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
