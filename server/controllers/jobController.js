const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const { getAggregatedOpportunities, clearSearchCache } = require("../services/jobScraperService");

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

    const query = {};

    if (myJobs === "true" || myJobs === true) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      query.createdBy = req.user._id;
    } else {
      query.status = status || "Published";
    }

    const searchTerm = (search || q || "").trim();
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
        query.employmentType = { $regex: new RegExp(reqType, "i") };
      }
    } else if (myJobs !== "true") {
      query.employmentType = { $not: /^internship$/i };
    }

    if (department && department !== "All") query.department = department;
    if (category && category !== "All") {
      const catRegex = new RegExp(category, "i");
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
    if (locFilter && locFilter !== "All") query.location = { $regex: locFilter, $options: "i" };

    let campusJobs = [];
    if (source !== "external" && mongoose.connection.readyState === 1) {
      try {
        const rawJobs = await Job.find(query)
          .populate("employerId", "companyName logo headquarters industry")
          .sort({ createdAt: -1 })
          .lean();

        campusJobs = rawJobs.map((j) => {
          const salaryStr =
            j.salaryRange?.max > 0
              ? `₹${(j.salaryRange.min / 100000).toFixed(1)} - ${(j.salaryRange.max / 100000).toFixed(1)} LPA`
              : "Competitive Package";

          return {
            ...j,
            _id: j._id,
            id: j._id.toString(),
            jobId: j._id.toString(),
            title: j.title,
            company: j.employerId?.companyName || "CareerConnect Partner",
            companyName: j.employerId?.companyName || "CareerConnect Partner",
            companyId: j.employerId?._id || "",
            location: j.location,
            salary: salaryStr,
            type: j.employmentType || "Full-Time",
            opportunityType: j.employmentType || "Full-Time",
            workMode: j.workMode || "On-Site",
            requiredSkills: j.requiredSkills || [],
            skillsRequired: j.requiredSkills || [],
            skills: j.requiredSkills || [],
            postedAt: j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently",
            deadline: j.deadline ? new Date(j.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open",
            isExclusive: true,
            isExternal: false,
          };
        });
      } catch (dbErr) {
        console.warn("MongoDB Job.find error:", dbErr.message);
      }
    }

    let allJobs = campusJobs;
    if (myJobs !== "true" && source !== "campus") {
      try {
        const scraped = await getAggregatedOpportunities({
          opportunityType: employmentType && employmentType !== "All" ? employmentType.toLowerCase() : "job",
          workMode: workMode && workMode !== "All" ? workMode : "all",
          region: locFilter && locFilter !== "All" ? locFilter : "all",
          search: searchTerm || (category && category !== "All" ? category : ""),
        });

        const formattedScraped = (scraped.data || []).map((item, idx) => ({
          _id: `scraped-job-${idx}`,
          id: `scraped-job-${idx}`,
          jobId: `scraped-job-${idx}`,
          title: item.title,
          company: item.company,
          employerId: {
            companyName: item.company,
            headquarters: item.location,
          },
          location: item.location,
          employmentType: item.opportunityType || "Full-Time",
          workMode: item.workMode || "On-Site",
          salary: "Competitive Package",
          salaryRange: { min: 400000, max: 1200000, currency: "INR" },
          description: `${item.title} opportunity at ${item.company}. Apply directly through ${item.platformSource}.`,
          responsibilities: ["Deliver on project requirements", "Collaborate with cross-functional engineering team"],
          requiredSkills: [item.title.split(" ")[0] || "Engineering", "Problem Solving"],
          applyLink: item.applyLink,
          isExternal: true,
          platformSource: item.platformSource,
          source: item.platformSource,
          status: "Published",
          postedAt: item.postedDate || "Recently",
          postedDate: item.postedDate,
          createdAt: item.postedDate && !isNaN(new Date(item.postedDate).getTime()) ? new Date(item.postedDate) : new Date(),
        }));

        if (source === "external") {
          allJobs = formattedScraped;
        } else {
          allJobs = [...campusJobs, ...formattedScraped];
        }
      } catch (e) {
        console.error("Live jobs scraper error:", e.message);
      }
    }

    // Sort by latest first (createdAt / postedDate descending) or salary
    const getTimestamp = (item) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (item.postedDate) {
        const t = new Date(item.postedDate).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    if (sort === "salary_high") {
      allJobs.sort((a, b) => (b.salaryRange?.min || 0) - (a.salaryRange?.min || 0));
    } else if (sort === "salary_low") {
      allJobs.sort((a, b) => (a.salaryRange?.min || 0) - (b.salaryRange?.min || 0));
    } else {
      allJobs.sort((a, b) => getTimestamp(b) - getTimestamp(a));
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const total = allJobs.length;
    const paginatedJobs = allJobs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return res.status(200).json({
      success: true,
      count: paginatedJobs.length,
      jobs: paginatedJobs,
      data: paginatedJobs,
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
    const job = await Job.findById(req.params.id).populate(
      "employerId",
      "companyName logo headquarters industry description website"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Increment view count
    job.viewsCount += 1;
    await job.save();

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
      department,
      employmentType,
      workMode,
      location,
      salaryRange,
      experience,
      education,
      description,
      responsibilities,
      requiredSkills,
      preferredSkills,
      bonusSkills,
      openings,
      deadline,
      status,
      recruitmentStages,
    } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title, location and description are required",
      });
    }

    const stages = sanitizeRecruitmentStages(recruitmentStages);

    const job = await Job.create({
      employerId,
      createdBy: req.user._id,
      title: title.trim(),
      department: department?.trim() || "General",
      employmentType: employmentType || "Full-time",
      workMode: workMode || "Hybrid",
      location: location.trim(),
      salaryRange: salaryRange || { min: 0, max: 0, currency: "INR", isNegotiable: false },
      experience: experience || { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
      education: education || "Any Graduate",
      description: description.trim(),
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
      bonusSkills: Array.isArray(bonusSkills) ? bonusSkills : [],
      openings: openings ? Number(openings) : 1,
      deadline: deadline ? new Date(deadline) : null,
      status: status || "Published",
      recruitmentStages: stages,
    });

    clearSearchCache();

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
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

    const updates = { ...req.body };
    if (updates.recruitmentStages) {
      updates.recruitmentStages = sanitizeRecruitmentStages(updates.recruitmentStages);
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

// PATCH /api/jobs/:id/status (Toggle Status: Published / Paused / Closed)
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const job = await Job.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

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
