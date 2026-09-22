// server/controllers/jobVisibilityController.js
const mongoose = require("mongoose");
const Job = require("../models/Job");
const JobVisibility = require("../models/JobVisibility");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const Application = require("../models/Application");
const jobEligibilityService = require("../services/jobEligibilityService");
const { clearSearchCache } = require("../services/jobScraperService");

/**
 * Helper to get or create employer profile
 */
const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company Hub",
      officialEmail: user.email || "",
      mobile: user.phone || "",
      industry: "Information Technology",
      companyType: "Private",
    });
  }
  return profile._id;
};

// =========================================================================
// EMPLOYEE ENDPOINTS
// =========================================================================

/**
 * POST /api/job-visibility/employer/jobs
 * Creates a new Job AND its JobVisibility configuration atomically
 */
exports.createJobWithVisibility = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const {
      title,
      department,
      employmentType,
      workMode,
      location,
      salaryRange,
      experience,
      education,
      description,
      responsibilities,
      openings,
      deadline,
      // Visibility-specific configurations
      hiringScope,
      targetInstitution,
      allowedInstitutions,
      requiredSkills,
      preferredSkills,
      eligibilityCriteria,
    } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title, location and description are required",
      });
    }

    const companyId = req.user.companyId || null;
    let companyName = "";
    if (companyId) {
      const comp = await Company.findById(companyId);
      if (comp) companyName = comp.name;
    }

    const skillsArray = Array.isArray(requiredSkills) ? requiredSkills.map((s) => s.trim()).filter(Boolean) : [];
    const prefSkillsArray = Array.isArray(preferredSkills) ? preferredSkills.map((s) => s.trim()).filter(Boolean) : [];

    // Create the core Job listing
    const job = await Job.create({
      employerId,
      createdBy: req.user._id,
      companyId,
      companyName: companyName || "",
      title: title.trim(),
      department: department?.trim() || "Engineering",
      employmentType: employmentType || "Full-time",
      workMode: workMode || "Hybrid",
      location: location.trim(),
      salaryRange: salaryRange || { min: 0, max: 0, currency: "INR", isNegotiable: false },
      experience: experience || { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
      education: education || "Any Graduate",
      description: description.trim(),
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      requiredSkills: skillsArray,
      preferredSkills: prefSkillsArray,
      openings: openings ? Number(openings) : 1,
      deadline: deadline ? new Date(deadline) : null,
      status: "Published",
    });

    const institution = targetInstitution?.trim() || "Geeta University";
    const allowed = Array.isArray(allowedInstitutions) && allowedInstitutions.length > 0
      ? allowedInstitutions.map((i) => i.trim()).filter(Boolean)
      : [institution];

    // Create the isolated JobVisibility configuration
    const visibilityConfig = await JobVisibility.create({
      jobId: job._id,
      companyId,
      employerId,
      createdBy: req.user._id,
      hiringScope: hiringScope === "Open / Off-Campus" ? "Open / Off-Campus" : "On-Campus",
      targetInstitution: institution,
      allowedInstitutions: allowed,
      requiredSkills: skillsArray,
      preferredSkills: prefSkillsArray,
      eligibilityCriteria: {
        degrees: Array.isArray(eligibilityCriteria?.degrees) ? eligibilityCriteria.degrees.filter(Boolean) : [],
        branches: Array.isArray(eligibilityCriteria?.branches) ? eligibilityCriteria.branches.filter(Boolean) : [],
        graduationYears: Array.isArray(eligibilityCriteria?.graduationYears)
          ? eligibilityCriteria.graduationYears.map(Number).filter((y) => !isNaN(y) && y > 0)
          : [],
        minCgpa: eligibilityCriteria?.minCgpa ? Number(eligibilityCriteria.minCgpa) : 0,
        experienceLevel: eligibilityCriteria?.experienceLevel || "Fresher / Entry-Level",
        minExperienceYears: eligibilityCriteria?.minExperienceYears ? Number(eligibilityCriteria.minExperienceYears) : 0,
        maxExperienceYears: eligibilityCriteria?.maxExperienceYears ? Number(eligibilityCriteria.maxExperienceYears) : 2,
        additionalNotes: eligibilityCriteria?.additionalNotes || "",
      },
      isActive: true,
    });

    clearSearchCache();

    return res.status(201).json({
      success: true,
      message: "Job created with visibility and eligibility settings successfully",
      job,
      visibilityConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/job-visibility/employer/jobs/:jobId/config
 * Configures or updates the visibility criteria for an existing job
 */
exports.configureJobVisibility = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job listing not found" });
    }

    const {
      hiringScope,
      targetInstitution,
      allowedInstitutions,
      requiredSkills,
      preferredSkills,
      eligibilityCriteria,
      isActive,
    } = req.body;

    const skillsArray = Array.isArray(requiredSkills) ? requiredSkills.map((s) => s.trim()).filter(Boolean) : job.requiredSkills;
    const institution = targetInstitution?.trim() || "Geeta University";

    const updateData = {
      jobId: job._id,
      companyId: job.companyId || req.user.companyId || null,
      employerId: job.employerId || null,
      createdBy: req.user._id,
      hiringScope: hiringScope || "On-Campus",
      targetInstitution: institution,
      allowedInstitutions: Array.isArray(allowedInstitutions) && allowedInstitutions.length > 0
        ? allowedInstitutions.map((i) => i.trim()).filter(Boolean)
        : [institution],
      requiredSkills: skillsArray,
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills.map((s) => s.trim()).filter(Boolean) : [],
      eligibilityCriteria: {
        degrees: Array.isArray(eligibilityCriteria?.degrees) ? eligibilityCriteria.degrees.filter(Boolean) : [],
        branches: Array.isArray(eligibilityCriteria?.branches) ? eligibilityCriteria.branches.filter(Boolean) : [],
        graduationYears: Array.isArray(eligibilityCriteria?.graduationYears)
          ? eligibilityCriteria.graduationYears.map(Number).filter((y) => !isNaN(y) && y > 0)
          : [],
        minCgpa: eligibilityCriteria?.minCgpa ? Number(eligibilityCriteria.minCgpa) : 0,
        experienceLevel: eligibilityCriteria?.experienceLevel || "Fresher / Entry-Level",
        minExperienceYears: eligibilityCriteria?.minExperienceYears ? Number(eligibilityCriteria.minExperienceYears) : 0,
        maxExperienceYears: eligibilityCriteria?.maxExperienceYears ? Number(eligibilityCriteria.maxExperienceYears) : 2,
        additionalNotes: eligibilityCriteria?.additionalNotes || "",
      },
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    const config = await JobVisibility.findOneAndUpdate(
      { jobId: job._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    // Keep Job's requiredSkills synchronized
    if (skillsArray.length > 0) {
      await Job.findByIdAndUpdate(job._id, { requiredSkills: skillsArray });
    }

    return res.status(200).json({
      success: true,
      message: "Job visibility configuration saved successfully",
      visibilityConfig: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-visibility/employer/jobs
 * Lists employer jobs with their attached visibility configurations
 */
exports.getEmployerJobsWithVisibility = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const jobs = await Job.find({
      $or: [{ employerId }, { createdBy: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = jobs.map((j) => j._id);
    const configs = await JobVisibility.find({ jobId: { $in: jobIds } }).lean();

    const configMap = new Map();
    configs.forEach((c) => configMap.set(c.jobId.toString(), c));

    const jobsWithConfig = jobs.map((job) => ({
      ...job,
      visibilityConfig: configMap.get(job._id.toString()) || null,
    }));

    return res.status(200).json({
      success: true,
      jobs: jobsWithConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-visibility/employer/jobs/:jobId/config
 * Retrieves visibility configuration for a single job
 */
exports.getJobVisibilityConfig = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job listing not found" });
    }

    let config = await JobVisibility.findOne({ jobId: job._id }).lean();
    if (!config) {
      // Default initial configuration suggestion
      config = {
        jobId: job._id,
        hiringScope: "On-Campus",
        targetInstitution: "Geeta University",
        allowedInstitutions: ["Geeta University"],
        requiredSkills: job.requiredSkills || [],
        eligibilityCriteria: {
          degrees: [],
          branches: [],
          graduationYears: [],
          minCgpa: 0,
          experienceLevel: "Fresher / Entry-Level",
        },
        isNew: true,
      };
    }

    return res.status(200).json({
      success: true,
      job,
      visibilityConfig: config,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// STUDENT ENDPOINTS (With Strict Backend Enforcement)
// =========================================================================

/**
 * GET /api/job-visibility/student/eligible-jobs
 * Strictly retrieves only the jobs this student is authorized and eligible to see
 */
exports.getEligibleJobsForStudent = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { scope, onlyEligible } = req.query;

    const data = await jobEligibilityService.getEligibleJobsForStudent(userId, {
      scope,
      onlyEligible,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/job-visibility/student/jobs/:jobId
 * Retrieves detailed job info with backend security & eligibility verification
 */
exports.getEligibleJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const userId = req.user._id;
    // Backend security gate: throws 403 if unauthorized institution for On-Campus
    const { student, job, config, evaluation } = await jobEligibilityService.verifyStudentCanAccessJob(
      userId,
      jobId
    );

    const existingApplication = await Application.findOne({
      candidateId: userId,
      jobId,
    })
      .select("status stage appliedAt coverNote")
      .lean();

    return res.status(200).json({
      success: true,
      job,
      visibilityConfig: config,
      evaluation,
      hasApplied: Boolean(existingApplication),
      application: existingApplication,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        evaluation: error.evaluation,
      });
    }
    next(error);
  }
};

/**
 * POST /api/job-visibility/student/jobs/:jobId/apply
 * Applies to an eligible job with strict backend eligibility enforcement
 */
exports.applyToEligibleJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const userId = req.user._id;

    // 1. Strict backend security check: Verify student can access and meets criteria
    const { student, job, evaluation } = await jobEligibilityService.verifyStudentCanAccessJob(
      userId,
      jobId
    );

    if (!evaluation.isEligible) {
      return res.status(403).json({
        success: false,
        message: "You do not meet the mandatory eligibility requirements for this position.",
        reasons: evaluation.reasons,
        evaluation,
      });
    }

    // 2. Prevent duplicate applications
    const existing = await Application.findOne({
      candidateId: userId,
      jobId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position.",
        applicationId: existing._id,
      });
    }

    const { coverNote, portfolioUrl, resumeUrl } = req.body;

    const application = await Application.create({
      candidateId: userId,
      jobId,
      employerId: job.employerId || null,
      companyId: job.companyId || null,
      opportunityType: "Job",
      opportunityTitle: job.title,
      companyName: job.companyName || "",
      studentName: student.fullName,
      studentEmail: student.email,
      studentPhone: student.phone || "",
      education: student.degree ? `${student.degree} (${student.institution})` : student.institution,
      skills: student.skills,
      portfolioUrl: portfolioUrl || "",
      resumeUrl: resumeUrl || "",
      coverNote: coverNote || "",
      coverLetter: coverNote || "",
      status: "Applied",
      stage: "Applied",
      isExternal: false,
      appliedAt: new Date(),
    });

    await Job.findByIdAndUpdate(jobId, {
      $inc: { applicantsCount: 1 },
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully! Your eligibility was verified.",
      application,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        evaluation: error.evaluation,
      });
    }
    next(error);
  }
};
