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
    const { coverNote, resumeUrl } = req.body;
    const candidateId = req.user._id;

    const internship = await Internship.findById(internshipId);
    if (!internship || internship.status !== "Published") {
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

    const existing = await Application.findOne({ candidateId, internshipId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this internship",
        application: existing,
      });
    }

    const application = await Application.create({
      candidateId,
      internshipId,
      jobId: null,
      employerId: internship.employerId,
      opportunityType: "Internship",
      opportunityTitle: internship.title,
      companyName: internship.companyName,
      coverNote: coverNote?.trim() || "",
      resumeUrl: resumeUrl?.trim() || "",
      status: "Applied",
      stage: "Applied",
      isExternal: false,
    });

    await Internship.findByIdAndUpdate(internshipId, {
      $inc: { applicantsCount: 1 },
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this internship",
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
    const { coverNote, resumeUrl } = req.body;
    const candidateId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job || job.status !== "Published") {
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

    const existing = await Application.findOne({ candidateId, jobId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
        application: existing,
      });
    }

    const application = await Application.create({
      candidateId,
      jobId,
      internshipId: null,
      employerId: job.employerId,
      opportunityType: "Job",
      opportunityTitle: job.title,
      companyName: job.companyName || "",
      coverNote: coverNote?.trim() || "",
      resumeUrl: resumeUrl?.trim() || "",
      status: "Applied",
      stage: "Applied",
      isExternal: false,
    });

    await Job.findByIdAndUpdate(jobId, {
      $inc: { applicantsCount: 1 },
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
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
    if (req.user.role === "employer") {
      const profile = await getEmployerProfile(req.user._id);
      isEmployer =
        profile &&
        application.employerId &&
        (application.employerId._id?.toString() === profile._id.toString() ||
          application.employerId.toString() === profile._id.toString());
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
    if (!profile) {
      return res.status(200).json({
        success: true,
        count: 0,
        applications: [],
      });
    }

    const { status, opportunityType, internshipId, jobId } = req.query;
    const filter = { employerId: profile._id };

    if (status) filter.status = status;
    if (opportunityType) filter.opportunityType = opportunityType;
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
    const { status } = req.body;
    const allowed = [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Interview",
      "Offered",
      "Hired",
      "Rejected",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
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

    application.status = status;
    application.stage = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application marked as ${status}`,
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
    const { stage } = req.body;
    if (!stage?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Stage is required",
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

    application.stage = stage.trim();

    // Optional: map common stages to status
    const stageToStatus = {
      Applied: "Applied",
      Screening: "Under Review",
      "Under Review": "Under Review",
      Shortlisted: "Shortlisted",
      Interview: "Interview",
      Offer: "Offered",
      Offered: "Offered",
      Hired: "Hired",
      Rejected: "Rejected",
    };
    if (stageToStatus[stage.trim()]) {
      application.status = stageToStatus[stage.trim()];
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