const JobOffer = require("../models/JobOffer");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");

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

    if (!candidateId || !jobId || !salary || !joiningDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Candidate, Job, Salary, Joining Date and Expiry Date are required",
      });
    }

    const offer = await JobOffer.create({
      employerId,
      candidateId,
      jobId,
      applicationId: applicationId || null,
      designation: designation || "Associate Engineer",
      department: department || "Engineering",
      employmentType: employmentType || "Full-time",
      salary: Number(salary),
      salaryPeriod: salaryPeriod || "Per Annum (LPA)",
      currency: currency || "INR (₹)",
      joiningDate: new Date(joiningDate),
      location: location || "Gurugram / Hybrid",
      benefits: Array.isArray(benefits) ? benefits : ["Health Insurance", "Performance Bonus"],
      expiryDate: new Date(expiryDate),
      additionalTerms: additionalTerms || "",
      status: "Sent",
    });

    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
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
    const offer = await JobOffer.findOne({ _id: req.params.id, candidateId: req.user._id });

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be Accepted or Rejected" });
    }

    offer.status = status;
    offer.candidateResponseNotes = candidateResponseNotes || "";
    offer.respondedAt = new Date();
    await offer.save();

    if (offer.applicationId) {
      await Application.findByIdAndUpdate(offer.applicationId, {
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
