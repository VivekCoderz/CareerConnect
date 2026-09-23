const { publicErrorMessage } = require("../utils/publicError");
const { sanitizeProfileUpdate } = require("../utils/profileUpdate");

const sanitizeEmployerUpdate = (body) => {
  const data = sanitizeProfileUpdate(body);
  delete data.__v;
  delete data.isPublished;
  return data;
};
// server/controllers/employerController.js
const EmployerProfile = require("../models/EmployerProfile");
const User = require("../models/User");
const Company = require("../models/Company");
const OrganizationRequest = require("../models/OrganizationRequest");
const AuditLog = require("../models/AuditLog");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const Employee = require("../models/Employee");
const TeamMember = require("../models/TeamMember");
const Course = require("../models/Course");
const { getEmployerDashboardData } = require("../services/employerDashboardService");

/**
 * Dynamic calculation of Employer Profile Completion (0 - 100%)
 * Section Weightings:
 * - Basic Company Info: 15%
 * - About Company: 20%
 * - Company Details: 15%
 * - Team & Culture: 20%
 * - Hiring Preferences: 20%
 * - Social / Web: 5%
 * - Logo: 5%
 */
const calculateEmployerCompletion = (profile, user) => {
  let score = 0;

  // 1. Basic Company Information (15%)
  let basicScore = 0;
  const companyName = profile?.companyName || user?.fullName;
  const email = profile?.officialEmail || user?.email;
  const phone = profile?.mobile || user?.phone;
  if (companyName) basicScore += 4;
  if (email) basicScore += 3;
  if (phone) basicScore += 3;
  if (profile?.industry) basicScore += 3;
  if (profile?.companyType) basicScore += 2;
  score += Math.min(15, basicScore);

  // 2. About Company (20%)
  let aboutScore = 0;
  if (profile?.description && profile.description.trim().length >= 20) aboutScore += 8;
  if (profile?.mission || profile?.vision) aboutScore += 4;
  if (profile?.coreValues && profile.coreValues.length > 0) aboutScore += 3;
  if (profile?.whyWorkWithUs) aboutScore += 3;
  if (profile?.companyHighlights && profile.companyHighlights.length > 0) aboutScore += 2;
  score += Math.min(20, aboutScore);

  // 3. Company Details (15%)
  let detailsScore = 0;
  if (profile?.companySize) detailsScore += 4;
  if (profile?.headquarters?.city && profile?.headquarters?.country) detailsScore += 6;
  if (profile?.departments && profile.departments.length > 0) detailsScore += 3;
  if (profile?.offices && profile.offices.length > 0) detailsScore += 2;
  score += Math.min(15, detailsScore);

  // 4. Team & Culture (20%)
  let cultureScore = 0;
  if (profile?.culture?.workEnvironment) cultureScore += 4;
  if (profile?.culture?.description) cultureScore += 4;
  if (profile?.benefits && profile.benefits.length > 0) cultureScore += 4;
  if (profile?.perks && profile.perks.length > 0) cultureScore += 3;
  if (profile?.leadership && profile.leadership.length > 0) cultureScore += 3;
  if (profile?.gallery && profile.gallery.length > 0) cultureScore += 2;
  score += Math.min(20, cultureScore);

  // 5. Hiring Preferences (20%)
  let hiringScore = 0;
  if (profile?.hiringPreferences?.candidateTypes && profile.hiringPreferences.candidateTypes.length > 0) hiringScore += 4;
  if (profile?.hiringPreferences?.skills && profile.hiringPreferences.skills.length > 0) hiringScore += 5;
  if (profile?.hiringPreferences?.qualifications && profile.hiringPreferences.qualifications.length > 0) hiringScore += 4;
  if (profile?.hiringPreferences?.jobTypes && profile.hiringPreferences.jobTypes.length > 0) hiringScore += 3;
  if (profile?.hiringPreferences?.workModes && profile.hiringPreferences.workModes.length > 0) hiringScore += 2;
  if (profile?.recruiter?.name || profile?.recruiter?.email) hiringScore += 2;
  score += Math.min(20, hiringScore);

  // 6. Social / Brand Links (5%)
  let socialScore = 0;
  if (profile?.website) socialScore += 2;
  if (profile?.socialLinks?.linkedin) socialScore += 2;
  if (profile?.socialLinks?.twitter || profile?.socialLinks?.facebook || profile?.socialLinks?.instagram) socialScore += 1;
  score += Math.min(5, socialScore);

  // 7. Logo (5%)
  if (profile?.logo || user?.profileImage) score += 5;

  return Math.min(100, Math.max(0, score));
};

/**
 * GET /api/employer/profile
 * Fetch logged-in employer's profile
 */
exports.getEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let profile = await EmployerProfile.findOne({ userId });

    if (!profile) {
      // Auto-create initial profile shell with data from User account
      profile = await EmployerProfile.create({
        userId,
        companyName: req.user.fullName || "My Company",
        officialEmail: req.user.email || "",
        mobile: req.user.phone || "",
        logo: req.user.profileImage || "",
        industry: "Information Technology",
        companyType: "Private",
        currentStep: 1,
        profileCompletion: 20,
      });
    }

    const completion = calculateEmployerCompletion(profile, req.user);
    if (profile.profileCompletion !== completion) {
      profile.profileCompletion = completion;
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      profile,
      user: {
        _id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        userType: req.user.userType,
        profileImage: req.user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST or PUT /api/employer/profile
 * Upsert / Full update of employer profile
 */
exports.updateEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = sanitizeEmployerUpdate(req.body);

    let profile = await EmployerProfile.findOne({ userId });

    if (!profile) {
      profile = new EmployerProfile({
        userId,
        ...updateData,
      });
    } else {
      Object.keys(updateData).forEach((key) => {
        profile[key] = updateData[key];
      });
    }

    // Dynamic completion score
    const completion = calculateEmployerCompletion(profile, req.user);
    profile.profileCompletion = completion;

    await profile.save();

    // Sync completion score with User model
    await User.findByIdAndUpdate(userId, {
      profileCompletion: completion,
      isProfileComplete: profile.isPublished || completion >= 80,
      ...(updateData.logo ? { profileImage: updateData.logo } : {}),
      ...(updateData.companyName ? { fullName: updateData.companyName } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      profile,
      profileCompletion: completion,
    });
  } catch (error) {
    console.error("updateEmployerProfile Error:", error);
    return res.status(500).json({
      success: false,
      message: publicErrorMessage(error, "Failed to update employer profile"),
    });
  }
};

/**
 * POST /api/employer/profile/draft
 * Save profile draft with partial data (does not fail on missing required fields)
 */
exports.saveDraftEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const draftData = sanitizeEmployerUpdate(req.body);

    let profile = await EmployerProfile.findOne({ userId });

    if (!profile) {
      profile = new EmployerProfile({
        userId,
        companyName: draftData.companyName || req.user.fullName || "My Company",
        officialEmail: draftData.officialEmail || req.user.email || "",
        mobile: draftData.mobile || req.user.phone || "",
        ...draftData,
      });
    } else {
      Object.keys(draftData).forEach((key) => {
        profile[key] = draftData[key];
      });
    }

    const completion = calculateEmployerCompletion(profile, req.user);
    profile.profileCompletion = completion;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      profile,
      profileCompletion: completion,
    });
  } catch (error) {
    console.error("saveDraftEmployerProfile Error:", error);
    return res.status(500).json({
      success: false,
      message: publicErrorMessage(error, "Failed to save draft"),
    });
  }
};

/**
 * POST /api/employer/profile/publish
 * Validate essential profile fields, calculate score, mark as published
 */
exports.publishEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await EmployerProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employer profile not found",
      });
    }

    // Required fields check for publishing
    const missing = [];
    if (!profile.companyName?.trim()) missing.push("Company Name");
    if (!profile.officialEmail?.trim()) missing.push("Official Email");
    if (!profile.mobile?.trim()) missing.push("Mobile Number");
    if (!profile.industry?.trim()) missing.push("Industry");
    if (!profile.description?.trim()) missing.push("Company Description");
    if (!profile.headquarters?.city?.trim()) missing.push("Headquarters City");
    if (!profile.companySize) missing.push("Company Size");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete the following required fields before publishing: ${missing.join(", ")}`,
        missingFields: missing,
      });
    }

    const completion = calculateEmployerCompletion(profile, req.user);
    profile.profileCompletion = completion;
    profile.isPublished = true;
    await profile.save();

    await User.findByIdAndUpdate(userId, {
      isProfileComplete: true,
      profileCompletion: completion,
    });

    return res.status(200).json({
      success: true,
      message: "Company profile published successfully!",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employer/profile/unpublish
 */
exports.unpublishEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await EmployerProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employer profile not found",
      });
    }

    profile.isPublished = false;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Company profile unpublished (saved as draft)",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employer/dashboard
 * Server-authoritative aggregated employer dashboard
 * Strictly scoped by authenticated user's companyId
 */
exports.getEmployerDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Security: Check for spoofed companyId
    const requestedCompanyId = req.query.companyId || req.body?.companyId;
    if (requestedCompanyId && req.user.companyId && requestedCompanyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_COMPANY_ACCESS",
        message: "Access denied: You cannot access data belonging to another company",
      });
    }

    // Resolve effective companyId
    let effectiveCompanyId = req.user.companyId || null;

    let profile = await EmployerProfile.findOne({ userId });
    if (!profile) {
      profile = await EmployerProfile.create({
        userId,
        companyName: req.user.fullName || "My Company",
        officialEmail: req.user.email || "",
        mobile: req.user.phone || "",
        industry: "Information Technology",
        companyType: "Private",
        profileCompletion: 20,
      });
    }

    if (!effectiveCompanyId) {
      // Check if Company exists matching profile or user
      const matchedCompany = await Company.findOne({
        $or: [
          { email: profile.officialEmail || req.user.email },
          { name: profile.companyName },
        ],
      });
      if (matchedCompany) {
        effectiveCompanyId = matchedCompany._id;
        req.user.companyId = matchedCompany._id;
        await User.findByIdAndUpdate(userId, { companyId: matchedCompany._id });
      }
    }

    const completion = calculateEmployerCompletion(profile, req.user);

    const ownerConditions = {
      $or: [{ createdBy: userId }, { employerId: profile._id }],
    };

    const [
      jobs,
      internships,
      employeesCount,
      coursesCount,
    ] = await Promise.all([
      Job.find(ownerConditions).sort({ createdAt: -1 }).lean(),
      Internship.find(ownerConditions).sort({ createdAt: -1 }).lean(),
      Employee.countDocuments({ employerId: profile._id }),
      Course.countDocuments({ createdBy: userId }),
    ]);

    const activeJobs = jobs.filter((j) => j.status === "Published");
    const activeInternships = internships.filter((i) => i.status === "Published");

    const jobIds = jobs.map((j) => j._id);
    const internshipIds = internships.map((i) => i._id);

    const appOrConditions = [];
    if (jobIds.length > 0) appOrConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) appOrConditions.push({ internshipId: { $in: internshipIds } });

    let applications = [];
    let interviewsCount = 0;
    let totalApplicationsCount = 0;
    let shortlistedCount = 0;

    if (appOrConditions.length > 0) {
      const interviewConditions = [
        { employerId: userId },
        ...(jobIds.length > 0 ? [{ jobId: { $in: jobIds } }] : []),
      ];

      const [apps, inters, totalApps, shortApps] = await Promise.all([
        Application.find({ $or: appOrConditions })
          .populate("candidateId", "fullName email phone profileImage userType")
          .populate("jobId", "title employmentType")
          .populate("internshipId", "title")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        Interview.countDocuments({ $or: interviewConditions }),
        Application.countDocuments({ $or: appOrConditions }),
        Application.countDocuments({ $or: appOrConditions, status: "Shortlisted" }),
      ]);
      applications = apps;
      interviewsCount = inters;
      totalApplicationsCount = totalApps;
      shortlistedCount = shortApps;
    }

    const stats = {
      activeJobs: activeJobs.length,
      internships: activeInternships.length,
      totalOpportunities: activeJobs.length + activeInternships.length,
      applications: totalApplicationsCount,
      shortlisted: shortlistedCount,
      interviews: interviewsCount,
      employees: employeesCount,
      coursesCount,
      profileViews: profile?.profileViews || 0,
    };

    const recentApplications = applications.map((app) => ({
      id: app._id,
      candidateName: app.candidateId?.fullName || app.studentName || "Applicant",
      roleApplied: app.jobId?.title || app.internshipId?.title || app.opportunityTitle || "Position",
      type: app.opportunityType || (app.internshipId ? "Internship" : "Full-time"),
      status: app.status || "Reviewing",
      appliedDate: app.createdAt ? new Date(app.createdAt).toISOString().split("T")[0] : "Recent",
      matchScore: app.matchScore || 85,
      cgpa: app.cgpa || "8.5",
      degree: app.degree || "Geeta University Student",
    }));

    const activeListings = [
      ...activeJobs.slice(0, 3).map((j) => ({
        id: j._id,
        title: j.title,
        type: j.employmentType || "Full-time",
        location: j.location || profile?.headquarters?.city || "On-site",
        applicantsCount: j.applicantsCount || 0,
        postedDate: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "Recent",
        status: j.status,
      })),
      ...activeInternships.slice(0, 3).map((i) => ({
        id: i._id,
        title: i.title,
        type: "Internship",
        location: i.location || "Remote",
        applicantsCount: i.applicantsCount || 0,
        postedDate: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "Recent",
        status: i.status,
      })),
    ].slice(0, 6);
    const data = await getEmployerDashboardData(effectiveCompanyId, req.user);

    return res.status(200).json({
      success: true,
      ...data,
      profile,
      profileCompletion: completion,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/companies/:companyId
 * Public company profile for candidates & students
 */
exports.getPublicCompanyProfile = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    let profile = null;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(companyId);

    if (isObjectId) {
      profile = await EmployerProfile.findOne({
        $or: [{ _id: companyId }, { userId: companyId }],
      }).populate("userId", "fullName email profileImage");
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    // Public sanitized profile (no sensitive auth or password info)
    const publicProfile = {
      _id: profile._id,
      companyName: profile.companyName,
      officialEmail: profile.officialEmail,
      logo: profile.logo || profile.userId?.profileImage || "",
      industry: profile.industry,
      companyType: profile.companyType,
      foundedYear: profile.foundedYear,
      website: profile.website,
      tagline: profile.tagline,
      description: profile.description,
      mission: profile.mission,
      vision: profile.vision,
      coreValues: profile.coreValues,
      companyStory: profile.companyStory,
      whyWorkWithUs: profile.whyWorkWithUs,
      companyHighlights: profile.companyHighlights,
      companySize: profile.companySize,
      headquarters: profile.headquarters,
      offices: profile.offices,
      departments: profile.departments,
      socialLinks: profile.socialLinks,
      culture: profile.culture,
      benefits: profile.benefits,
      perks: profile.perks,
      leadership: profile.leadership,
      gallery: profile.gallery,
      hiringPreferences: {
        candidateTypes: profile.hiringPreferences?.candidateTypes || [],
        skills: profile.hiringPreferences?.skills || [],
        qualifications: profile.hiringPreferences?.qualifications || [],
        jobTypes: profile.hiringPreferences?.jobTypes || [],
        workModes: profile.hiringPreferences?.workModes || [],
        locations: profile.hiringPreferences?.locations || [],
      },
      isPublished: profile.isPublished,
      createdAt: profile.createdAt,
    };

    return res.status(200).json({
      success: true,
      company: publicProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/employer/profile
 */
exports.deleteEmployerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await EmployerProfile.findOneAndDelete({ userId });

    return res.status(200).json({
      success: true,
      message: "Employer profile deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employer/organization-status
 * Fetch current organization verification / Super Admin approval status for this employer
 */
exports.getOrganizationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("companyId");
    let company = user?.companyId || null;

    // 1. If user is already linked to a company in the database
    if (company) {
      return res.status(200).json({
        success: true,
        status: company.status === "active" ? "APPROVED" : (company.status?.toUpperCase() || "PENDING"),
        hasCompany: true,
        company: {
          _id: company._id,
          name: company.name,
          status: company.status,
          officialEmail: company.officialEmail || company.email,
          website: company.website,
          industry: company.industry,
          location: company.location || company.address,
          description: company.description,
        },
        organizationRequest: null,
      });
    }

    // 2. Check if an OrganizationRequest exists for this user
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const searchEmails = [req.user.email, profile?.officialEmail].filter(Boolean);
    const searchName = profile?.companyName;

    const queryConditions = [
      { requestedBy: req.user._id },
      { officialEmail: { $in: searchEmails } },
      { officialEmployeeEmail: { $in: searchEmails } },
    ];
    if (searchName && searchName !== "My Company") {
      queryConditions.push({ organizationName: { $regex: `^${searchName.trim()}$`, $options: "i" } });
    }

    const orgRequest = await OrganizationRequest.findOne({ $or: queryConditions }).sort({ createdAt: -1 });

    const prefillData = {
      companyName: profile?.companyName || user?.companyName || "",
      officialCompanyEmail: profile?.officialEmail || "",
      companyWebsite: profile?.website || "",
      industry: profile?.industry || "Information Technology",
      companySize: profile?.companySize || profile?.employeesCount || "11-50",
      requestingEmployeeName: req.user.fullName || profile?.contactPerson || "",
      employeeDesignation: req.user.designation || profile?.designation || "Talent Acquisition / HR",
      officialEmployeeEmail: req.user.email || "",
      verificationDocument: profile?.verificationDocument || "",
    };

    if (orgRequest) {
      return res.status(200).json({
        success: true,
        status: orgRequest.status, // "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"
        hasCompany: false,
        company: null,
        prefill: prefillData,
        organizationRequest: {
          _id: orgRequest._id,
          companyName: orgRequest.organizationName,
          organizationName: orgRequest.organizationName,
          officialCompanyEmail: orgRequest.officialEmail,
          officialEmail: orgRequest.officialEmail,
          companyWebsite: orgRequest.website,
          website: orgRequest.website,
          industry: orgRequest.industry || "Information Technology",
          companySize: orgRequest.companySize || "11-50",
          verificationDocument: orgRequest.verificationDocument || "",
          requestingEmployeeName: orgRequest.requestingEmployeeName || orgRequest.contactPerson,
          contactPerson: orgRequest.requestingEmployeeName || orgRequest.contactPerson,
          employeeDesignation: orgRequest.employeeDesignation || orgRequest.designation,
          designation: orgRequest.employeeDesignation || orgRequest.designation,
          officialEmployeeEmail: orgRequest.officialEmployeeEmail || req.user.email,
          status: orgRequest.status,
          rejectionReason: orgRequest.rejectionReason,
          createdAt: orgRequest.createdAt,
        },
      });
    }

    // 3. Not requested yet
    return res.status(200).json({
      success: true,
      status: "NOT_REQUESTED",
      hasCompany: false,
      company: null,
      prefill: prefillData,
      organizationRequest: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employer/request-company-approval
 * Submits minimal 9-field company connection request to Super Admin for verification & approval
 */
exports.requestCompanyApproval = async (req, res, next) => {
  try {
    const {
      companyName,
      organizationName,
      officialCompanyEmail,
      officialEmail,
      companyWebsite,
      website,
      industry,
      companySize,
      verificationDocument,
      requestingEmployeeName,
      contactPerson,
      employeeDesignation,
      designation,
      officialEmployeeEmail,
    } = req.body;

    const trimmedCompanyName = (companyName || organizationName || "").trim();
    const cleanCompanyEmail = (officialCompanyEmail || officialEmail || "").trim().toLowerCase();
    const cleanWebsite = (companyWebsite || website || "").trim();
    const cleanIndustry = (industry || "Information Technology").trim();
    const cleanCompanySize = (companySize || "11-50").trim();
    const cleanVerificationDoc = (verificationDocument || "").trim();
    const cleanEmployeeName = (requestingEmployeeName || contactPerson || req.user.fullName || "").trim();
    const cleanDesignation = (employeeDesignation || designation || req.user.designation || "").trim();
    const cleanEmployeeEmail = (officialEmployeeEmail || req.user.email || "").trim().toLowerCase();

    // 1. Mandatory Field Validations
    if (!trimmedCompanyName) {
      return res.status(400).json({ success: false, message: "Company name is required." });
    }
    if (!cleanCompanyEmail) {
      return res.status(400).json({ success: false, message: "Official company email is required." });
    }
    if (!cleanWebsite) {
      return res.status(400).json({ success: false, message: "Company website is required." });
    }
    if (!cleanIndustry) {
      return res.status(400).json({ success: false, message: "Industry is required." });
    }
    if (!cleanCompanySize) {
      return res.status(400).json({ success: false, message: "Company size is required." });
    }
    if (!cleanVerificationDoc) {
      return res.status(400).json({
        success: false,
        message: "Company registration or verification document is required.",
      });
    }
    if (!cleanEmployeeName) {
      return res.status(400).json({ success: false, message: "Requesting employee name is required." });
    }
    if (!cleanDesignation) {
      return res.status(400).json({ success: false, message: "Employee designation is required." });
    }
    if (!cleanEmployeeEmail) {
      return res.status(400).json({ success: false, message: "Official employee email is required." });
    }

    // Email format checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanCompanyEmail)) {
      return res.status(400).json({ success: false, message: "Invalid official company email address." });
    }
    if (!emailRegex.test(cleanEmployeeEmail)) {
      return res.status(400).json({ success: false, message: "Invalid official employee email address." });
    }

    // 2. Check if Company is already registered and active
    const existingActiveCompany = await Company.findOne({
      $or: [
        { email: cleanCompanyEmail },
        { name: { $regex: `^${trimmedCompanyName}$`, $options: "i" } },
      ],
      status: "active",
    });

    if (existingActiveCompany) {
      req.user.companyId = existingActiveCompany._id;
      await req.user.save();
      return res.status(200).json({
        success: true,
        status: "APPROVED",
        message: `Your company "${existingActiveCompany.name}" is already verified on CareerConnect! Your account is connected.`,
        company: existingActiveCompany,
      });
    }

    // 3. Prevent duplicate connection requests (same company or email pending/under review)
    const existingPending = await OrganizationRequest.findOne({
      $or: [
        { officialEmail: cleanCompanyEmail },
        { organizationName: { $regex: `^${trimmedCompanyName}$`, $options: "i" } },
        { requestedBy: req.user._id },
      ],
      status: { $in: ["PENDING", "UNDER_REVIEW"] },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "A connection request for this company is already pending review by the Super Admin.",
        organizationRequest: existingPending,
      });
    }

    // 4. Create or update OrganizationRequest document
    // If a rejected request existed for this user/company, re-submit back to PENDING
    let connectionRequest = await OrganizationRequest.findOne({
      $or: [
        { officialEmail: cleanCompanyEmail },
        { organizationName: { $regex: `^${trimmedCompanyName}$`, $options: "i" } },
        { requestedBy: req.user._id },
      ],
      status: "REJECTED",
    });

    if (connectionRequest) {
      connectionRequest.organizationName = trimmedCompanyName;
      connectionRequest.officialEmail = cleanCompanyEmail;
      connectionRequest.website = cleanWebsite;
      connectionRequest.industry = cleanIndustry;
      connectionRequest.companySize = cleanCompanySize;
      connectionRequest.verificationDocument = cleanVerificationDoc;
      connectionRequest.requestingEmployeeName = cleanEmployeeName;
      connectionRequest.contactPerson = cleanEmployeeName;
      connectionRequest.employeeDesignation = cleanDesignation;
      connectionRequest.designation = cleanDesignation;
      connectionRequest.officialEmployeeEmail = cleanEmployeeEmail;
      connectionRequest.requestedBy = req.user._id;
      connectionRequest.status = "PENDING";
      connectionRequest.rejectionReason = "";
      await connectionRequest.save();
    } else {
      connectionRequest = await OrganizationRequest.create({
        organizationName: trimmedCompanyName,
        officialEmail: cleanCompanyEmail,
        website: cleanWebsite,
        industry: cleanIndustry,
        companySize: cleanCompanySize,
        verificationDocument: cleanVerificationDoc,
        requestingEmployeeName: cleanEmployeeName,
        contactPerson: cleanEmployeeName,
        employeeDesignation: cleanDesignation,
        designation: cleanDesignation,
        officialEmployeeEmail: cleanEmployeeEmail,
        requestedBy: req.user._id,
        status: "PENDING",
      });
    }

    // 5. Update EmployerProfile with latest company information
    await EmployerProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        companyName: trimmedCompanyName,
        officialEmail: cleanCompanyEmail,
        website: cleanWebsite,
        industry: cleanIndustry,
        companySize: cleanCompanySize,
        contactPerson: cleanEmployeeName,
        designation: cleanDesignation,
      },
      { upsert: true }
    );

    // 6. Audit Log
    try {
      await AuditLog.create({
        actorId: req.user._id,
        actorName: cleanEmployeeName,
        action: "EMPLOYER_REQUESTED_COMPANY_CONNECTION",
        module: "Settings",
        target: trimmedCompanyName,
        details: `Employee ${cleanEmployeeName} (${cleanEmployeeEmail}) submitted connection request for "${trimmedCompanyName}" (${cleanCompanyEmail}).`,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      });
    } catch (auditErr) {
      console.warn("AuditLog warning:", auditErr.message);
    }

    return res.status(201).json({
      success: true,
      status: "PENDING",
      message: "Company connection request submitted successfully! Super Admin review is now Pending Approval.",
      organizationRequest: connectionRequest,
    });
  } catch (error) {
    next(error);
  }
};
