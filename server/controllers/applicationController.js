const Application = require("../models/Application");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Interview = require("../models/Interview");
const notificationService = require("../services/notificationService");

const JobOffer = require("../models/JobOffer");
const socketService = require("../services/socketService");

// ==========================================
// HELPERS
// ==========================================

const defaultRecruitmentStages = [
  {
    name: "Resume Screening",
    type: "Resume Screening",
    order: 0,
    description: "Initial profile and resume evaluation",
    configuration: { instructions: "Review applicant resume and qualifications" },
  },
  {
    name: "Technical Interview",
    type: "Technical Interview",
    order: 1,
    description: "Technical skills and coding assessment round",
    configuration: {
      interviewType: "Online",
      durationMinutes: 45,
      instructions: "Technical live problem-solving and system discussion",
    },
  },
  {
    name: "HR Interview",
    type: "HR Interview",
    order: 2,
    description: "HR, culture fit, and compensation discussion",
    configuration: {
      interviewType: "Online",
      durationMinutes: 30,
      instructions: "Cultural fit, background verification, and hiring terms",
    },
  },
];

const getEmployerProfile = async (userId) => {
  return EmployerProfile.findOne({ userId });
};

const getEmployerOwnershipOrClauses = async (userId) => {
  const profile = await getEmployerProfile(userId);
  const profileId = profile ? profile._id : null;
  const user = await User.findById(userId).select("companyId").lean();
  const companyId = user?.companyId || null;

  const jobOwnerConditions = [
    { createdBy: userId },
    ...(profileId ? [{ employerId: profileId }] : []),
    ...(companyId ? [{ companyId }] : []),
  ];

  const allEmployerJobs = await Job.find({
    $or: jobOwnerConditions,
  }, "_id");

  const allEmployerInternships = await Internship.find({
    $or: jobOwnerConditions,
  }, "_id");

  const jobIds = allEmployerJobs.map((j) => j._id);
  const internshipIds = allEmployerInternships.map((i) => i._id);

  const orClauses = [];
  if (profileId) orClauses.push({ employerId: profileId });
  orClauses.push({ employerId: userId });
  if (companyId) orClauses.push({ companyId });
  if (jobIds.length > 0) orClauses.push({ jobId: { $in: jobIds } });
  if (internshipIds.length > 0) orClauses.push({ internshipId: { $in: internshipIds } });

  return orClauses.length > 0 ? orClauses : [{ _id: null }];
};

const verifyEmployerApplicationAccess = async (userId, applicationId) => {
  const allEmployerJobs = await Job.find({ createdBy: userId }, "_id");
  const allEmployerInternships = await Internship.find({ createdBy: userId }, "_id");
  const jobIds = allEmployerJobs.map((j) => j._id);
  const internshipIds = allEmployerInternships.map((i) => i._id);

  const orConditions = [];
  if (jobIds.length > 0) orConditions.push({ jobId: { $in: jobIds } });
  if (internshipIds.length > 0) orConditions.push({ internshipId: { $in: internshipIds } });

  const empProf = await EmployerProfile.findOne({ userId });
  if (empProf) {
    orConditions.push({ employerId: empProf._id });
  }
  orConditions.push({ employerId: userId });

  if (orConditions.length === 0) return null;

  return await Application.findOne({
    _id: applicationId,
    $or: orConditions,
  })
    .populate("jobId")
    .populate("candidateId", "fullName email phone profileImage");
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

    // Determine initial dynamic recruitment stage from internship configuration
    const stages = Array.isArray(internship.recruitmentStages) && internship.recruitmentStages.length > 0
      ? internship.recruitmentStages
      : defaultRecruitmentStages;
    const firstStage = stages[0];
    const initialStageName = firstStage ? firstStage.name : "Resume Screening";
    const initialStageType = firstStage ? firstStage.type : "Resume Screening";
    const initialStageId = firstStage ? firstStage._id : null;

    const initialStageHistory = [
      {
        stageId: initialStageId,
        stageName: initialStageName,
        stageType: initialStageType,
        stageIndex: 0,
        status: "In Progress",
        startedAt: new Date(),
        completedAt: null,
        remarks: "Applied to opportunity. Initial recruitment stage started.",
        stage: initialStageName,
        notes: "Application submitted",
        changedAt: new Date(),
      },
    ];

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
      overallStatus: "In Progress",
      stage: initialStageName,
      currentStageId: initialStageId,
      currentStageName: initialStageName,
      currentStageType: initialStageType,
      currentStageIndex: 0,
      stageHistory: initialStageHistory,
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

    // Determine initial dynamic recruitment stage from job configuration
    const stages = Array.isArray(job.recruitmentStages) && job.recruitmentStages.length > 0
      ? job.recruitmentStages
      : defaultRecruitmentStages;
    const firstStage = stages[0];
    const initialStageName = firstStage ? firstStage.name : "Resume Screening";
    const initialStageType = firstStage ? firstStage.type : "Resume Screening";
    const initialStageId = firstStage ? firstStage._id : null;

    const initialStageHistory = [
      {
        stageId: initialStageId,
        stageName: initialStageName,
        stageType: initialStageType,
        stageIndex: 0,
        status: "In Progress",
        startedAt: new Date(),
        completedAt: null,
        remarks: "Applied to opportunity. Initial recruitment stage started.",
        stage: initialStageName,
        notes: "Application submitted",
        changedAt: new Date(),
      },
    ];

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
      overallStatus: "In Progress",
      stage: initialStageName,
      currentStageId: initialStageId,
      currentStageName: initialStageName,
      currentStageType: initialStageType,
      currentStageIndex: 0,
      stageHistory: initialStageHistory,
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
exports.getMyAppliedIds = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .select("jobId internshipId opportunityType")
      .lean();
    const jobIds = new Set();
    const internshipIds = new Set();

    for (const application of applications) {
      const target = application.opportunityType === "Internship" ? internshipIds : jobIds;
      const id = application.opportunityType === "Internship"
        ? application.internshipId || application.jobId
        : application.jobId;
      if (id) target.add(String(id));
    }

    return res.status(200).json({ success: true, jobIds: [...jobIds], internshipIds: [...internshipIds] });
  } catch (error) {
    next(error);
  }
};

exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate("internshipId", "title stipend duration location workMode status companyName")
      .populate("jobId", "title location employmentType workMode status companyName recruitmentStages")
      .populate("employerId", "companyName logo industry")
      .sort({ createdAt: -1 });

    const appIds = applications.map((a) => a._id);
    const interviews = await Interview.find({
      applicationId: { $in: appIds },
    }).select(
      "applicationId scheduledDate scheduledTime startTime duration durationMinutes meetingMode meetingLink location instructions roundName roundNumber status result"
    );

    const interviewMap = {};
    interviews.forEach((inv) => {
      const appIdStr = inv.applicationId.toString();
      const statusLower = (inv.status || "").toLowerCase();
      if (!interviewMap[appIdStr] || statusLower === "scheduled" || statusLower === "rescheduled") {
        interviewMap[appIdStr] = inv;
      }
    });

    const sanitizedApplications = applications.map((app) => {
      const appObj = app.toObject ? app.toObject() : { ...app };
      appObj.activeInterview = interviewMap[appObj._id.toString()] || null;

      if (appObj.jobId && (!appObj.jobId.recruitmentStages || appObj.jobId.recruitmentStages.length === 0)) {
        appObj.jobId.recruitmentStages = defaultRecruitmentStages;
      }

      // Security: Scrub employer private notes/remarks from stage history
      if (Array.isArray(appObj.stageHistory)) {
        appObj.stageHistory = appObj.stageHistory.map((sh) => {
          const { remarks, ...safeSh } = sh;
          return safeSh;
        });
      }
      delete appObj.notes;
      return appObj;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedApplications.length,
      applications: sanitizedApplications,
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

    return res.status(200).json({
      success: true,
      application,
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
      .populate("candidateId", "fullName email phone profileImage userType location skills")
      .populate("internshipId", "title stipend duration location workMode")
      .populate("jobId", "title employmentType location workMode")
      .sort({ createdAt: -1 });

    const appIds = applications.map((a) => a._id);
    const interviews = await Interview.find({ applicationId: { $in: appIds } }).select(
      "applicationId scheduledDate scheduledTime startTime duration durationMinutes meetingMode meetingLink location instructions roundName roundNumber status result scorecard"
    );

    const interviewMap = {};
    interviews.forEach((inv) => {
      const appIdStr = inv.applicationId.toString();
      if (!interviewMap[appIdStr]) {
        interviewMap[appIdStr] = [];
      }
      interviewMap[appIdStr].push(inv);
    });

    const enrichedApplications = applications.map((app) => {
      const appObj = app.toObject ? app.toObject() : { ...app };
      appObj.interviews = interviewMap[appObj._id.toString()] || [];
      appObj.latestInterview = appObj.interviews.length > 0 ? appObj.interviews[appObj.interviews.length - 1] : null;

      if (appObj.jobId && (!appObj.jobId.recruitmentStages || appObj.jobId.recruitmentStages.length === 0)) {
        appObj.jobId.recruitmentStages = defaultRecruitmentStages;
      }
      return appObj;
    });

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
    const statusMap = {
      Applied: "Applied",
      Approved: "Approved",
      Screening: "Under Review",
      "Under Review": "Under Review",
      Shortlisted: "Shortlisted",
      Assessment: "Assessment",
      Interview: "Interview",
      "Interview Scheduled": "Interview Scheduled",
      "Interview Completed": "Interview Completed",
      Selected: "Selected",
      Offer: "Offered",
      Offered: "Offered",
      Hired: "Hired",
      Rejected: "Rejected",
    };

    if (typeof rawStatus !== "string" || !Object.hasOwn(statusMap, rawStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status",
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

    application.status = statusMap[rawStatus];
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
    if (typeof rawStage !== "string" || !rawStage.trim() || rawStage.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Stage is required",
      });
    }

    const stage = rawStage.trim();

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
      OFFER: "Offered",
      Offer: "Offered",
      Offered: "Offered",
      "Interview Scheduled": "Interview Scheduled",
      "Interview Completed": "Interview Completed",
      Selected: "Selected",
      HIRED: "Hired",
      Hired: "Hired",
      REJECTED: "Rejected",
      Rejected: "Rejected",
      WITHDRAWN: "Withdrawn",
      Withdrawn: "Withdrawn",
    };
    const canonicalStage = Object.hasOwn(stageToStatus, stage)
      ? stageToStatus[stage]
      : (stageToStatus[stage.toUpperCase()] || stage);
    const allowedStatuses = Application.schema.path("status").enumValues;
    const nextStatus = allowedStatuses.includes(canonicalStage)
      ? canonicalStage
      : (allowedStatuses.includes(application.status) ? application.status : "Under Review");

    application.stage = canonicalStage;
    application.status = nextStatus;
    application.updatedAt = new Date();

    if (!application.stageHistory) application.stageHistory = [];
    application.stageHistory.push({
      stage: canonicalStage,
      notes: req.body.notes ? (typeof req.body.notes === "string" ? req.body.notes.trim() : "") : `Moved to ${canonicalStage}`,
      changedBy: req.user._id,
      changedAt: new Date(),
    });

    if (req.body.notes) {
      if (typeof req.body.notes !== "string" || req.body.notes.length > 2000) {
        return res.status(400).json({ success: false, message: "Invalid stage notes" });
      }
      if (req.body.notes.trim()) {
        application.notes.push({
          text: req.body.notes.trim(),
          addedBy: req.user._id,
          createdAt: new Date(),
        });
      }
    }

    await application.save();

    // Broadcast live event via Socket.IO
    socketService.emitApplicationUpdated(application);

    return res.status(200).json({
      success: true,
      message: `Application moved to ${canonicalStage}`,
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
    if (typeof text !== "string" || !text.trim() || text.length > 2000) {
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

// ==========================================
// EMPLOYER — MOVE APPLICATION TO NEXT STAGE
// PATCH /api/applications/:id/pipeline/move-next
// body: { remarks, metadata }
// ==========================================
exports.moveToNextStage = async (req, res, next) => {
  try {
    const { remarks = "", metadata = {} } = req.body;
    const application = await verifyEmployerApplicationAccess(req.user._id, req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
      });
    }

    if (
      ["Rejected", "Selected", "Hired", "Withdrawn"].includes(application.overallStatus) ||
      ["Rejected", "Withdrawn"].includes(application.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot advance application with status: ${application.overallStatus || application.status}`,
      });
    }

    // Retrieve recruitment stages from job
    let stages = [];
    if (application.jobId?.recruitmentStages && application.jobId.recruitmentStages.length > 0) {
      stages = [...application.jobId.recruitmentStages].sort((a, b) => a.order - b.order);
    } else {
      stages = defaultRecruitmentStages;
    }

    // Determine current stage index
    let currentIndex = -1;
    if (application.currentStageId) {
      currentIndex = stages.findIndex(
        (s) => s._id && s._id.toString() === application.currentStageId.toString()
      );
    }
    if (currentIndex === -1 && application.currentStageName) {
      currentIndex = stages.findIndex(
        (s) => s.name.toLowerCase() === application.currentStageName.toLowerCase()
      );
    }
    if (currentIndex === -1 && typeof application.currentStageIndex === "number") {
      currentIndex = application.currentStageIndex;
    }
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    // Check if candidate is already at final stage
    if (currentIndex >= stages.length - 1) {
      return res.status(400).json({
        success: false,
        message: "Candidate has completed the final stage. Please use 'Select Candidate' or 'Reject Candidate'.",
      });
    }

    const currentStage = stages[currentIndex];
    const nextIndex = currentIndex + 1;
    const nextStage = stages[nextIndex];

    const now = new Date();
    let historyEntryFound = false;

    if (Array.isArray(application.stageHistory) && application.stageHistory.length > 0) {
      for (let i = application.stageHistory.length - 1; i >= 0; i--) {
        const item = application.stageHistory[i];
        if (
          item.status === "In Progress" ||
          (item.stageName && item.stageName === currentStage.name) ||
          item.stage === currentStage.name
        ) {
          item.status = "Passed";
          item.completedAt = now;
          item.remarks = (remarks || "").trim();
          item.updatedBy = req.user._id;
          item.changedAt = now;
          item.notes = remarks || "Stage cleared";
          historyEntryFound = true;
          break;
        }
      }
    }

    if (!historyEntryFound) {
      application.stageHistory.push({
        stageId: currentStage._id || null,
        stageName: currentStage.name,
        stageType: currentStage.type,
        stageIndex: currentIndex,
        status: "Passed",
        startedAt: application.appliedAt || now,
        completedAt: now,
        remarks: (remarks || "").trim(),
        updatedBy: req.user._id,
        stage: currentStage.name,
        notes: remarks || "Stage cleared",
        changedAt: now,
      });
    }

    // Append next stage to stageHistory
    application.stageHistory.push({
      stageId: nextStage._id || null,
      stageName: nextStage.name,
      stageType: nextStage.type,
      stageIndex: nextIndex,
      status: "In Progress",
      startedAt: now,
      completedAt: null,
      remarks: "",
      updatedBy: req.user._id,
      metadata,
      stage: nextStage.name,
      notes: `Advanced to ${nextStage.name}`,
      changedAt: now,
    });

    // Update application state
    application.currentStageId = nextStage._id || null;
    application.currentStageName = nextStage.name;
    application.currentStageType = nextStage.type;
    application.currentStageIndex = nextIndex;
    application.stage = nextStage.name;
    application.overallStatus = "In Progress";

    if (nextStage.type?.includes("Interview")) {
      application.status = "Interview";
    } else {
      application.status = "Under Review";
    }

    if (remarks) {
      application.notes.push({
        text: `[Stage Advance] Cleared ${currentStage.name} ➔ Advanced to ${nextStage.name}. Remarks: ${remarks}`,
        addedBy: req.user._id,
        createdAt: now,
      });
    }

    await application.save();

    // Dispatch notification to candidate
    try {
      const oppTitle = application.opportunityTitle || application.jobId?.title || "Opportunity";
      await notificationService.createNotification({
        recipientId: application.candidateId?._id || application.candidateId,
        senderId: req.user._id,
        title: "Recruitment Stage Advanced 🚀",
        message: `Congratulations! You have advanced to stage "${nextStage.name}" for ${oppTitle}.`,
        notificationType: "APPLICATION_STAGE_ADVANCED",
        relatedApplicationId: application._id,
        actionUrl: "/student/my-applications",
        metadata: {
          previousStage: currentStage.name,
          nextStage: nextStage.name,
          stageIndex: nextIndex,
        },
      });
    } catch (notifErr) {
      console.warn("Stage advance notification error:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Candidate moved to ${nextStage.name}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — FINAL SELECTION OF CANDIDATE
// PATCH /api/applications/:id/pipeline/select
// body: { remarks }
// ==========================================
exports.selectCandidate = async (req, res, next) => {
  try {
    const { remarks = "" } = req.body;
    const application = await verifyEmployerApplicationAccess(req.user._id, req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
      });
    }

    if (["Rejected", "Withdrawn"].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot select candidate with status: ${application.status}`,
      });
    }

    const now = new Date();

    // Mark current active stage as Selected/Passed
    if (Array.isArray(application.stageHistory) && application.stageHistory.length > 0) {
      for (let i = application.stageHistory.length - 1; i >= 0; i--) {
        const item = application.stageHistory[i];
        if (item.status === "In Progress") {
          item.status = "Selected";
          item.completedAt = now;
          item.remarks = (remarks || "").trim() || "Candidate Selected";
          item.updatedBy = req.user._id;
          item.changedAt = now;
          break;
        }
      }
    }

    application.overallStatus = "Selected";
    application.status = "Selected";
    application.stage = "Selected";

    application.notes.push({
      text: `[Final Selection] Candidate marked as SELECTED. ${remarks ? `Remarks: ${remarks}` : ""}`,
      addedBy: req.user._id,
      createdAt: now,
    });

    await application.save();

    // Dispatch in-app notification
    try {
      const oppTitle = application.opportunityTitle || application.jobId?.title || "Position";
      await notificationService.createNotification({
        recipientId: application.candidateId?._id || application.candidateId,
        senderId: req.user._id,
        title: "Congratulations! You are Selected! 🎉",
        message: `You have successfully cleared all selection rounds and have been SELECTED for ${oppTitle}!`,
        notificationType: "APPLICATION_SELECTED",
        relatedApplicationId: application._id,
        actionUrl: "/student/my-applications",
      });
    } catch (notifErr) {
      console.warn("Selection notification error:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Candidate has been selected successfully!",
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — REJECT CANDIDATE AT ANY STAGE
// PATCH /api/applications/:id/pipeline/reject
// body: { remarks }
// ==========================================
exports.rejectCandidate = async (req, res, next) => {
  try {
    const { remarks = "" } = req.body;
    const application = await verifyEmployerApplicationAccess(req.user._id, req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
      });
    }

    if (application.status === "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Candidate is already rejected",
      });
    }

    const now = new Date();

    // Mark current active stage as Rejected
    if (Array.isArray(application.stageHistory) && application.stageHistory.length > 0) {
      for (let i = application.stageHistory.length - 1; i >= 0; i--) {
        const item = application.stageHistory[i];
        if (item.status === "In Progress") {
          item.status = "Rejected";
          item.completedAt = now;
          item.remarks = (remarks || "").trim();
          item.updatedBy = req.user._id;
          item.changedAt = now;
          break;
        }
      }
    }

    application.overallStatus = "Rejected";
    application.status = "Rejected";
    application.stage = "Rejected";

    application.notes.push({
      text: `[Rejection] Application rejected at stage: ${application.currentStageName || application.stage}. ${remarks ? `Reason: ${remarks}` : ""}`,
      addedBy: req.user._id,
      createdAt: now,
    });

    await application.save();

    // In-app notification to candidate
    try {
      const oppTitle = application.opportunityTitle || application.jobId?.title || "the position";
      await notificationService.createNotification({
        recipientId: application.candidateId?._id || application.candidateId,
        senderId: req.user._id,
        title: "Application Status Update",
        message: `Thank you for your interest in ${oppTitle}. After review, the hiring team has decided not to proceed with your application at this time.`,
        notificationType: "APPLICATION_REJECTED",
        relatedApplicationId: application._id,
        actionUrl: "/student/my-applications",
      });
    } catch (notifErr) {
      console.warn("Rejection notification error:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Application marked as rejected",
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — MARK TEST/STAGE FAILED
// PATCH /api/applications/:id/pipeline/mark-failed
// body: { remarks, shouldReject }
// ==========================================
exports.markStageFailed = async (req, res, next) => {
  try {
    const { remarks = "", shouldReject = false } = req.body;
    const application = await verifyEmployerApplicationAccess(req.user._id, req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
      });
    }

    const now = new Date();

    if (Array.isArray(application.stageHistory) && application.stageHistory.length > 0) {
      for (let i = application.stageHistory.length - 1; i >= 0; i--) {
        const item = application.stageHistory[i];
        if (item.status === "In Progress") {
          item.status = "Failed";
          item.completedAt = now;
          item.remarks = (remarks || "").trim();
          item.updatedBy = req.user._id;
          item.changedAt = now;
          break;
        }
      }
    }

    if (shouldReject) {
      application.overallStatus = "Rejected";
      application.status = "Rejected";
      application.stage = "Rejected";
    }

    application.notes.push({
      text: `[Stage Evaluation] Stage ${application.currentStageName || application.stage} marked as Failed. ${remarks ? `Remarks: ${remarks}` : ""}`,
      addedBy: req.user._id,
      createdAt: now,
    });

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Stage marked as Failed${shouldReject ? " and application rejected" : ""}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYER — UPDATE DYNAMIC APPLICATION ROUND
// PATCH /api/applications/:id/pipeline/round
// ==========================================
exports.updateApplicationRound = async (req, res, next) => {
  try {
    const application = await verifyEmployerApplicationAccess(req.user._id, req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
      });
    }

    const {
      roundIndex,
      stageId,
      status,
      scheduledDate,
      scheduledTime,
      meetingMode,
      meetingLink,
      location,
      instructions,
      feedback,
      remarks,
      score,
      advanceNext = false,
    } = req.body;

    const oppStages = application.jobId?.recruitmentStages?.length
      ? application.jobId.recruitmentStages
      : (application.internshipId?.recruitmentStages?.length
        ? application.internshipId.recruitmentStages
        : defaultRecruitmentStages);
    const stages = [...oppStages].sort((a, b) => a.order - b.order);

    const targetIndex = typeof roundIndex === "number"
      ? roundIndex
      : (stageId ? stages.findIndex((s) => s._id?.toString() === stageId.toString()) : application.currentStageIndex || 0);

    if (targetIndex < 0 || targetIndex >= stages.length) {
      return res.status(400).json({ success: false, message: "Invalid recruitment round index" });
    }

    const targetStage = stages[targetIndex];
    const now = new Date();

    if (!Array.isArray(application.stageHistory)) {
      application.stageHistory = [];
    }

    let historyItem = application.stageHistory.find(
      (sh) =>
        sh.stageIndex === targetIndex ||
        (sh.stageId && targetStage._id && sh.stageId.toString() === targetStage._id.toString()) ||
        (sh.stageName && sh.stageName.toLowerCase() === targetStage.name.toLowerCase())
    );

    if (!historyItem) {
      historyItem = {
        stageId: targetStage._id || null,
        stageName: targetStage.name,
        stageType: targetStage.type,
        stageIndex: targetIndex,
        status: status || "In Progress",
        startedAt: now,
      };
      application.stageHistory.push(historyItem);
      historyItem = application.stageHistory[application.stageHistory.length - 1];
    }

    if (status) historyItem.status = status;
    if (scheduledDate !== undefined) historyItem.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) historyItem.scheduledTime = scheduledTime;
    if (meetingMode !== undefined) historyItem.meetingMode = meetingMode;
    if (meetingLink !== undefined) historyItem.meetingLink = meetingLink;
    if (location !== undefined) historyItem.location = location;
    if (instructions !== undefined) historyItem.instructions = instructions;
    if (feedback !== undefined) historyItem.feedback = feedback;
    if (remarks !== undefined) historyItem.remarks = remarks;
    if (score !== undefined) historyItem.score = Number(score);
    if (status === "Passed" || status === "Completed" || status === "Failed" || status === "Selected" || status === "Rejected") {
      historyItem.completedAt = now;
    }
    historyItem.updatedBy = req.user._id;

    if (status === "Scheduled") {
      application.status = "Interview Scheduled";
      application.stage = `${targetStage.name} (Scheduled)`;
    } else if (status === "Passed") {
      if (advanceNext && targetIndex < stages.length - 1) {
        const nextIdx = targetIndex + 1;
        const nextStage = stages[nextIdx];
        application.currentStageIndex = nextIdx;
        application.currentStageId = nextStage._id || null;
        application.currentStageName = nextStage.name;
        application.currentStageType = nextStage.type;
        application.stage = nextStage.name;
        application.overallStatus = "In Progress";
        application.status = nextStage.type?.includes("Interview") ? "Interview" : "Under Review";

        const hasNext = application.stageHistory.some(
          (sh) => sh.stageIndex === nextIdx || (sh.stageName && sh.stageName.toLowerCase() === nextStage.name.toLowerCase())
        );
        if (!hasNext) {
          application.stageHistory.push({
            stageId: nextStage._id || null,
            stageName: nextStage.name,
            stageType: nextStage.type,
            stageIndex: nextIdx,
            status: "In Progress",
            startedAt: now,
            completedAt: null,
            remarks: "",
            updatedBy: req.user._id,
          });
        }
      }
    } else if (status === "Failed") {
      application.stage = `${targetStage.name} (Failed)`;
    } else if (status === "Selected") {
      application.overallStatus = "Selected";
      application.status = "Selected";
      application.stage = "Selected";
    } else if (status === "Rejected") {
      application.overallStatus = "Rejected";
      application.status = "Rejected";
      application.stage = "Rejected";
    }

    if (remarks || feedback) {
      application.notes.push({
        text: `[Round Update: ${targetStage.name}] Status: ${status || historyItem.status}. ${remarks ? `Remarks: ${remarks}` : ""} ${feedback ? `Feedback: ${feedback}` : ""}`,
        addedBy: req.user._id,
        createdAt: now,
      });
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Round "${targetStage.name}" updated successfully`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

