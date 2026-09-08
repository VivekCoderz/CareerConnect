// controllers/applicationController.js
const Application = require("../models/Application");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");

// ==========================================
// HELPERS
// ==========================================

const getEmployerProfile = async (userId) => {
  return EmployerProfile.findOne({ userId });
};

// ==========================================
// APPLY TO INTERNSHIP (Campus only)
// POST /api/applications/internship/:internshipId
// ==========================================
exports.applyToInternship = async (req, res, next) => {
  try {
    const { internshipId } = req.params;
    const {
      fullName,
      email,
      phone,
      address,
      education,
      degree,
      college,
      graduationYear,
      skills,
      experience,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      coverNote,
      applicationData: rawAppData,
    } = req.body;
    const candidateId = req.user._id;

    let internship = await Internship.findById(internshipId);
    let isFromJob = false;
    if (!internship) {
      internship = await Job.findById(internshipId);
      if (internship) isFromJob = true;
    }

    if (!internship || (internship.status !== "Published" && internship.status !== "Active")) {
      return res.status(404).json({
        success: false,
        message: "Internship not found or closed",
      });
    }

    if (internship.isExternal) {
      return res.status(400).json({
        success: false,
        message: "This is an external listing. Apply on the company website.",
        applyUrl: internship.applyUrl || "",
      });
    }

    const existing = await Application.findOne({
      candidateId,
      $or: [{ internshipId }, { jobId: internshipId }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position.",
        application: existing,
      });
    }

    // Determine student info: prioritize submitted values, fallback to authenticated req.user
    const studentName = (fullName && fullName.trim()) || req.user.fullName || "";
    const studentEmail = (email && email.trim()) || req.user.email || "";
    const studentPhone = (phone && phone.trim()) || req.user.phone || "";
    const finalCover = (coverLetter || coverNote || "").trim();
    const finalResume = (resumeUrl || req.user.resumeUrl || "").trim();
    const finalEducation = (education || degree || "").trim();
    const finalExperience = (experience || "").trim();
    const finalPortfolio = (portfolioUrl || "").trim();

    // Prepare complete applicationData object preserving all submitted fields
    const applicationData = {
      fullName: studentName,
      email: studentEmail,
      phone: studentPhone,
      address: (address || "").trim(),
      education: finalEducation,
      degree: (degree || "").trim(),
      college: (college || "").trim(),
      graduationYear: (graduationYear || "").trim(),
      skills: skills || [],
      experience: finalExperience,
      portfolioUrl: finalPortfolio,
      resumeUrl: finalResume,
      coverLetter: finalCover,
      coverNote: finalCover,
      ...(rawAppData && typeof rawAppData === "object" ? rawAppData : {}),
    };

    // Determine employerId
    let employerId = internship.employerId?._id || internship.employerId;
    if (!employerId && internship.createdBy) {
      const empProf = await EmployerProfile.findOne({ userId: internship.createdBy });
      if (empProf) employerId = empProf._id;
      else employerId = internship.createdBy;
    }

    const application = await Application.create({
      candidateId,
      internshipId,
      jobId: isFromJob ? internshipId : (internship.jobId || internshipId),
      employerId,
      opportunityType: isFromJob && internship.employmentType !== "Internship" ? "Job" : "Internship",
      opportunityTitle: internship.title,
      companyName: internship.companyName || "",
      studentName,
      studentEmail,
      studentPhone,
      education: finalEducation,
      skills: skills || [],
      experience: finalExperience,
      portfolioUrl: finalPortfolio,
      coverNote: finalCover,
      coverLetter: finalCover,
      resumeUrl: finalResume,
      applicationData,
      status: "Applied",
      stage: "Applied",
      isExternal: false,
      appliedAt: new Date(),
    });

    if (isFromJob) {
      await Job.findByIdAndUpdate(internshipId, {
        $inc: { applicantsCount: 1 },
      });
    } else {
      await Internship.findByIdAndUpdate(internshipId, {
        $inc: { applicantsCount: 1 },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position.",
      });
    }
    next(error);
  }
};

// ==========================================
// APPLY TO JOB (Campus only)
// POST /api/applications/job/:jobId
// ==========================================
exports.applyToJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const {
      fullName,
      email,
      phone,
      address,
      education,
      degree,
      college,
      graduationYear,
      skills,
      experience,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      coverNote,
      applicationData: rawAppData,
    } = req.body;
    const candidateId = req.user._id;

    let job = await Job.findById(jobId);
    let isFromInternship = false;
    if (!job) {
      job = await Internship.findById(jobId);
      if (job) isFromInternship = true;
    }

    if (!job || (job.status !== "Published" && job.status !== "Active")) {
      return res.status(404).json({
        success: false,
        message: "Job not found or closed",
      });
    }

    if (job.isExternal) {
      return res.status(400).json({
        success: false,
        message: "This is an external listing. Apply on the company website.",
        applyUrl: job.applyUrl || "",
      });
    }

    const existing = await Application.findOne({
      candidateId,
      $or: [{ jobId }, { internshipId: jobId }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position.",
        application: existing,
      });
    }

    // Determine student info: prioritize submitted values, fallback to authenticated req.user
    const studentName = (fullName && fullName.trim()) || req.user.fullName || "";
    const studentEmail = (email && email.trim()) || req.user.email || "";
    const studentPhone = (phone && phone.trim()) || req.user.phone || "";
    const finalCover = (coverLetter || coverNote || "").trim();
    const finalResume = (resumeUrl || req.user.resumeUrl || "").trim();
    const finalEducation = (education || degree || "").trim();
    const finalExperience = (experience || "").trim();
    const finalPortfolio = (portfolioUrl || "").trim();

    // Prepare complete applicationData object preserving all submitted fields
    const applicationData = {
      fullName: studentName,
      email: studentEmail,
      phone: studentPhone,
      address: (address || "").trim(),
      education: finalEducation,
      degree: (degree || "").trim(),
      college: (college || "").trim(),
      graduationYear: (graduationYear || "").trim(),
      skills: skills || [],
      experience: finalExperience,
      portfolioUrl: finalPortfolio,
      resumeUrl: finalResume,
      coverLetter: finalCover,
      coverNote: finalCover,
      ...(rawAppData && typeof rawAppData === "object" ? rawAppData : {}),
    };

    // Determine employerId
    let employerId = job.employerId?._id || job.employerId;
    if (!employerId && job.createdBy) {
      const empProf = await EmployerProfile.findOne({ userId: job.createdBy });
      if (empProf) employerId = empProf._id;
      else employerId = job.createdBy;
    }

    const application = await Application.create({
      candidateId,
      jobId,
      internshipId: isFromInternship ? jobId : (job.internshipId || jobId),
      employerId,
      opportunityType: isFromInternship && job.employmentType !== "Job" ? "Internship" : "Job",
      opportunityTitle: job.title,
      companyName: job.companyName || "",
      studentName,
      studentEmail,
      studentPhone,
      education: finalEducation,
      skills: skills || [],
      experience: finalExperience,
      portfolioUrl: finalPortfolio,
      coverNote: finalCover,
      coverLetter: finalCover,
      resumeUrl: finalResume,
      applicationData,
      status: "Applied",
      stage: "Applied",
      isExternal: false,
      appliedAt: new Date(),
    });

    if (isFromInternship) {
      await Internship.findByIdAndUpdate(jobId, {
        $inc: { applicantsCount: 1 },
      });
    } else {
      await Job.findByIdAndUpdate(jobId, {
        $inc: { applicantsCount: 1 },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position.",
      });
    }
    next(error);
  }
};

// ==========================================
// MY APPLICATIONS (Candidate)
// GET /api/applications/me
// ==========================================
exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate("internshipId", "title stipend duration location workMode status companyName")
      .populate("jobId", "title location employmentType workMode status companyName")
      .populate("employerId", "companyName logo industry")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// WITHDRAW APPLICATION (Candidate)
// PATCH /api/applications/:id/withdraw
// ==========================================
exports.withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (["Hired", "Rejected", "Withdrawn"].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw application with status: ${application.status}`,
      });
    }

    application.status = "Withdrawn";
    application.stage = "Withdrawn";
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application withdrawn",
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE APPLICATION
// GET /api/applications/:id
// ==========================================
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("candidateId", "fullName email phone profileImage userType")
      .populate("internshipId")
      .populate("jobId")
      .populate("employerId", "companyName logo industry headquarters");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const isCandidate =
      application.candidateId?._id?.toString() === req.user._id.toString() ||
      application.candidateId?.toString() === req.user._id.toString();

    let isEmployer = false;
    if (req.user.role === "employer" || req.user.userType === "employer") {
      const profile = await getEmployerProfile(req.user._id);
      const profileId = profile ? profile._id.toString() : null;
      const appEmpId = application.employerId?._id?.toString() || application.employerId?.toString();
      if ((profileId && appEmpId && profileId === appEmpId) || (appEmpId && appEmpId === req.user._id.toString())) {
        isEmployer = true;
      }
      if (!isEmployer) {
        if (application.jobId?.createdBy?.toString() === req.user._id.toString()) isEmployer = true;
        if (application.internshipId?.createdBy?.toString() === req.user._id.toString()) isEmployer = true;
      }
    }

    if (!isCandidate && !isEmployer && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this application",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — LIST APPLICATIONS
// GET /api/applications/employer/list
// ==========================================
exports.getEmployerApplications = async (req, res, next) => {
  try {
    const profile = await getEmployerProfile(req.user._id);
    const profileId = profile ? profile._id : null;

    const allEmployerJobs = await Job.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const allEmployerInternships = await Internship.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const jobIds = allEmployerJobs.map((j) => j._id);
    const internshipIds = allEmployerInternships.map((i) => i._id);

    const orClauses = [];
    if (profileId) orClauses.push({ employerId: profileId });
    orClauses.push({ employerId: req.user._id });
    if (jobIds.length > 0) orClauses.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) orClauses.push({ internshipId: { $in: internshipIds } });

    if (orClauses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        applications: [],
      });
    }

    const { status, opportunityType, internshipId, jobId } = req.query;
    const filter = { $or: orClauses };

    if (status && status !== "All") filter.status = status;
    if (opportunityType && opportunityType !== "All") filter.opportunityType = opportunityType;
    if (internshipId) filter.internshipId = internshipId;
    if (jobId) filter.jobId = jobId;

    const applications = await Application.find(filter)
      .populate("candidateId", "fullName email phone profileImage userType")
      .populate("internshipId", "title stipend duration location workMode")
      .populate("jobId", "title employmentType location workMode")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — UPDATE STATUS
// PATCH /api/applications/:id/status
// body: { status }
// ==========================================
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const rawStatus = req.body.status || req.body.stage;
    const allowed = [
      "Applied",
      "Approved",
      "Screening",
      "Under Review",
      "Shortlisted",
      "Assessment",
      "Interview",
      "Interview Scheduled",
      "Interview Completed",
      "Selected",
      "Offer",
      "Offered",
      "Hired",
      "Rejected",
      "Withdrawn",
    ];

    if (!rawStatus || !allowed.includes(rawStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
      });
    }

    const profile = await getEmployerProfile(req.user._id);
    const profileId = profile ? profile._id : null;

    const allEmployerJobs = await Job.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const allEmployerInternships = await Internship.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const jobIds = allEmployerJobs.map((j) => j._id);
    const internshipIds = allEmployerInternships.map((i) => i._id);

    const orConditions = [];
    if (profileId) orConditions.push({ employerId: profileId });
    orConditions.push({ employerId: req.user._id });
    if (jobIds.length > 0) orConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) orConditions.push({ internshipId: { $in: internshipIds } });

    const application = await Application.findOne({
      _id: req.params.id,
      $or: orConditions,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or unauthorized",
      });
    }

    application.status = rawStatus;
    application.stage = rawStatus;
    application.updatedAt = new Date();
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application marked as ${rawStatus}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — UPDATE ATS STAGE
// PATCH /api/applications/:id/stage
// body: { stage }
// ==========================================
exports.updateApplicationStage = async (req, res, next) => {
  try {
    const rawStage = req.body.stage || req.body.status;
    if (!rawStage || !rawStage.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Stage is required",
      });
    }

    const stage = rawStage.toString().trim();

    const profile = await getEmployerProfile(req.user._id);
    const profileId = profile ? profile._id : null;

    const allEmployerJobs = await Job.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const allEmployerInternships = await Internship.find({
      $or: [
        { createdBy: req.user._id },
        ...(profileId ? [{ employerId: profileId }] : []),
      ],
    }, "_id");

    const jobIds = allEmployerJobs.map((j) => j._id);
    const internshipIds = allEmployerInternships.map((i) => i._id);

    const orConditions = [];
    if (profileId) orConditions.push({ employerId: profileId });
    orConditions.push({ employerId: req.user._id });
    if (jobIds.length > 0) orConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) orConditions.push({ internshipId: { $in: internshipIds } });

    const application = await Application.findOne({
      _id: req.params.id,
      $or: orConditions,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or unauthorized",
      });
    }

    application.stage = stage;

    const stageToStatus = {
      Applied: "Applied",
      Approved: "Approved",
      Screening: "Under Review",
      "Under Review": "Under Review",
      Shortlisted: "Shortlisted",
      Assessment: "Under Review",
      Interview: "Interview",
      Offer: "Offered",
      Offered: "Offered",
      Hired: "Hired",
      Rejected: "Rejected",
    };
    if (stageToStatus[stage]) {
      application.status = stageToStatus[stage];
    } else {
      application.status = stage;
    }

    if (req.body.notes) {
      application.notes.push({
        text: req.body.notes,
        addedBy: req.user._id,
        createdAt: new Date(),
      });
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Moved to ${application.stage}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — ADD NOTE
// POST /api/applications/:id/notes
// body: { text }
// ==========================================
exports.addApplicationNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const profile = await getEmployerProfile(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Employer profile not found",
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      employerId: profile._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    application.notes.push({
      text: text.trim(),
      addedBy: req.user._id,
      createdAt: new Date(),
    });

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Note added",
      application,
    });
  } catch (error) {
    next(error);
  }
};