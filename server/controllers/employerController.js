// server/controllers/employerController.js
const EmployerProfile = require("../models/EmployerProfile");
const User = require("../models/User");

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

    // Mock/real metrics for dashboard overview
    const stats = {
      activeJobs: 4,
      internships: 8,
      totalOpportunities: 12,
      applications: 148,
      shortlisted: 26,
      interviews: 8,
      profileViews: 1240,
    };

    const recentApplications = [
      {
        id: "app-1",
        candidateName: "Aman Sharma",
        roleApplied: "Frontend Engineer Intern",
        type: "Internship",
        status: "Reviewing",
        appliedDate: "2026-08-27",
        matchScore: 92,
        cgpa: "8.9",
        degree: "B.Tech CSE - Geeta University",
      },
      {
        id: "app-2",
        candidateName: "Pooja Verma",
        roleApplied: "Associate Full Stack Developer",
        type: "Full-time",
        status: "Shortlisted",
        appliedDate: "2026-08-26",
        matchScore: 88,
        cgpa: "8.5",
        degree: "BCA - Geeta University",
      },
      {
        id: "app-3",
        candidateName: "Rohan Patel",
        roleApplied: "Backend Node.js Developer",
        type: "Full-time",
        status: "Interview Scheduled",
        appliedDate: "2026-08-25",
        matchScore: 95,
        cgpa: "9.1",
        degree: "MCA - Geeta University",
      },
      {
        id: "app-4",
        candidateName: "Simran Kaur",
        roleApplied: "UI/UX Design Intern",
        type: "Internship",
        status: "Under Review",
        appliedDate: "2026-08-24",
        matchScore: 84,
        cgpa: "8.2",
        degree: "B.Tech IT - Geeta University",
      },
    ];

    const activeListings = [
      {
        id: "job-1",
        title: "Frontend React Developer",
        type: "Full-time",
        location: profile?.headquarters?.city || "Gurugram / Hybrid",
        applicantsCount: 54,
        postedDate: "2 days ago",
        status: "Active",
      },
      {
        id: "job-2",
        title: "Node.js Backend Intern",
        type: "Internship",
        location: "Remote",
        applicantsCount: 62,
        postedDate: "4 days ago",
        status: "Active",
      },
      {
        id: "job-3",
        title: "Full Stack Engineer",
        type: "Full-time",
        location: profile?.headquarters?.city || "Delhi NCR",
        applicantsCount: 32,
        postedDate: "1 week ago",
        status: "Active",
      },
    ];

    return res.status(200).json({
      success: true,
      profile,
      stats,
      recentApplications,
      activeListings,
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
