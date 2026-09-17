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
    const updateData = { ...req.body };

    // Prevent modifying system / immutable fields
    delete updateData.userId;
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

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
      message: error.message || "Failed to update employer profile",
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
    const draftData = { ...req.body };

    delete draftData.userId;
    delete draftData._id;
    delete draftData.__v;
    delete draftData.createdAt;
    delete draftData.updatedAt;

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
      message: error.message || "Failed to save draft",
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
 * Employer metrics, opportunities overview, recent applications
 */
exports.getEmployerDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
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

    const completion = calculateEmployerCompletion(profile, req.user);
    const profileId = profile._id;

    // Scope queries by employer identity: createdBy: userId OR employerId: profileId
    const jobOwnerOr = [{ createdBy: userId }];
    if (profileId) jobOwnerOr.push({ employerId: profileId });
    const jobOwnerFilter = { $or: jobOwnerOr };

    // 1. Active Jobs: count & top active listings
    const activeJobQuery = {
      ...jobOwnerFilter,
      status: { $in: ["Published", "Active", "Open"] },
    };
    const activeJobsCount = await Job.countDocuments(activeJobQuery);

    const rawActiveJobs = await Job.find(activeJobQuery)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Ensure applicant count is accurate from Application records
    const activeJobs = await Promise.all(
      rawActiveJobs.map(async (j) => {
        const count = await Application.countDocuments({
          $or: [{ jobId: j._id }, { internshipId: j._id }],
        });
        return {
          ...j,
          applicantsCount: Math.max(j.applicantsCount || 0, count),
        };
      })
    );

    // 2. Fetch all opportunity IDs owned by employer for application & interview associations
    const allEmployerJobs = await Job.find(jobOwnerFilter, "_id");
    const allEmployerInternships = await Internship.find(jobOwnerFilter, "_id");
    const jobIds = allEmployerJobs.map((j) => j._id);
    const internshipIds = allEmployerInternships.map((i) => i._id);

    const appOrConditions = [];
    if (profileId) appOrConditions.push({ employerId: profileId });
    appOrConditions.push({ employerId: userId });
    if (jobIds.length > 0) appOrConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) appOrConditions.push({ internshipId: { $in: internshipIds } });
    const appFilter = appOrConditions.length > 0 ? { $or: appOrConditions } : { _id: null };

    const applicationsCount = await Application.countDocuments(appFilter);

    // 3. Upcoming Interviews
    const interviewOrConditions = [];
    if (profileId) interviewOrConditions.push({ employerId: profileId });
    interviewOrConditions.push({ employerId: userId });
    if (jobIds.length > 0) interviewOrConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) interviewOrConditions.push({ internshipId: { $in: internshipIds } });
    const interviewOwnerFilter = interviewOrConditions.length > 0 ? { $or: interviewOrConditions } : { _id: null };

    // Exclude cancelled, completed, no_show, and draft interviews
    const upcomingStatusFilter = {
      $nin: [
        "cancelled",
        "completed",
        "no_show",
        "draft",
        "Cancelled",
        "Completed",
        "No Show",
        "Draft",
      ],
    };

    const upcomingInterviewsCount = await Interview.countDocuments({
      ...interviewOwnerFilter,
      status: upcomingStatusFilter,
    });

    const rawUpcomingInterviews = await Interview.find({
      ...interviewOwnerFilter,
      status: upcomingStatusFilter,
    })
      .populate("candidateId", "fullName email phone profileImage")
      .populate("jobId", "title location employmentType workMode")
      .populate("internshipId", "title location type")
      .sort({ scheduledDate: 1, startTime: 1, scheduledTime: 1 })
      .limit(6)
      .lean();

    const upcomingInterviews = rawUpcomingInterviews.map((iv) => ({
      _id: iv._id,
      candidateName: iv.candidateId?.fullName || iv.candidateName || "Candidate",
      candidateEmail: iv.candidateId?.email || "",
      candidateImage: iv.candidateId?.profileImage || "",
      roleTitle: iv.jobId?.title || iv.internshipId?.title || iv.title || "Position",
      scheduledDate: iv.scheduledDate || "",
      scheduledTime: iv.scheduledTime || iv.startTime || "",
      status: iv.status || "Scheduled",
      meetingLink: iv.meetingLink || "",
      meetingMode: iv.meetingMode || "Online",
      jobId: iv.jobId?._id || iv.jobId,
    }));

    // 4. Team Staff count from Employee and TeamMember collections
    let teamStaffCount = await Employee.countDocuments({ employerId: profileId });
    if (teamStaffCount === 0) {
      const memberCount = await TeamMember.countDocuments({ employerId: profileId });
      if (memberCount > 0) {
        teamStaffCount = memberCount;
      } else if (profile.companySize && /^\d+$/.test(profile.companySize.trim())) {
        teamStaffCount = parseInt(profile.companySize.trim(), 10);
      }
    }

    // 5. Recent Applications
    const rawRecentApps = await Application.find(appFilter)
      .populate("candidateId", "fullName email phone profileImage")
      .populate("jobId", "title")
      .populate("internshipId", "title")
      .sort({ appliedAt: -1, createdAt: -1 })
      .limit(6)
      .lean();

    const recentApplications = rawRecentApps.map((app) => ({
      _id: app._id,
      candidateName: app.studentName || app.candidateId?.fullName || "Applicant",
      candidateEmail: app.studentEmail || app.candidateId?.email || "",
      candidateImage: app.candidateId?.profileImage || "",
      position: app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Role",
      status: app.status || "Applied",
      appliedDate: app.appliedAt || app.createdAt,
      resumeUrl: app.resumeUrl || "",
    }));

    const stats = {
      activeJobs: activeJobsCount,
      applications: applicationsCount,
      upcomingInterviews: upcomingInterviewsCount,
      interviews: upcomingInterviewsCount,
      teamStaff: teamStaffCount,
      employees: teamStaffCount,
    };

    return res.status(200).json({
      success: true,
      profile,
      stats,
      activeJobs,
      activeListings: activeJobs,
      upcomingInterviews,
      recentApplications,
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

    // 2. Check if an OrganizationRequest exists for this user's email or employer profile
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const searchEmails = [req.user.email, profile?.officialEmail].filter(Boolean);
    const searchName = profile?.companyName;

    const queryConditions = [{ officialEmail: { $in: searchEmails } }];
    if (searchName && searchName !== "My Company") {
      queryConditions.push({ organizationName: { $regex: `^${searchName.trim()}$`, $options: "i" } });
    }

    const orgRequest = await OrganizationRequest.findOne({ $or: queryConditions }).sort({ createdAt: -1 });

    if (orgRequest) {
      return res.status(200).json({
        success: true,
        status: orgRequest.status, // "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"
        hasCompany: false,
        company: null,
        organizationRequest: {
          _id: orgRequest._id,
          organizationName: orgRequest.organizationName,
          organizationType: orgRequest.organizationType,
          officialEmail: orgRequest.officialEmail,
          website: orgRequest.website,
          contactPerson: orgRequest.contactPerson,
          designation: orgRequest.designation,
          phone: orgRequest.phone,
          address: orgRequest.address,
          city: orgRequest.city,
          state: orgRequest.state,
          country: orgRequest.country,
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
      organizationRequest: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employer/request-company-approval
 * Allows logged-in employer to submit/send their company to the Super Admin for official verification & approval
 */
exports.requestCompanyApproval = async (req, res, next) => {
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

    if (!organizationName || !officialEmail || !contactPerson) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required organization fields: company name, official email, and contact person.",
      });
    }

    const trimmedOrgName = organizationName.trim();
    const cleanEmail = officialEmail.trim().toLowerCase();

    // Normalize organizationType to match OrganizationRequest schema enum
    const typeMapping = {
      COMPANY: "Enterprise",
      Private: "Private",
      Public: "Public",
      Startup: "Startup",
      Enterprise: "Enterprise",
      UNIVERSITY: "Educational Institution",
      "Educational Institution": "Educational Institution",
      TRAINING_INSTITUTE: "Educational Institution",
      Government: "Government",
      "Non-Profit": "Non-Profit",
      OTHER: "Other",
      Other: "Other",
    };
    const validOrgType = typeMapping[organizationType] || "Private";

    const cleanWebsite =
      (website && website.trim()) ||
      `https://${cleanEmail.split("@")[1] || "company.com"}`;
    const cleanDesignation =
      (designation && designation.trim()) || "Talent Acquisition / HR";
    const cleanPhone = (phone && phone.trim()) || "+91 00000 00000";
    const cleanAddress = (address && address.trim()) || "Corporate Office";
    const cleanCity = (city && city.trim()) || "Gurugram";
    const cleanState = (state && state.trim()) || "Haryana";
    const cleanReason =
      (reason && reason.trim()) ||
      (description && description.trim()) ||
      "Official platform verification and enterprise tenant provisioning.";

    // 1. Check if Company is already registered and active
    const existingCompany = await Company.findOne({
      $or: [
        { email: cleanEmail },
        { name: { $regex: `^${trimmedOrgName}$`, $options: "i" } },
      ],
    });

    if (existingCompany && existingCompany.status === "active") {
      req.user.companyId = existingCompany._id;
      await req.user.save();
      return res.status(200).json({
        success: true,
        status: "APPROVED",
        message: `Your organization "${existingCompany.name}" is already verified and approved on CareerConnect! Your employer account is now linked.`,
        company: existingCompany,
      });
    }

    // 2. Check if a pending or under_review request already exists
    const existingPending = await OrganizationRequest.findOne({
      $or: [
        { officialEmail: cleanEmail },
        { organizationName: { $regex: `^${trimmedOrgName}$`, $options: "i" } },
      ],
      status: { $in: ["PENDING", "UNDER_REVIEW"] },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "This organization already has a pending onboarding request under review by the Super Admin.",
        organizationRequest: existingPending,
      });
    }

    // 3. Create or update OrganizationRequest document in MongoDB
    // If a rejected request already existed for this user/email, allow re-submitting with status PENDING!
    let newRequest = await OrganizationRequest.findOne({
      $or: [
        { officialEmail: cleanEmail },
        { organizationName: { $regex: `^${trimmedOrgName}$`, $options: "i" } },
      ],
      status: "REJECTED",
    });

    if (newRequest) {
      newRequest.organizationName = trimmedOrgName;
      newRequest.organizationType = validOrgType;
      newRequest.officialEmail = cleanEmail;
      newRequest.website = cleanWebsite;
      newRequest.contactPerson = contactPerson.trim();
      newRequest.designation = cleanDesignation;
      newRequest.phone = cleanPhone;
      newRequest.address = cleanAddress;
      newRequest.city = cleanCity;
      newRequest.state = cleanState;
      newRequest.country = (country || "India").trim();
      newRequest.reason = cleanReason;
      newRequest.description = (description || cleanReason).trim();
      newRequest.status = "PENDING";
      newRequest.rejectionReason = "";
      await newRequest.save();
    } else {
      newRequest = await OrganizationRequest.create({
        organizationName: trimmedOrgName,
        organizationType: validOrgType,
        officialEmail: cleanEmail,
        website: cleanWebsite,
        contactPerson: contactPerson.trim(),
        designation: cleanDesignation,
        phone: cleanPhone,
        address: cleanAddress,
        city: cleanCity,
        state: cleanState,
        country: (country || "India").trim(),
        reason: cleanReason,
        description: (description || cleanReason).trim(),
        status: "PENDING",
      });
    }

    // 4. Update employer profile with company details
    await EmployerProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        companyName: trimmedOrgName,
        officialEmail: cleanEmail,
        website: website.trim(),
        "headquarters.city": city.trim(),
        "headquarters.state": state.trim(),
        "headquarters.country": (country || "India").trim(),
      },
      { upsert: true }
    );

    // 5. Audit Log
    try {
      await AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.fullName || contactPerson.trim(),
        action: "EMPLOYER_REQUESTED_COMPANY_APPROVAL",
        module: "Settings",
        target: trimmedOrgName,
        details: `Employer submitted organization approval request for "${trimmedOrgName}" (${cleanEmail}) to Super Admin.`,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      });
    } catch (auditErr) {
      console.warn("AuditLog warning:", auditErr.message);
    }

    return res.status(201).json({
      success: true,
      status: "PENDING",
      message: "Organization approval request successfully submitted to Super Admin! You will be notified once reviewed.",
      organizationRequest: newRequest,
    });
  } catch (error) {
    next(error);
  }
};
