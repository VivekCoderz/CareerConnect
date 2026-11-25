// Organization access requests: list, detail, review, approve and reject.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const crypto = require("crypto");
const User = require("../../models/User");
const Company = require("../../models/Company");
const EmployerProfile = require("../../models/EmployerProfile");
const AuditLog = require("../../models/AuditLog");
const OrganizationRequest = require("../../models/OrganizationRequest");
const { escapeRegex } = require("../../utils/listingSecurity");
const { generateAdminUsername } = require("./shared");

/**
 * GET /api/admin/organization-requests
 * Super Admin views pending and past organization onboarding requests
 */
exports.getOrganizationRequests = async (req, res, next) => {
  try {
    const { search = "", status = "all", page = 1, limit = 15 } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status.toUpperCase();
    }

    if (search.trim()) {
      const q = search.trim();
      query.$or = [
        { organizationName: { $regex: q, $options: "i" } },
        { officialEmail: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));

    const [total, requests] = await Promise.all([
      OrganizationRequest.countDocuments(query),
      OrganizationRequest.find(query)
        .populate("reviewedBy", "fullName email")
        .populate("approvedBy", "fullName email")
        .populate("rejectedBy", "fullName email")
        .populate("companyId", "name status")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      requests,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/organization-requests/:id
 * Detailed view of an organization onboarding request
 */
exports.getOrganizationRequestById = async (req, res, next) => {
  try {
    const request = await OrganizationRequest.findById(req.params.id)
      .populate("reviewedBy", "fullName email")
      .populate("approvedBy", "fullName email")
      .populate("rejectedBy", "fullName email")
      .populate("companyId", "name status");

    if (!request) {
      return res.status(404).json({ success: false, message: "Organization request not found" });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/organization-requests/:id/review
 * Marks an organization request as UNDER_REVIEW
 */
exports.reviewOrganizationRequest = async (req, res, next) => {
  try {
    const request = await OrganizationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Organization request not found" });
    }

    if (request.status === "APPROVED" || request.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: `Cannot review request that is already ${request.status}`,
      });
    }

    request.status = "UNDER_REVIEW";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Organization request marked as UNDER_REVIEW",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/organization-requests/:id/approve
 * Approves request -> Creates Company -> Invites Company Admin -> Company becomes ACTIVE
 */
exports.approveOrganizationRequest = async (req, res, next) => {
  try {
    const request = await OrganizationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Organization request not found" });
    }

    if (request.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "This organization request has already been approved.",
      });
    }

    if (request.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "This organization request was rejected. The organization must submit a new request.",
      });
    }

    // Approval creates a brand-new Company Admin account. It must never change an
    // existing account (a student, employer or another admin), so check before
    // creating or linking anything.
    const adminEmail = request.officialEmail.trim().toLowerCase();
    const existingAccount = await User.findOne({ email: adminEmail }).select("_id").lean();
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message:
          "An account already uses this official email, so the request was not approved. Ask the organization to use an official email that is not registered on E2Job.",
      });
    }

    // 1. Create or Find Company (exact, case-insensitive name match)
    let company = await Company.findOne({
      name: { $regex: `^${escapeRegex(request.organizationName.trim())}$`, $options: "i" },
    });

    const fullLocation = [request.city, request.state, request.country].filter(Boolean).join(", ");

    if (!company) {
      company = await Company.create({
        name: request.organizationName.trim(),
        description: request.description || request.reason || `Official profile for ${request.organizationName}`,
        email: request.officialEmail.trim().toLowerCase(),
        phone: request.phone ? request.phone.trim() : "",
        website: request.website ? request.website.trim() : "",
        companyType: request.organizationType || "Private",
        industry: request.industry || "",
        location: fullLocation,
        address: request.address ? request.address.trim() : "",
        contactPerson: request.requestingEmployeeName || request.contactPerson.trim(),
        status: "active",
        settings: { emailNotifications: true, autoShortlist: false },
      });
    } else {
      company.status = "active";
      if (!company.email) company.email = request.officialEmail.trim().toLowerCase();
      if (!company.website && request.website) company.website = request.website.trim();
      if (!company.industry && request.industry) company.industry = request.industry;
      await company.save();
    }

    // Link requesting employee to this company if request originated from logged-in employee
    if (request.requestedBy) {
      await User.findByIdAndUpdate(request.requestedBy, { companyId: company._id });
      await EmployerProfile.findOneAndUpdate(
        { userId: request.requestedBy },
        { companyId: company._id }
      );
    }

    // 2. Create the Company Admin Account / Invitation
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let candidatePhone = (request.phone || "").trim();
    if (candidatePhone) {
      const existingPhone = await User.findOne({ phone: candidatePhone });
      if (existingPhone) candidatePhone = "";
    }

    const username = await generateAdminUsername(adminEmail, "admin");
    const admin = await User.create({
      fullName: request.contactPerson.trim(),
      email: adminEmail,
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

    // 3. Update OrganizationRequest Document
    request.status = "APPROVED";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    request.companyId = company._id;
    request.adminInvitationToken = token;
    request.adminInvitationExpires = expiry;
    await request.save();

    // 4. Audit Log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.fullName,
      companyId: company._id,
      action: "ORGANIZATION_REQUEST_APPROVED",
      module: "Settings",
      target: company.name,
      details: `Super Admin approved organization request. Created Company ${company.name} and invited ${request.contactPerson} (${adminEmail}) as Company Admin.`,
      ipAddress: req.ip || "127.0.0.1",
    });

    const activationLink = `/admin/activate?token=${token}`;

    return res.status(200).json({
      success: true,
      message: `Organization request approved successfully. Company is now ACTIVE and admin invitation is ready.`,
      company: {
        _id: company._id,
        name: company.name,
        status: company.status,
        officialEmail: company.email,
        website: company.website,
      },
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
      activationLink,
      invitationToken: token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/organization-requests/:id/reject
 * Rejects request with required rejection reason (never deletes document)
 */
exports.rejectOrganizationRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is strictly required.",
      });
    }

    const request = await OrganizationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Organization request not found" });
    }

    if (request.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an organization request that has already been approved.",
      });
    }

    request.status = "REJECTED";
    request.rejectedBy = req.user._id;
    request.rejectedAt = new Date();
    request.rejectionReason = rejectionReason.trim();
    await request.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.fullName,
      action: "ORGANIZATION_REQUEST_REJECTED",
      module: "Settings",
      target: request.organizationName,
      details: `Super Admin rejected organization request for ${request.organizationName}. Reason: ${rejectionReason.trim()}`,
      ipAddress: req.ip || "127.0.0.1",
    });

    return res.status(200).json({
      success: true,
      message: "Organization request has been rejected.",
      request: {
        _id: request._id,
        organizationName: request.organizationName,
        status: request.status,
        rejectedAt: request.rejectedAt,
        rejectionReason: request.rejectionReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
