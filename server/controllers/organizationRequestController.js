const OrganizationRequest = require("../models/OrganizationRequest");
const Company = require("../models/Company");
const AuditLog = require("../models/AuditLog");

/**
 * Normalizes website URL (strips protocol, www, trailing slashes) for robust comparison
 */
function normalizeUrl(url) {
  if (!url) return "";
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/**
 * POST /api/organizations/request-access
 * Public Organization Access Request with Duplicate Protection
 */
exports.requestOrganizationAccess = async (req, res, next) => {
  try {
    const {
      organizationName,
      organizationType,
      officialEmail,
      website,
      contactPerson,
      designation,
      phone,
      address,
      city,
      state,
      country,
      reason,
      description,
    } = req.body;

    // 1. Mandatory Field Validation
    if (
      !organizationName ||
      !officialEmail ||
      !website ||
      !contactPerson ||
      !designation ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required organization and contact fields.",
      });
    }

    const trimmedOrgName = organizationName.trim();
    const cleanEmail = officialEmail.trim().toLowerCase();
    const cleanWebsite = website.trim();
    const normalizedWeb = normalizeUrl(cleanWebsite);

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid official work email address.",
      });
    }

    // 2. Duplicate Protection Check against existing approved Companies
    const existingCompany = await Company.findOne({
      $or: [
        { name: { $regex: `^${trimmedOrgName}$`, $options: "i" } },
        { email: cleanEmail },
      ],
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        code: "ORGANIZATION_ALREADY_REGISTERED",
        message: "An organization with this official name or email is already registered on CareerConnect.",
      });
    }

    // Check company website duplicates
    if (normalizedWeb) {
      const allCompanies = await Company.find({}, "website").lean();
      const duplicateWebCompany = allCompanies.find(
        (c) => normalizeUrl(c.website) === normalizedWeb
      );
      if (duplicateWebCompany) {
        return res.status(409).json({
          success: false,
          code: "WEBSITE_ALREADY_REGISTERED",
          message: "The website provided already belongs to an existing registered organization.",
        });
      }
    }

    // 3. Duplicate Protection Check against Pending / Under Review Requests
    const existingPendingRequest = await OrganizationRequest.findOne({
      status: { $in: ["PENDING", "UNDER_REVIEW"] },
      $or: [
        { officialEmail: cleanEmail },
        { organizationName: { $regex: `^${trimmedOrgName}$`, $options: "i" } },
      ],
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        success: false,
        code: "PENDING_REQUEST_EXISTS",
        message: "This organization already has a pending onboarding request under review.",
      });
    }

    // Check pending request website duplicate
    if (normalizedWeb) {
      const pendingRequests = await OrganizationRequest.find(
        { status: { $in: ["PENDING", "UNDER_REVIEW"] } },
        "website"
      ).lean();
      const duplicatePendingWeb = pendingRequests.find(
        (r) => normalizeUrl(r.website) === normalizedWeb
      );
      if (duplicatePendingWeb) {
        return res.status(409).json({
          success: false,
          code: "PENDING_REQUEST_EXISTS",
          message: "An organization request with this website is already pending review.",
        });
      }
    }

    // 4. Create OrganizationRequest document
    const newRequest = await OrganizationRequest.create({
      organizationName: trimmedOrgName,
      organizationType: organizationType || "Private",
      officialEmail: cleanEmail,
      website: cleanWebsite,
      contactPerson: contactPerson.trim(),
      designation: designation.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: (country || "India").trim(),
      reason: reason.trim(),
      description: (description || "").trim(),
      status: "PENDING",
    });

    // 5. Audit Log Entry
    try {
      await AuditLog.create({
        action: "ORGANIZATION_ACCESS_REQUESTED",
        module: "Settings",
        target: trimmedOrgName,
        details: `Access request submitted by ${contactPerson} (${cleanEmail})`,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      });
    } catch (auditErr) {
      console.warn("Audit log creation warning:", auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Your organization access request has been submitted successfully. Our platform team will review your details.",
      request: {
        _id: newRequest._id,
        id: newRequest._id,
        organizationName: newRequest.organizationName,
        officialEmail: newRequest.officialEmail,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
