const mongoose = require("mongoose");
const Job = require("../models/Job");
const { getOwnerScope, listingOwnerClauses, companyListingFilter } = require("../utils/employerOwnership");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const Application = require("../models/Application");
const { isListingExpired, withOpenDeadline } = require("../utils/listingExpiry");
const { formatSalary, companyOf, formatDate, textOrNull } = require("../utils/listingDisplay");
const {
  pickListingUpdate,
  checkListingInput,
  checkListingKind,
  hasLocation,
  LOCATION_REQUIRED,
  mergePayRanges,
  requiresReapproval,
  escapeRegex,
  resolveNewListingModeration,
  checkEmployerStatusChange,
  toPublicListing,
} = require("../utils/listingSecurity");

// S07: job listings are served from the database only. clearSearchCache stays
// so the student dashboard and opportunities feeds refresh when a job changes.
const { clearSearchCache } = require("../services/jobScraperService");
const { categoryClauses } = require("../utils/categoryKeywords");
const { queryString, cityRegex, normalizeWorkMode } = require("../utils/listingFilters");
const { getPlatformSettings } = require("../services/platformSettings");
const { isEmployerApproved } = require("../middleware/employerVerification");
const { notifyListingClosedInBackground } = require("../services/listingClosure");

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
    const { myJobs, page = 1, limit = 10 } = req.query;
    // Filters are read as plain strings so ?workMode[$ne]=x can't become a Mongo operator.
    const [search, q, department, category, employmentType, workMode, location, city, status, source] = [
      "search", "q", "department", "category", "employmentType", "workMode", "location", "city", "status", "source",
    ].map((key) => queryString(req.query[key]));
    const sort = queryString(req.query.sort) || "latest";
    // CC-01: ?company= lists one company's jobs; absent means "no company filter".
    const company = req.query.company === undefined ? undefined : queryString(req.query.company);

    const isMyJobs = myJobs === "true" || myJobs === true || myJobs === "1";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const defaultPageSize = isMyJobs ? 100 : 10;
    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10) || defaultPageSize));
    const query = {};

    if (isMyJobs) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      query.$or = listingOwnerClauses(await getOwnerScope(req.user));
      if (status && status !== "All") {
        query.status = status;
      }
    } else {
      query.status = "Published";
    }

    // One company's jobs, for its /companies/:id page (CC-01).
    if (company !== undefined && !isMyJobs) {
      const { invalid, clause } = await companyListingFilter(company);
      if (invalid) return res.status(400).json({ success: false, message: "Invalid company id" });
      query.$and = [...(query.$and || []), clause];
    }

    // Keyword search is applied after the other filters are built (see findPage below).
    const rawSearch = (search || q || "").trim();

    const reqType = employmentType || queryString(req.query.opportunityType) || queryString(req.query.type);
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
      // Pushed under $and so an existing $or (search) and $and (open-deadline) are both kept.
      if (query.$or) {
        query.$and = [...(query.$and || []), { $or: query.$or }];
        delete query.$or;
      }
      query.$and = [...(query.$and || []), { $or: categoryClauses(category) }];
    }
    if (employmentType && employmentType !== "All") query.employmentType = employmentType;
    if (workMode && workMode !== "All") query.workMode = normalizeWorkMode(workMode);
    const locFilter = city || location;
    if (locFilter && locFilter !== "All") {
      const locRegex = cityRegex(locFilter);
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
    // Candidates never see listings whose deadline has passed, even before the sweep closes them.
    if (!isMyJobs) withOpenDeadline(query);

    // Search uses the job_text_search index (whole words, as a phrase). If that finds nothing,
    // fall back to the substring regex so partial words such as "devel" still match.
    const textPhrase = rawSearch.replace(/"/g, " ").trim();
    const textQuery = textPhrase ? { ...query, $text: { $search: `"${textPhrase}"` } } : null;
    let regexQuery = query;
    if (rawSearch) {
      const searchTerm = escapeRegex(rawSearch);
      const searchCond = [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { requiredSkills: { $in: [new RegExp(searchTerm, "i")] } },
      ];
      regexQuery = { ...query, $and: [...(query.$and || []), { $or: searchCond }] };
    }

    const findPage = (filter) => Promise.all([
      Job.find(filter)
        .populate("employerId", "companyName logo headquarters industry")
        .sort(dbSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Job.countDocuments(filter),
    ]);

    if (mongoose.connection.readyState === 1) {
      try {
        if (textQuery) {
          try {
            [rawJobs, total] = await findPage(textQuery);
          } catch (textErr) {
            console.warn("MongoDB Job text search error, using regex:", textErr.message);
          }
        }
        if (!textQuery || total === 0) {
          [rawJobs, total] = await findPage(regexQuery);
        }
      } catch (dbErr) {
        console.warn("MongoDB Job.find error:", dbErr.message);
      }
    }

    const formattedJobs = rawJobs.map((j) => {
      // Missing values are null (the client hides them), never invented text.
      const salaryStr = formatSalary(j.salaryRange) || textOrNull(j.stipend);
      const compName = companyOf(j);

      return {
        ...j,
        // Lets the employer's own list mark listings past their deadline.
        isExpired: isListingExpired(j),
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
        type: textOrNull(j.employmentType),
        opportunityType: textOrNull(j.employmentType),
        workMode: textOrNull(j.workMode),
        requiredSkills: j.requiredSkills || [],
        skillsRequired: j.requiredSkills || [],
        skills: j.requiredSkills || [],
        responsibilities: j.responsibilities || [],
        postedAt: formatDate(j.createdAt),
        deadline: formatDate(j.deadline),
        isExclusive: !j.isExternal,
        isExternal: Boolean(j.isExternal),
        source: j.source || (j.isExternal ? "External" : "CareerConnect"),
        // Own listings are stored with source "CareerConnect" (the old brand); show E2Job.
        platformSource: j.isExternal ? j.source || "External" : "E2Job",
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
    // isPublished tells the job page whether /companies/:id will open (BUG-001).
    const job = await Job.findById(req.params.id).populate(
      "employerId",
      "companyName logo headquarters industry description website isPublished"
    );

    const publiclyVisible = job && job.status === "Published" && !isListingExpired(job);
    if (!job || (!publiclyVisible && (!req.user ||
      !(String(job.createdBy) === String(req.user._id) || await EmployerProfile.exists({
        _id: job.employerId?._id || job.employerId, userId: req.user._id,
      }))))) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Increment view count
    if (publiclyVisible) await Job.updateOne({ _id: job._id }, { $inc: { viewsCount: 1 } });

    return res.status(200).json({
      success: true,
      job: toPublicListing(job, req.user),
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

    if (!hasLocation(location)) {
      return res.status(400).json({ success: false, message: LOCATION_REQUIRED });
    }
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title and description are required",
      });
    }

    const invalid = checkListingKind({ employmentType, workMode }, "job") || checkListingInput({ deadline, salaryRange });
    if (invalid) return res.status(400).json({ success: false, message: invalid });

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
      category: category?.trim() || "",
      subCategory: subCategory?.trim() || "",
      department: department?.trim() || "General",
      employmentType,
      workMode,
      location: location.trim(),
      city: city?.trim() || "",
      state: state?.trim() || "",
      country: country?.trim() || "India",
      isPaid: isPaid !== false,
      hasJobOffer: !!hasJobOffer,
      isInternational: !!isInternational,
      salaryRange: salaryRange || { min: 0, max: 0, currency: "INR", isNegotiable: false },
      stipend: stipend?.trim() || "",
      duration: duration?.trim() || "",
      ...(experience ? { experience } : {}),
      education: education || "",
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
      $or: listingOwnerClauses(await getOwnerScope(req.user)),
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or access denied",
      });
    }

    // Only listing fields are editable; ownership and counters are not.
    const updates = pickListingUpdate(req.body);
    const invalid = checkListingKind(updates, "job", { partial: true }) || checkListingInput(updates, job);
    if (invalid) return res.status(400).json({ success: false, message: invalid });
    mergePayRanges(updates, job);
    if (req.body.recruitmentStages) {
      updates.recruitmentStages = sanitizeRecruitmentStages(req.body.recruitmentStages);
    }

    // A published job whose content changes must be approved again (BUG-02).
    const sentForReview = requiresReapproval(job, updates);
    Object.assign(job, updates);
    if (sentForReview) job.status = "Pending Approval";
    await job.save();
    clearSearchCache();

    return res.status(200).json({
      success: true,
      message: sentForReview
        ? "Job updated and sent for approval again. It will be visible once an admin approves it."
        : "Job updated successfully",
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
      $or: listingOwnerClauses(await getOwnerScope(req.user)),
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

    const wasClosed = job.status === "Closed";
    job.status = status;
    if (status !== "Closed") job.closedReason = null;
    await job.save();
    if (status === "Closed" && !wasClosed) notifyListingClosedInBackground("job", job._id, { senderId: req.user._id });
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
      $or: listingOwnerClauses(await getOwnerScope(req.user)),
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
      $or: listingOwnerClauses(await getOwnerScope(req.user)),
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
