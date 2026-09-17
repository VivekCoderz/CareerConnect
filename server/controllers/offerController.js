const JobOffer = require("../models/JobOffer");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");

const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company",
    });
  }
  return profile._id;
};

// GET /api/offers (List offers for employer or candidate)
exports.getOffers = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "employer" || req.user.userType === "employer") {
      const employerId = await getEmployerProfileId(req.user);
      query.employerId = employerId;
    } else {
      query.candidateId = req.user._id;
    }

    const offers = await JobOffer.find(query)
      .populate("candidateId", "fullName email phone profileImage")
      .populate("jobId", "title department location")
      .populate("employerId", "companyName logo")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/offers (Create & Send offer letter)
exports.createOffer = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const {
      candidateId,
      jobId,
      applicationId,
      designation,
      department,
      employmentType,
      salary,
      salaryPeriod,
      currency,
      joiningDate,
      location,
      benefits,
      expiryDate,
      additionalTerms,
    } = req.body;

    if (!candidateId || !jobId || !applicationId || !salary || !joiningDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Application, candidate, job, salary and dates are required",
      });
    }

    const job = await Job.findOne({ _id: jobId, $or: [
      { employerId }, { createdBy: req.user._id },
    ] }).select("_id").lean();
    const application = job && await Application.findOne({
      _id: applicationId, candidateId, jobId: job._id,
      status: { $nin: ["Withdrawn", "Rejected"] },
    }).select("_id").lean();
    if (!application) {
      return res.status(403).json({ success: false, message: "This application does not belong to your job." });
    }
    const parsedSalary = Number(salary);
    const parsedJoiningDate = new Date(joiningDate);
    const parsedExpiryDate = new Date(expiryDate);
    if (!Number.isFinite(parsedSalary) || parsedSalary <= 0 ||
        Number.isNaN(parsedJoiningDate.getTime()) || Number.isNaN(parsedExpiryDate.getTime()) ||
        parsedExpiryDate <= new Date()) {
      return res.status(400).json({ success: false, message: "Invalid salary or dates" });
    }

    const offer = await JobOffer.create({
      employerId,
      candidateId,
      jobId,
      applicationId: application._id,
      designation: designation || "Associate Engineer",
      department: department || "Engineering",
      employmentType: employmentType || "Full-time",
      salary: parsedSalary,
      salaryPeriod: salaryPeriod || "Per Annum (LPA)",
      currency: currency || "INR (₹)",
      joiningDate: parsedJoiningDate,
      location: location || "Gurugram / Hybrid",
      benefits: Array.isArray(benefits) ? benefits : ["Health Insurance", "Performance Bonus"],
      expiryDate: parsedExpiryDate,
      additionalTerms: additionalTerms || "",
      status: "Sent",
    });

    if (applicationId) {
      await Application.updateOne({ _id: application._id, candidateId, jobId: job._id }, {
        status: "Offer",
        $push: {
          stageHistory: {
            stage: "Offer",
            notes: `Formal job offer sent (${salary} ${salaryPeriod})`,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Offer letter generated and sent to candidate",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/offers/:id/respond (Candidate accepts or rejects)
exports.respondToOffer = async (req, res, next) => {
  try {
    const { status, candidateResponseNotes } = req.body;
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be Accepted or Rejected" });
    }

    const offer = await JobOffer.findOneAndUpdate(
      { _id: req.params.id, candidateId: req.user._id, status: "Sent", expiryDate: { $gt: new Date() } },
      { $set: { status, candidateResponseNotes: candidateResponseNotes || "", respondedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!offer) return res.status(409).json({ success: false, message: "Offer is unavailable or already answered" });

    if (offer.applicationId) {
      await Application.updateOne({ _id: offer.applicationId, candidateId: req.user._id, jobId: offer.jobId }, {
        status: status === "Accepted" ? "Hired" : "Rejected",
        $push: {
          stageHistory: {
            stage: status === "Accepted" ? "Hired" : "Offer Rejected",
            notes: `Candidate ${status} the offer: ${candidateResponseNotes || ""}`,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Offer ${status} successfully`,
      offer,
    });
  } catch (error) {
    next(error);
  }
};
