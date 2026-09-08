const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const {
  getAggregatedOpportunities,
  getFilterMetadata,
  CAMPUS_DRIVES
} = require("../services/jobScraperService");

/**
 * GET /api/opportunities
 * Fetches multi-source aggregated opportunities (MongoDB Jobs, Internships, LinkedIn, Internshala, Remotive, Arbeitnow, GU Campus Drives)
 */
exports.getOpportunities = async (req, res, next) => {
  try {
    const results = await getAggregatedOpportunities(req.query);
    return res.status(200).json({
      success: true,
      count: results.count,
      data: results.data,
      source: results.source
    });
  } catch (error) {
    console.error("Opportunity aggregator execution error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process multi-source feed",
      data: CAMPUS_DRIVES
    });
  }
};

/**
 * GET /api/opportunities/:id
 * Fetches single opportunity by database ID (Job, Internship or Campus Drive)
 */
exports.getOpportunityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.Types.ObjectId.isValid(id)) {
      // 1. Search in Jobs
      const job = await Job.findById(id).populate(
        "employerId",
        "companyName logo headquarters industry description website officialEmail mobile"
      );

      if (job) {
        return res.status(200).json({
          success: true,
          opportunityType: "job",
          opportunity: {
            _id: job._id,
            id: job._id,
            title: job.title,
            company: job.employerId?.companyName || "CareerConnect Partner",
            employerId: job.employerId?._id || job.employerId,
            location: job.location,
            workMode: job.workMode,
            employmentType: job.employmentType,
            opportunityType: job.employmentType || "Full-Time",
            salary: job.salaryRange?.max
              ? `₹${(job.salaryRange.min / 100000).toFixed(1)} - ${(job.salaryRange.max / 100000).toFixed(1)} LPA`
              : "Competitive Package",
            stipend: job.salaryRange?.max
              ? `₹${(job.salaryRange.min / 100000).toFixed(1)} - ${(job.salaryRange.max / 100000).toFixed(1)} LPA`
              : "Competitive Package",
            description: job.description,
            responsibilities: job.responsibilities || [],
            skills: job.requiredSkills || [],
            skillsRequired: job.requiredSkills || [],
            preferredSkills: job.preferredSkills || [],
            bonusSkills: job.bonusSkills || [],
            education: job.education,
            experience: job.experience,
            openings: job.openings,
            deadline: job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open",
            postedDate: job.createdAt
              ? new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Recently",
            isExclusive: true,
            isExternal: false,
            platformSource: "GU Placement Cell",
            status: job.status,
            employer: job.employerId,
          },
        });
      }

      // 2. Search in Internships
      const internship = await Internship.findById(id).populate(
        "employerId",
        "companyName logo headquarters industry description website officialEmail mobile"
      );

      if (internship) {
        return res.status(200).json({
          success: true,
          opportunityType: "internship",
          opportunity: {
            _id: internship._id,
            id: internship._id,
            title: internship.title,
            company: internship.companyName || internship.employerId?.companyName || "CareerConnect Partner",
            employerId: internship.employerId?._id || internship.employerId,
            location: internship.location,
            workMode: internship.workMode,
            opportunityType: "Internship",
            employmentType: "Internship",
            stipend: internship.stipend ? `₹${internship.stipend}/month` : "Paid Internship",
            salary: internship.stipend ? `₹${internship.stipend}/month` : "Paid Internship",
            duration: internship.duration,
            description: internship.description,
            responsibilities: internship.responsibilities || [],
            skills: internship.skillsRequired || [],
            skillsRequired: internship.skillsRequired || [],
            perks: internship.perks || [],
            openings: internship.openings,
            deadline: internship.applicationDeadline ? new Date(internship.applicationDeadline).toLocaleDateString() : "Open",
            postedDate: internship.createdAt
              ? new Date(internship.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Recently",
            isExclusive: true,
            isExternal: internship.isExternal,
            applyUrl: internship.applyUrl,
            platformSource: "GU Placement Cell",
            status: internship.status,
            employer: internship.employerId,
          },
        });
      }
    }

    // 3. Fallback: Search in Campus Drives
    const drive = CAMPUS_DRIVES.find((d) => d.id === id || d._id === id);
    if (drive) {
      return res.status(200).json({
        success: true,
        opportunityType: drive.opportunityType?.toLowerCase() || "job",
        opportunity: drive,
      });
    }

    return res.status(404).json({
      success: false,
      message: "Opportunity not found or expired",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/opportunities/meta
 * Returns metadata list of programs, specializations, regions, sources for UI filters
 */
exports.getOpportunityMetadata = async (req, res, next) => {
  try {
    const meta = getFilterMetadata();
    return res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /health (or /api/opportunities/health)
 */
exports.healthCheck = (req, res) => {
  return res.status(200).json({
    status: "active",
    node: "GU Gateway Matrix Engine"
  });
};
