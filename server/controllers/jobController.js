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

// GET /api/jobs (Filterable job listings for public / employer)
exports.getJobs = async (req, res, next) => {
  try {
    const {
      search,
      department,
      employmentType,
      workMode,
      location,
      status,
      myJobs,
      source,
    } = req.query;

    const query = {};

    if (myJobs === "true" && req.user) {
      const employerId = await getEmployerProfileId(req.user);
      query.employerId = employerId;
    } else {
      query.status = status || "Published";
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { requiredSkills: { $in: [new RegExp(search, "i")] } },
      ];
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
    if (workMode && workMode !== "All") query.workMode = workMode;
    if (location) query.location = { $regex: location, $options: "i" };

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

    let externalJobs = [];
    if (source !== "campus" && myJobs !== "true") {
      try {
        const scraped = await getAggregatedOpportunities({
          opportunityType: reqType && reqType !== "All" ? reqType.toLowerCase() : "fulltime",
          source: "external",
          workMode: workMode && workMode !== "All" ? workMode : "all",
          search: search || "",
        });

        const campusKeys = new Set(
          campusJobs.map((c) => `${(c.title || "").toLowerCase().trim()}_${(c.company || c.companyName || "").toLowerCase().trim()}`)
        );

        externalJobs = (scraped.data || [])
          .filter((item) => {
            if (item.isExternal === false || item.platformSource === "GU Placement Cell") return false;
            const key = `${(item.title || "").toLowerCase().trim()}_${(item.company || "").toLowerCase().trim()}`;
            return !campusKeys.has(key);
          })
          .map((item, idx) => ({
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
            createdAt: new Date(),
          }));
      } catch (e) {
        console.error("Live jobs scraper error:", e.message);
      }
    }

    let allJobs = [];
    if (source === "campus") {
      allJobs = campusJobs;
    } else if (source === "external") {
      allJobs = externalJobs;
    } else {
      allJobs = [...campusJobs, ...externalJobs];
    }

    return res.status(200).json({
      success: true,
      count: allJobs.length,
      jobs: allJobs,
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
    } = req.body;

    if (!title || !location || !description) {
      return res.status(400).json({
        success: false,
        message: "Job title, location and description are required",
      });
    }

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
    const employerId = await getEmployerProfileId(req.user);
    const job = await Job.findOne({ _id: req.params.id, employerId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or access denied",
      });
    }

    Object.assign(job, req.body);
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
    const employerId = await getEmployerProfileId(req.user);

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, employerId },
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
    const employerId = await getEmployerProfileId(req.user);
    const original = await Job.findOne({ _id: req.params.id, employerId });

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
    const employerId = await getEmployerProfileId(req.user);
    let job = await Job.findOneAndDelete({ _id: req.params.id, employerId });
    if (!job) {
      job = await Internship.findOneAndDelete({ _id: req.params.id, employerId });
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
