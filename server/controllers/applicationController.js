const Application = require("../models/Application");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const Interview = require("../models/Interview");
const JobOffer = require("../models/JobOffer");
const socketService = require("../services/socketService");

// ==========================================
// HELPERS
// ==========================================

const getEmployerProfile = async (userId) => {
  return EmployerProfile.findOne({ userId });
};

const getEmployerOwnershipOrClauses = async (userId) => {
  const profile = await getEmployerProfile(userId);
  const profileId = profile ? profile._id : null;

  const allEmployerJobs = await Job.find({
    $or: [
      { createdBy: userId },
      ...(profileId ? [{ employerId: profileId }] : []),
    ],
  }, "_id");

  const allEmployerInternships = await Internship.find({
    $or: [
      { createdBy: userId },
      ...(profileId ? [{ employerId: profileId }] : []),
    ],
  }, "_id");

  const jobIds = allEmployerJobs.map((j) => j._id);
  const internshipIds = allEmployerInternships.map((i) => i._id);

  const orClauses = [];
  if (profileId) orClauses.push({ employerId: profileId });
  orClauses.push({ employerId: userId });
  if (jobIds.length > 0) orClauses.push({ jobId: { $in: jobIds } });
  if (internshipIds.length > 0) orClauses.push({ internshipId: { $in: internshipIds } });

  return orClauses.length > 0 ? orClauses : [{ _id: null }];
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
      companyId: internship.companyId || null,
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
      companyId: job.companyId || null,
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
// GET SINGLE APPLICATION (Candidate Details)
// GET /api/applications/:id
// ==========================================
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("candidateId", "fullName email phone profileImage userType location skills education experience bio resumeUrl")
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

    // Fetch live interviews connected to this application
    const interviews = await Interview.find({ applicationId: application._id })
      .populate("interviewerId", "fullName email")
      .sort({ roundNumber: 1, scheduledDate: -1, createdAt: -1 });

    // Fetch live job offer connected to this application
    const offer = await JobOffer.findOne({ applicationId: application._id });

    // Privacy rule: Recruiter notes are internal only and never exposed to candidate
    const appObj = application.toObject();
    if (!isEmployer && req.user.role !== "admin") {
      delete appObj.notes;
    }

    return res.status(200).json({
      success: true,
      application: appObj,
      interviews: interviews || [],
      offer: offer || null,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — LIST APPLICATIONS (ATS PIPELINE)
// GET /api/applications/employer/list
// ==========================================
exports.getEmployerApplications = async (req, res, next) => {
  try {
    const orClauses = await getEmployerOwnershipOrClauses(req.user._id);
    const baseEmployerFilter = { $or: orClauses };

    // 1. Calculate Real MongoDB Compact Statistics (4 Stats)
    // - Total Applications
    // - Shortlisted
    // - Interviews
    // - Offers
    const totalApplications = await Application.countDocuments(baseEmployerFilter);

    const shortlistedCount = await Application.countDocuments({
      $and: [baseEmployerFilter, { status: "Shortlisted" }],
    });

    const interviewStatuses = ["Interview", "Interview Scheduled", "Interview Completed"];
    const interviewsCount = await Application.countDocuments({
      $and: [baseEmployerFilter, { status: { $in: interviewStatuses } }],
    });

    const offerStatuses = ["Offer", "Offered", "Selected"];
    const offersCount = await Application.countDocuments({
      $and: [baseEmployerFilter, { status: { $in: offerStatuses } }],
    });

    const stats = {
      totalApplications,
      applications: totalApplications,
      shortlisted: shortlistedCount,
      interviews: interviewsCount,
      offers: offersCount,
    };

    // 2. Calculate Real MongoDB Pipeline Stage Counts (No "Approved" stage!)
    const appliedStatuses = ["Applied", "Under Review", "Screening", "Approved"];
    const [
      appliedCount,
      assessmentCount,
      hiredCount,
      rejectedCount,
      withdrawnCount,
    ] = await Promise.all([
      Application.countDocuments({ $and: [baseEmployerFilter, { status: { $in: appliedStatuses } }] }),
      Application.countDocuments({ $and: [baseEmployerFilter, { status: "Assessment" }] }),
      Application.countDocuments({ $and: [baseEmployerFilter, { status: "Hired" }] }),
      Application.countDocuments({ $and: [baseEmployerFilter, { status: "Rejected" }] }),
      Application.countDocuments({ $and: [baseEmployerFilter, { status: "Withdrawn" }] }),
    ]);

    const pipelineCounts = {
      All: totalApplications,
      Applied: appliedCount,
      Shortlisted: shortlistedCount,
      Assessment: assessmentCount,
      Interview: interviewsCount,
      Offer: offersCount,
      Hired: hiredCount,
      Rejected: rejectedCount,
      Withdrawn: withdrawnCount,
    };

    // 3. Build Query Filters based on params
    const {
      status,
      stage,
      search,
      q,
      jobId,
      internshipId,
      experience,
      dateSort = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const andConditions = [baseEmployerFilter];

    // Stage / Status Filter
    const activeStage = stage || status;
    if (activeStage && activeStage !== "All" && activeStage !== "all") {
      const canonical = activeStage.toUpperCase();
      if (canonical === "APPLIED") {
        andConditions.push({ status: { $in: appliedStatuses } });
      } else if (canonical === "SHORTLISTED") {
        andConditions.push({ status: "Shortlisted" });
      } else if (canonical === "ASSESSMENT") {
        andConditions.push({ status: "Assessment" });
      } else if (canonical === "INTERVIEW") {
        andConditions.push({ status: { $in: interviewStatuses } });
      } else if (canonical === "OFFER") {
        andConditions.push({ status: { $in: offerStatuses } });
      } else if (canonical === "HIRED") {
        andConditions.push({ status: "Hired" });
      } else if (canonical === "REJECTED") {
        andConditions.push({ status: "Rejected" });
      } else if (canonical === "WITHDRAWN") {
        andConditions.push({ status: "Withdrawn" });
      } else {
        andConditions.push({ status: activeStage });
      }
    }

    // Job / Internship Filter
    if (jobId && jobId !== "All" && jobId !== "all") {
      andConditions.push({
        $or: [{ jobId: jobId }, { internshipId: jobId }],
      });
    } else if (internshipId && internshipId !== "All") {
      andConditions.push({ internshipId: internshipId });
    }

    // Experience Filter
    if (experience && experience !== "All" && experience !== "all") {
      andConditions.push({
        $or: [
          { experience: { $regex: experience, $options: "i" } },
          { "applicationData.experience": { $regex: experience, $options: "i" } },
        ],
      });
    }

    // Search Query (candidate name, email, job title, skills)
    const searchTerm = (search || q || "").trim();
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, "i");
      andConditions.push({
        $or: [
          { studentName: searchRegex },
          { studentEmail: searchRegex },
          { opportunityTitle: searchRegex },
          { skills: { $in: [searchRegex] } },
          { "applicationData.fullName": searchRegex },
          { "applicationData.email": searchRegex },
          { "applicationData.skills": { $in: [searchRegex] } },
        ],
      });
    }

    const finalFilter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // 4. Pagination & Sorting
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder =
      dateSort === "oldest"
        ? { appliedAt: 1, createdAt: 1 }
        : { appliedAt: -1, createdAt: -1 };

    const totalFiltered = await Application.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalFiltered / limitNum) || 1;

    const applications = await Application.find(finalFilter)
      .populate("candidateId", "fullName email phone profileImage userType location skills")
      .populate("internshipId", "title stipend duration location workMode")
      .populate("jobId", "title employmentType location workMode")
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      stats,
      pipelineCounts,
      count: applications.length,
      totalCount: totalFiltered,
      applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalCount: totalFiltered,
      },
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
      "Under Review",
      "Screening",
      "Approved",
    ];

    if (!rawStatus || !allowed.includes(rawStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
      });
    }

    const orConditions = await getEmployerOwnershipOrClauses(req.user._id);

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

    if (!application.stageHistory) application.stageHistory = [];
    application.stageHistory.push({
      stage: rawStatus,
      notes: `Status changed to ${rawStatus}`,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    await application.save();

    // Broadcast live event via Socket.IO
    socketService.emitApplicationUpdated(application);

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
// body: { stage, notes }
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
    const orConditions = await getEmployerOwnershipOrClauses(req.user._id);

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

    // Canonical mapping (never use 'Approved' for candidate ATS stage)
    const stageToStatus = {
      APPLIED: "Applied",
      Applied: "Applied",
      SHORTLISTED: "Shortlisted",
      Shortlisted: "Shortlisted",
      ASSESSMENT: "Assessment",
      Assessment: "Assessment",
      INTERVIEW: "Interview",
      Interview: "Interview",
      OFFER: "Offer",
      Offer: "Offer",
      Offered: "Offer",
      HIRED: "Hired",
      Hired: "Hired",
      REJECTED: "Rejected",
      Rejected: "Rejected",
      WITHDRAWN: "Withdrawn",
      Withdrawn: "Withdrawn",
    };

    const nextStatus = stageToStatus[stage.toUpperCase()] || stage;
    application.stage = nextStatus;
    application.status = nextStatus;
    application.updatedAt = new Date();

    if (!application.stageHistory) application.stageHistory = [];
    application.stageHistory.push({
      stage: nextStatus,
      notes: req.body.notes || `Moved to ${nextStatus}`,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    if (req.body.notes && req.body.notes.trim()) {
      application.notes.push({
        text: req.body.notes.trim(),
        addedBy: req.user._id,
        createdAt: new Date(),
      });
    }

    await application.save();

    // Broadcast live event via Socket.IO
    socketService.emitApplicationUpdated(application);

    return res.status(200).json({
      success: true,
      message: `Application moved to ${nextStatus}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — ADD NOTE
// POST /api/applications/:id/notes
// body: { note } or { text }
// ==========================================
exports.addApplicationNote = async (req, res, next) => {
  try {
    const text = req.body.text || req.body.note;
    if (!text || !text.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const orConditions = await getEmployerOwnershipOrClauses(req.user._id);

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

    const newNote = {
      text: text.toString().trim(),
      addedBy: req.user._id,
      createdAt: new Date(),
    };

    application.notes.push(newNote);
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Recruiter note added successfully",
      application,
      notes: application.notes,
    });
  } catch (error) {
    next(error);
  }
};