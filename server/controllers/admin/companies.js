// Companies (super admin) and the company admin's own company.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const User = require("../../models/User");
const Company = require("../../models/Company");
const Job = require("../../models/Job");
const Internship = require("../../models/Internship");
const Application = require("../../models/Application");
const { clearSearchCache } = require("../../services/jobScraperService");
const { notifyListingClosedInBackground } = require("../../services/listingClosure");
const { generateAdminUsername } = require("./shared");

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

    // Deleted (soft-deleted) companies only show when asked for explicitly.
    query.status = status && status !== "all" ? status : { $ne: "deleted" };

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
      industry: String(industry || "").trim(),
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

// ---------------------------------------------------------------------------
// Company updates only change the fields sent (ADM-06): an allowlist of top-level
// fields, and settings written key by key ("settings.autoShortlist"), so saving one
// setting never wipes the others or replaces the document.
// ---------------------------------------------------------------------------
const SUPER_ADMIN_COMPANY_FIELDS = [
  "name", "description", "email", "phone", "website", "logo", "industry", "companyType",
  "location", "address", "contactPerson",
];

const COMPANY_ADMIN_COMPANY_FIELDS = ["description", "phone", "website", "industry", "location"];

const COMPANY_SETTING_TYPES = { allowedDomains: "string[]", emailNotifications: "boolean", autoShortlist: "boolean" };

const isSettingValue = (type, value) => type === "boolean"
  ? typeof value === "boolean"
  : Array.isArray(value) && value.every((item) => typeof item === "string");

/** Returns { update } with a $set of only the allowed fields sent, or { error }. */
const buildCompanyUpdate = (body = {}, fields) => {
  const $set = {};
  for (const field of fields) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string") return { error: `${field} must be text` };
    $set[field] = body[field].trim();
  }
  if ($set.name === "") return { error: "Company name is required" };

  if (body.settings !== undefined) {
    if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
      return { error: "settings must be an object" };
    }
    for (const [key, value] of Object.entries(body.settings)) {
      const type = COMPANY_SETTING_TYPES[key];
      if (!type) continue;
      if (!isSettingValue(type, value)) return { error: `settings.${key} has the wrong type` };
      $set[`settings.${key}`] = type === "string[]" ? value.map((item) => item.trim()).filter(Boolean) : value;
    }
  }
  if (Object.keys($set).length === 0) return { error: "No editable company fields were sent" };
  return { update: { $set } };
};

// Listings that stop being visible (or waiting for review) when their company is
// deactivated or deleted (ADM-11/12). Same approach as a rejected employer (S04): they are
// closed, not deleted, and reactivating the company does not reopen them.
const LIVE_LISTING_STATUSES = ["Published", "Pending Approval"];

const closeListingsOfInactiveCompany = async (companyId) => {
  const filter = { companyId, status: { $in: LIVE_LISTING_STATUSES } };
  const [publishedJobIds, publishedInternshipIds] = await Promise.all([
    Job.distinct("_id", { ...filter, status: "Published" }),
    Internship.distinct("_id", { ...filter, status: "Published" }),
  ]);
  const update = { $set: { status: "Closed", closedReason: "company_inactive", closedAt: new Date() } };
  const [jobs, internships] = await Promise.all([Job.updateMany(filter, update), Internship.updateMany(filter, update)]);
  clearSearchCache();
  publishedJobIds.forEach((id) => notifyListingClosedInBackground("job", id));
  publishedInternshipIds.forEach((id) => notifyListingClosedInBackground("internship", id));
  return { jobs: jobs.modifiedCount, internships: internships.modifiedCount };
};

/**
 * GET /api/admin/companies/:id
 */
exports.getAdminCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, status: { $ne: "deleted" } });
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
    // Status has its own endpoint (it closes listings); it is not editable here.
    const { update, error } = buildCompanyUpdate(req.body, SUPER_ADMIN_COMPANY_FIELDS);
    if (error) return res.status(400).json({ success: false, message: error });

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "deleted" } },
      update,
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

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "deleted" } },
      { $set: { status } },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    const closedListings = status === "inactive" ? await closeListingsOfInactiveCompany(company._id) : null;
    return res.status(200).json({
      success: true,
      message: `Company status updated to ${status}`,
      company,
      ...(closedListings ? { closedListings } : {}),
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
    // Soft delete (ADM-12): the company, its users' link to it, its listings and their
    // applications are kept; the company is hidden, its listings are closed and its users
    // are deactivated, so nothing of it stays public or usable.
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "deleted" } },
      { $set: { status: "deleted", deletedAt: new Date() } },
      { new: true }
    );
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await User.updateMany({ companyId: company._id }, { $set: { isActive: false } });
    const closedListings = await closeListingsOfInactiveCompany(company._id);

    return res.status(200).json({
      success: true,
      message: "Company removed. Its data is kept but hidden.",
      closedListings,
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

    // Allowlisted fields only; settings are written key by key (ADM-06).
    const { update, error } = buildCompanyUpdate(req.body, COMPANY_ADMIN_COMPANY_FIELDS);
    if (error) return res.status(400).json({ success: false, message: error });

    const company = await Company.findByIdAndUpdate(companyId, update, { new: true, runValidators: true });

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
