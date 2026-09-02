const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");

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

    if (department && department !== "All") query.department = department;
    if (employmentType && employmentType !== "All") query.employmentType = employmentType;
    if (workMode && workMode !== "All") query.workMode = workMode;
    if (location) query.location = { $regex: location, $options: "i" };

    const jobs = await Job.find(query)
      .populate("employerId", "companyName logo headquarters industry")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
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
    const job = await Job.findOneAndDelete({ _id: req.params.id, employerId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Clean up applications
    await Application.deleteMany({ jobId: req.params.id });

    return res.status(200).json({
      success: true,
      message: "Job and related applications deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
