const JobOffer = require("../models/JobOffer");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const { notifyOfferSent, notifyOfferResponse } = require("../services/accountNotifications");

const OFFER_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const { checkTransition, guardedStatusUpdate } = require("../utils/applicationStatus");
const { getOwnerScope, listingOwnerClauses } = require("../utils/employerOwnership");
const { startOfTodayIST } = require("../utils/listingExpiry");

// An offer is active while it is waiting for an answer (and not expired) or accepted.
const activeOfferClause = (now = new Date()) => ({
  $or: [
    { status: { $in: ["Accepted", "accepted"] } },
    {
      status: { $in: ["Sent", "sent", "Pending", "pending"] },
      $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }],
    },
  ],
});

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
      const scope = await getOwnerScope(req.user);
      const jobIds = await Job.distinct("_id", { $or: listingOwnerClauses(scope) });
      query.$or = [
        { createdBy: req.user._id },
        ...(scope.profileId ? [{ employerId: scope.profileId }] : []),
        ...(jobIds.length ? [{ jobId: { $in: jobIds } }] : []),
      ];
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
      notes,
      additionalTerms,
    } = req.body;

    if (!candidateId || !jobId || !applicationId || !salary || !joiningDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Application, candidate, job, salary, and dates are required",
      });
    }

    const scope = await getOwnerScope(req.user);
    const job = await Job.findOne({ _id: jobId, $or: listingOwnerClauses(scope) })
      .select("_id title department employmentType location").lean();
    const application = job && await Application.findOne({ _id: applicationId, candidateId, jobId: job._id })
      .select("_id status").lean();
    if (!application) {
      return res.status(403).json({ success: false, message: "This application does not belong to your job." });
    }

    const now = new Date();
    const parsedSalary = Number(salary);
    const parsedJoiningDate = new Date(joiningDate);
    const parsedExpiryDate = new Date(expiryDate);
    if (!Number.isFinite(parsedSalary) || parsedSalary <= 0 ||
        Number.isNaN(parsedJoiningDate.getTime()) || Number.isNaN(parsedExpiryDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid salary or dates" });
    }
    // Joining can be today (IST) or later; the offer must still be open when it arrives.
    if (parsedJoiningDate < startOfTodayIST(now)) {
      return res.status(400).json({ success: false, message: "Joining date cannot be in the past" });
    }
    if (parsedExpiryDate <= now) {
      return res.status(400).json({ success: false, message: "Offer expiry cannot be in the past" });
    }
    // The candidate must be able to answer before they are due to join (QA bug 13).
    // Same day is fine: compare against the end of the joining day.
    if (parsedExpiryDate.getTime() > startOfTodayIST(parsedJoiningDate).getTime() + 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "The offer acceptance deadline must be on or before the joining date",
      });
    }

    const problem = checkTransition(application.status, "Offered");
    if (problem) {
      return res.status(409).json({ success: false, code: "INVALID_STATUS_TRANSITION", message: problem });
    }
    if (await JobOffer.exists({ applicationId: application._id, ...activeOfferClause(now) })) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_OFFER_EXISTS",
        message: "This candidate already has an active offer for this application",
      });
    }

    // Claim the application first: if another request changed it meanwhile (e.g. a second
    // offer sent at the same moment), this one stops here.
    const claimed = await Application.updateOne({ _id: application._id, status: application.status }, {
      $set: { status: "Offered" },
      $push: {
        stageHistory: {
          stage: "Offer",
          notes: `Formal job offer sent (${salary} ${salaryPeriod})`,
          changedBy: req.user._id,
          changedAt: now,
        },
      },
    });
    if (claimed.matchedCount === 0) {
      return res.status(409).json({
        success: false,
        code: "ACTIVE_OFFER_EXISTS",
        message: "This application changed while the offer was being sent. Refresh and try again.",
      });
    }

    let offer;
    try {
      offer = await JobOffer.create({
        employerId,
        createdBy: req.user._id,
        candidateId,
        jobId,
        applicationId: application._id,
        // Missing details come from the job, never invented values (QA bug 12).
        designation: designation || job.title || "",
        department: department || job.department || "",
        // Only values the schema accepts; otherwise the schema default applies.
        employmentType: [employmentType, job.employmentType].find((t) => OFFER_TYPES.includes(t)),
        salary: parsedSalary,
        salaryPeriod: salaryPeriod || "Per Annum (LPA)",
        currency: currency || "INR (₹)",
        joiningDate: parsedJoiningDate,
        location: location || job.location || "",
        benefits: Array.isArray(benefits) ? benefits : [],
        expiryDate: parsedExpiryDate,
        additionalTerms: additionalTerms || "",
        status: "Sent",
      });
    } catch (error) {
      // Undo the claim so the employer can try again.
      await Application.updateOne({ _id: application._id, status: "Offered" }, {
        $set: { status: application.status },
        $pop: { stageHistory: 1 },
      });
      throw error;
    }

    notifyOfferSent({ offer });

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
      const { applied } = await guardedStatusUpdate(offer.applicationId, status === "Accepted" ? "Hired" : "Rejected", {
        $push: {
          stageHistory: {
            stage: status === "Accepted" ? "Hired" : "Offer Rejected",
            notes: `Candidate ${status} the offer: ${candidateResponseNotes || ""}`,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      }, { actor: "candidate", keepUpdate: false });

      // The application has moved on (e.g. the employer rejected it a moment ago), so the
      // offer is no longer active: withdraw it instead of recording the answer.
      if (!applied) {
        await JobOffer.updateOne({ _id: offer._id }, { $set: { status: "Withdrawn" }, $unset: { respondedAt: "" } });
        return res.status(409).json({
          success: false,
          code: "OFFER_NOT_ACTIVE",
          message: "This offer is no longer active",
        });
      }
    }

    notifyOfferResponse({ offer, status });

    return res.status(200).json({
      success: true,
      message: `Offer ${status} successfully`,
      offer,
    });
  } catch (error) {
    next(error);
  }
};
