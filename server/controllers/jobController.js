const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const Application = require("../models/Application");
const {
  pickListingUpdate,
  escapeRegex,
  resolveNewListingModeration,
  checkEmployerStatusChange,
} = require("../utils/listingSecurity");

// S07: job listings are served from the database only. clearSearchCache stays
// so the student dashboard and opportunities feeds refresh when a job changes.
const { clearSearchCache } = require("../services/jobScraperService");
const { getPlatformSettings } = require("../services/platformSettings");
const { isEmployerApproved } = require("../middleware/employerVerification");

/**
 * Helper to ensure employer profile exists for logged in user
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

exports.defaultRecruitmentStages = defaultRecruitmentStages;

const sanitizeRecruitmentStages = (stages) => {
  if (!Array.isArray(stages) || stages.length === 0) {
    return defaultRecruitmentStages;
  }
  return stages.map((s, idx) => ({
    name: (s.name || `Stage ${idx + 1}`).trim(),
    type: s.type || "Custom",
    order: idx,
    description: (s.description || "").trim(),
    configuration: {
      interviewType: s.configuration?.interviewType || "Online",
      durationMinutes: Number(s.configuration?.durationMinutes) || 45,
      instructions: (s.configuration?.instructions || "").trim(),
      testLink: (s.configuration?.testLink || "").trim(),
      passingCriteria: (s.configuration?.passingCriteria || "").trim(),
      deadlineDays: Number(s.configuration?.deadlineDays) || 0,
    },
  }));
};

exports.sanitizeRecruitmentStages = sanitizeRecruitmentStages;

// GET /api/jobs (Filterable job listings for public / employer)
exports.getJobs = async (req, res, next) => {
  try {
    const {
      search,
      q,
      department,
      category,
      employmentType,
      workMode,
      location,
      city,
      status,
      myJobs,
      source,
      sort = "latest",
      page = 1,
      limit = 10,
    } = req.query;

    const isMyJobs = myJobs === "true" || myJobs === true || myJobs === "1";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const defaultPageSize = isMyJobs ? 100 : 10;
    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10) || defaultPageSize));
    const query = {};

    if (isMyJobs) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      const employerProfile = await EmployerProfile.findOne({ userId: req.user._id });
      const orConditions = [{ createdBy: req.user._id }];
      if (employerProfile) {
        orConditions.push({ employerId: employerProfile._id });
      }
      query.$or = orConditions;
      if (status && status !== "All") {
        query.status = status;
      }
    } else {
      query.status = "Published";
    }

    const searchTerm = escapeRegex((search || q || "").trim());
    if (searchTerm) {
      const searchCond = [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { requiredSkills: { $in: [new RegExp(searchTerm, "i")] } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCond }];
        delete query.$or;
      } else {
        query.$or = searchCond;
      }
    }

    const reqType = req.query.employmentType || req.query.opportunityType || req.query.type;
    if (reqType && reqType !== "All" && reqType !== "all") {
      if (reqType.toLowerCase() === "internship") {
        query.employmentType = { $regex: /^internship$/i };
      } else if (
        reqType.toLowerCase() === "job" ||
        reqType.toLowerCase() === "fulltime" ||
        reqType.toLowerCase() === "full-time"
      ) {
        query.employmentType = { $not: /^internship$/i };
      } else {
        query.employmentType = { $regex: new RegExp(escapeRegex(reqType), "i") };
      }
    } else if (!isMyJobs) {
      query.employmentType = { $not: /^internship$/i };
    }

    if (department && department !== "All") query.department = department;
    if (category && category !== "All") {
      const catRegex = new RegExp(escapeRegex(category), "i");
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: [{ category: catRegex }, { department: catRegex }, { title: catRegex }] }];
        delete query.$or;
      } else {
        query.$or = [{ category: catRegex }, { department: catRegex }, { title: catRegex }];
      }
    }
    if (employmentType && employmentType !== "All") query.employmentType = employmentType;
    if (workMode && workMode !== "All") query.workMode = workMode;
    const locFilter = (city || location || "").trim();
    if (locFilter && locFilter !== "All") {
      const locRegex = new RegExp(escapeRegex(locFilter), "i");
      const locConditions = [{ city: locRegex }, { location: locRegex }];
      if (locFilter.toLowerCase() === "remote") {
        locConditions.push({ workMode: /Remote/i });
      }
      if (query.$and) {
        query.$and.push({ $or: locConditions });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: locConditions }];
        delete query.$or;
      } else {
        query.$or = locConditions;
      }
    }

    // S07: Source filter mapped to MongoDB (campus = internal only, external = external only, or specific source)
    if (source && source !== "all" && source !== "All") {
      if (source.toLowerCase() === "campus") {
        query.isExternal = false;
      } else if (source.toLowerCase() === "external") {
        query.isExternal = true;
      } else {
        query.source = { $regex: new RegExp(`^${escapeRegex(source)}$`, "i") };
      }
    }

    const dbSort = sort === "salary_high" ? { "salaryRange.min": -1, _id: -1 }
      : sort === "salary_low" ? { "salaryRange.min": 1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    const skip = (pageNum - 1) * pageSize;
    let total = 0;
    let rawJobs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        [rawJobs, total] = await Promise.all([
          Job.find(query)
            .populate("employerId", "companyName logo headquarters industry")
            .sort(dbSort)
            .skip(skip)
            .limit(pageSize)
            .lean(),
          Job.countDocuments(query),
        ]);
      } catch (dbErr) {
        console.warn("MongoDB Job.find error:", dbErr.message);
      }
    }

    const formattedJobs = rawJobs.map((j) => {
      let salaryStr = null;
      if (j.salaryRange?.max > 0) {
        salaryStr = `₹${(j.salaryRange.min / 100000).toFixed(1)} - ${(j.salaryRange.max / 100000).toFixed(1)} LPA`;
      } else if (j.salaryRange?.min > 0) {
        salaryStr = `₹${(j.salaryRange.min / 100000).toFixed(1)}+ LPA`;
      } else if (j.stipend) {
        salaryStr = j.stipend;
      }

      const compName = j.employerId?.companyName || j.companyName || "CareerConnect Partner";

      return {
        ...j,
        _id: j._id,
        id: j._id.toString(),
        jobId: j._id.toString(),
        title: j.title,
        company: compName,
        companyName: compName,
        companyId: j.employerId?._id || "",
        location: j.location,
        city: j.city,
        salary: salaryStr,
        type: j.employmentType || "Full-Time",
        opportunityType: j.employmentType || "Full-Time",
        workMode: j.workMode || "On-Site",
        requiredSkills: j.requiredSkills || [],
        skillsRequired: j.requiredSkills || [],
        skills: j.requiredSkills || [],
        responsibilities: j.responsibilities || [],
        postedAt: j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently",
        deadline: j.deadline ? new Date(j.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open",
        isExclusive: !j.isExternal,
        isExternal: Boolean(j.isExternal),
        source: j.source || (j.isExternal ? "External" : "CareerConnect"),
        platformSource: j.source || (j.isExternal ? "External" : "CareerConnect"),
        applyLink: j.applyUrl || `/jobs/${j._id}`,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedJobs.length,
      jobs: formattedJobs,
      data: formattedJobs,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/jobs/:id
exports.getJobById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    const job = await Job.findById(req.params.id).populate(
      "employerId",
      "companyName logo headquarters industry description website"
    );

    if (!job || (job.status !== "Published" && (!req.user ||
      !(String(job.createdBy) === String(req.user._id) || await EmployerProfile.exists({
        _id: job.employerId?._id || job.employerId, userId: req.user._id,
      }))))) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Increment view count
    if (job.status === "Published") await Job.updateOne({ _id: job._id }, { $inc: { viewsCount: 1 } });

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/jobs (Create Job)
exports.createJob = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);

    const {
      title,
      category,
      subCategory,
      department,
      employmentType,
      workMode,
      location,
      city,
      state,
      country,
      isPaid,
      hasJobOffer,
      isInternational,
      salaryRange,
      stipend,
      duration,
      experience,
      education,
      eligibility,
      description,
      responsibilities,
      requiredSkills,
      preferredSkills,
      bonusSkills,
      openings,
      deadline,
      status,
      interviewRounds,
      recruitmentStages,
    } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title, location and description are required",
      });
    }

    const stages = sanitizeRecruitmentStages(recruitmentStages);
    const companyId = req.user.companyId || null;
    let companyName = "";
    if (companyId) {
      const comp = await Company.findById(companyId);
      if (comp) companyName = comp.name;
    }

    // Employers can only submit for approval (or save a draft); only platform admins publish directly
    const settings = await getPlatformSettings();
    const moderation = resolveNewListingModeration(req.user, status, {
      autoApproveJobs: settings.autoApproveJobs,
      employerApproved: isEmployerApproved(req.employerProfile),
    });
    const initialStatus = moderation.status;

    // Format and sanitize interview rounds if provided
    let formattedRounds;
    if (Array.isArray(interviewRounds) && interviewRounds.length > 0) {
      formattedRounds = interviewRounds.map((r, idx) => ({
        order: Number(r.order) || idx + 1,
        name: String(r.name || "").trim() || `Round ${idx + 1}`,
        type: ["online_assessment", "technical", "coding", "managerial", "hr", "behavioral", "final", "other"].includes(String(r.type || "").toLowerCase())
          ? String(r.type).toLowerCase()
          : "technical",
        description: String(r.description || "").trim(),
        isMandatory: r.isMandatory !== false,
      }));
    }

    const job = await Job.create({
      employerId,
      createdBy: req.user._id,
      companyId,
      companyName: companyName || "",
      title: title.trim(),
      category: category?.trim() || "Web Development",
      subCategory: subCategory?.trim() || "Frontend Development",
      department: department?.trim() || "General",
      employmentType: employmentType || "Full-time",
      workMode: workMode || "Hybrid",
      location: location.trim(),
      city: city?.trim() || "Bangalore",
      state: state?.trim() || "Karnataka",
      country: country?.trim() || "India",
      isPaid: isPaid !== false,
      hasJobOffer: !!hasJobOffer,
      isInternational: !!isInternational,
      salaryRange: salaryRange || { min: 0, max: 0, currency: "INR", isNegotiable: false },
      stipend: stipend?.trim() || "",
      duration: duration?.trim() || "",
      experience: experience || { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
      education: education || "Any Graduate",
      eligibility: eligibility?.trim() || "",
      description: description.trim(),
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
      bonusSkills: Array.isArray(bonusSkills) ? bonusSkills : [],
      openings: openings ? Number(openings) : 1,
      deadline: deadline ? new Date(deadline) : null,
      ...moderation,
      recruitmentStages: stages,
    });

    clearSearchCache();

    return res.status(201).json({
      success: true,
      message: initialStatus === "Pending Approval"
        ? "Job submitted for approval"
        : "Job saved successfully",
      job,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/jobs/:id (Update Job)
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or access denied",
      });
    }

    // Only listing fields are editable; ownership and counters are not.
    const updates = pickListingUpdate(req.body);
    if (req.body.recruitmentStages) {
      updates.recruitmentStages = sanitizeRecruitmentStages(req.body.recruitmentStages);
    }

    Object.assign(job, updates);
    await job.save();
    clearSearchCache();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/jobs/:id/status (Draft / Pending Approval / Paused / Closed; Published only to re-open an approved job)
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const job = await Job.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const denied = checkEmployerStatusChange(job, status);
    if (denied) {
      return res.status(denied.code).json({ success: false, message: denied.message });
    }

    job.status = status;
    await job.save();
    clearSearchCache();

    return res.status(200).json({
      success: true,
      message: `Job status updated to ${status}`,
      job,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/jobs/:id/duplicate
exports.duplicateJob = async (req, res, next) => {
  try {
    const original = await Job.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!original) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const duplicateData = original.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.title = `${original.title} (Copy)`;
    duplicateData.status = "Draft";
    // The copy is a new listing and needs its own moderation decision
    duplicateData.approvedBy = null;
    duplicateData.approvedAt = null;
    duplicateData.approvalMethod = null;
    duplicateData.rejectedBy = null;
    duplicateData.rejectedAt = null;
    duplicateData.rejectionReason = null;
    duplicateData.adminNote = null;
    duplicateData.isFeatured = false;
    duplicateData.viewsCount = 0;
    duplicateData.applicantsCount = 0;
    if (Array.isArray(original.recruitmentStages)) {
      duplicateData.recruitmentStages = original.recruitmentStages.map((s) => {
        const stageObj = s.toObject ? s.toObject() : { ...s };
        delete stageObj._id;
        return stageObj;
      });
    }

    const duplicated = await Job.create(duplicateData);

    return res.status(201).json({
      success: true,
      message: "Job duplicated as draft",
      job: duplicated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/jobs/:id
exports.deleteJob = async (req, res, next) => {
  try {
    const ownerQuery = {
      _id: req.params.id,
      createdBy: req.user._id,
    };
    let job = await Job.findOneAndDelete(ownerQuery);
    if (!job) {
      job = await Internship.findOneAndDelete(ownerQuery);
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Clean up applications
    await Application.deleteMany({
      $or: [{ jobId: req.params.id }, { internshipId: req.params.id }],
    });

    clearSearchCache();

    return res.status(200).json({
      success: true,
      message: "Job and related applications deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
