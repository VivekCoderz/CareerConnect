const JobOffer = require("../models/JobOffer");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const notificationService = require("../services/notificationService");
const socketService = require("../services/socketService");

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

// GET /api/offers/stats (Summary metrics strictly from MongoDB)
exports.getOfferStats = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "employer" || req.user.userType === "employer") {
      const employerId = await getEmployerProfileId(req.user);
      query.$or = [{ employerId }, { employerId: req.user._id }];
    } else {
      query.candidateId = req.user._id;
    }

    const [total, pending, accepted, rejected, expired, withdrawn] = await Promise.all([
      JobOffer.countDocuments(query),
      JobOffer.countDocuments({ ...query, status: { $in: ["Sent", "Pending", "Viewed", "Pending Approval"] } }),
      JobOffer.countDocuments({ ...query, status: { $in: ["Accepted", "accepted"] } }),
      JobOffer.countDocuments({ ...query, status: { $in: ["Rejected", "rejected"] } }),
      JobOffer.countDocuments({ ...query, status: { $in: ["Expired", "expired"] } }),
      JobOffer.countDocuments({ ...query, status: { $in: ["Withdrawn", "withdrawn"] } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        pendingCandidate: pending,
        accepted,
        rejected,
        expired,
        withdrawn,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/offers (List offers for employer or candidate)
exports.getOffers = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "employer" || req.user.userType === "employer") {
      const employerId = await getEmployerProfileId(req.user);
      query.$or = [{ employerId }, { employerId: req.user._id }];
    } else {
      query.candidateId = req.user._id;
    }

    const { status } = req.query;
    if (status && status !== "All") {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    const offers = await JobOffer.find(query)
      .populate("candidateId", "fullName email phone profileImage")
      .populate("jobId", "title department location type")
      .populate("internshipId", "title department location type companyName")
      .populate("employerId", "companyName logo officialEmail website")
      .populate("companyId", "name logo")
      .populate("applicationId", "status stage opportunityType opportunityTitle")
      .sort({ createdAt: -1 });

    // Mark expired offers dynamically if expiry date has passed and still pending
    const now = new Date();
    for (const offer of offers) {
      if (
        ["Sent", "Pending", "Viewed"].includes(offer.status) &&
        offer.expiryDate &&
        new Date(offer.expiryDate) < now
      ) {
        offer.status = "Expired";
        await JobOffer.updateOne({ _id: offer._id }, { $set: { status: "Expired" } });
      }
    }

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/offers/:id (Detailed offer)
exports.getOfferById = async (req, res, next) => {
  try {
    const offer = await JobOffer.findById(req.params.id)
      .populate("candidateId", "fullName email phone profileImage")
      .populate("jobId", "title department location type requirements")
      .populate("internshipId", "title department location type companyName")
      .populate("employerId", "companyName logo officialEmail website")
      .populate("companyId", "name logo")
      .populate("applicationId");

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";
    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      const isOwner =
        offer.employerId?._id?.equals(employerProfileId) ||
        offer.employerId?.equals(req.user._id);
      if (!isOwner && req.user.role !== "SUPER_ADMIN" && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized access to this offer" });
      }
    } else {
      if (!offer.candidateId?._id?.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this offer" });
      }
    }

    return res.status(200).json({
      success: true,
      offer,
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
      internshipId,
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
      status: initialStatus = "Sent",
    } = req.body;

    if (!candidateId || !applicationId || !salary || !joiningDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Application, candidate, salary, joining date and expiry date are required",
      });
    }

    // Verify application
    const application = await Application.findOne({
      _id: applicationId,
      candidateId,
      status: { $nin: ["Withdrawn", "Rejected"] },
    });

    if (!application) {
      return res.status(403).json({
        success: false,
        message: "Valid candidate application not found or has been withdrawn/rejected.",
      });
    }

    const parsedSalary = Number(salary);
    const parsedJoiningDate = new Date(joiningDate);
    const parsedExpiryDate = new Date(expiryDate);

    if (
      !Number.isFinite(parsedSalary) ||
      parsedSalary <= 0 ||
      Number.isNaN(parsedJoiningDate.getTime()) ||
      Number.isNaN(parsedExpiryDate.getTime()) ||
      parsedExpiryDate <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid salary or dates. Expiry date must be in the future.",
      });
    }

    const resolvedJobId = jobId || application.jobId || null;
    const resolvedInternshipId = internshipId || application.internshipId || null;
    const resolvedCompanyId = application.companyId || req.user.companyId || null;

    const offer = await JobOffer.create({
      employerId,
      companyId: resolvedCompanyId,
      candidateId,
      jobId: resolvedJobId,
      internshipId: resolvedInternshipId,
      applicationId: application._id,
      designation: designation || "Associate Engineer",
      department: department || "Engineering",
      employmentType: employmentType || "Full-time",
      salary: parsedSalary,
      salaryPeriod: salaryPeriod || "Per Annum (LPA)",
      currency: currency || "INR (₹)",
      joiningDate: parsedJoiningDate,
      location: location || "Gurugram / Hybrid",
      benefits: Array.isArray(benefits)
        ? benefits
        : typeof benefits === "string"
        ? benefits.split(",").map((b) => b.trim()).filter(Boolean)
        : ["Health Insurance", "Performance Bonus"],
      expiryDate: parsedExpiryDate,
      additionalTerms: additionalTerms || "",
      status: initialStatus,
      offerHistory: [
        {
          status: initialStatus,
          changedBy: req.user._id,
          notes: `Offer letter created with compensation ${parsedSalary} ${salaryPeriod || "Per Annum"}`,
          timestamp: new Date(),
        },
      ],
    });

    // Update Application stage & status to Offered
    application.status = "Offered";
    application.stage = "Offer";
    application.notes.push({
      text: `Formal offer extended (${parsedSalary} ${salaryPeriod || "Per Annum"}). Status: ${initialStatus}`,
      addedBy: req.user._id,
      createdAt: new Date(),
    });
    await application.save();

    // Notify candidate
    try {
      const oppTitle =
        application.opportunityTitle || designation || "Opportunity";
      const compName = application.companyName || req.user.fullName || "Partner Organization";

      await notificationService.createNotification({
        recipientId: candidateId,
        senderId: req.user._id,
        title: "Official Offer Letter Issued! 📄🎉",
        message: `Congratulations! ${compName} has extended an official offer for ${oppTitle} with compensation of ${parsedSalary} ${salaryPeriod || "Per Annum"}. Review details and respond before expiry.`,
        notificationType: "OFFER_RECEIVED",
        relatedOfferId: offer._id,
        relatedApplicationId: application._id,
        actionUrl: "/applications",
        metadata: {
          offerId: offer._id,
          designation,
          salary: parsedSalary,
          salaryPeriod,
          joiningDate: parsedJoiningDate,
          expiryDate: parsedExpiryDate,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch offer notification:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Offer letter generated and issued to candidate",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/offers/:id (Update offer details)
exports.updateOffer = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const offer = await JobOffer.findOne({
      _id: req.params.id,
      $or: [{ employerId }, { employerId: req.user._id }],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (["Accepted", "Rejected", "Withdrawn"].includes(offer.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit offer because its status is already ${offer.status}`,
      });
    }

    const {
      designation,
      department,
      employmentType,
      salary,
      salaryPeriod,
      joiningDate,
      location,
      benefits,
      expiryDate,
      additionalTerms,
    } = req.body;

    if (designation) offer.designation = designation;
    if (department) offer.department = department;
    if (employmentType) offer.employmentType = employmentType;
    if (salary) offer.salary = Number(salary);
    if (salaryPeriod) offer.salaryPeriod = salaryPeriod;
    if (joiningDate) offer.joiningDate = new Date(joiningDate);
    if (location) offer.location = location;
    if (benefits) {
      offer.benefits = Array.isArray(benefits)
        ? benefits
        : typeof benefits === "string"
        ? benefits.split(",").map((b) => b.trim()).filter(Boolean)
        : offer.benefits;
    }
    if (expiryDate) offer.expiryDate = new Date(expiryDate);
    if (additionalTerms !== undefined) offer.additionalTerms = additionalTerms;

    offer.offerHistory.push({
      status: offer.status,
      changedBy: req.user._id,
      notes: "Offer terms updated by employer",
      timestamp: new Date(),
    });

    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/offers/:id/withdraw (Employer withdraws offer)
exports.withdrawOffer = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { reason = "Withdrawn by employer" } = req.body;

    const offer = await JobOffer.findOne({
      _id: req.params.id,
      $or: [{ employerId }, { employerId: req.user._id }],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.status === "Withdrawn") {
      return res.status(400).json({ success: false, message: "Offer is already withdrawn" });
    }

    offer.status = "Withdrawn";
    offer.withdrawnAt = new Date();
    offer.withdrawnBy = req.user._id;
    offer.withdrawnReason = reason;
    offer.offerHistory.push({
      status: "Withdrawn",
      changedBy: req.user._id,
      notes: `Offer withdrawn. Reason: ${reason}`,
      timestamp: new Date(),
    });

    await offer.save();

    // Revert application status if currently offered
    if (offer.applicationId) {
      await Application.findByIdAndUpdate(offer.applicationId, {
        status: "Shortlisted",
        stage: "Offer Withdrawn",
        $push: {
          notes: {
            text: `Offer withdrawn by employer. Reason: ${reason}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    }

    // Notify candidate
    try {
      await notificationService.createNotification({
        recipientId: offer.candidateId,
        senderId: req.user._id,
        title: "Offer Withdrawn",
        message: `Your offer for ${offer.designation} has been withdrawn by the employer. Reason: ${reason}.`,
        notificationType: "OFFER_WITHDRAWN",
        relatedOfferId: offer._id,
        relatedApplicationId: offer.applicationId,
        actionUrl: "/applications",
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch offer withdraw notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Offer withdrawn successfully",
      offer,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/offers/:id/send (Send approved draft offer)
exports.sendOffer = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const offer = await JobOffer.findOne({
      _id: req.params.id,
      $or: [{ employerId }, { employerId: req.user._id }],
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    offer.status = "Sent";
    offer.offerHistory.push({
      status: "Sent",
      changedBy: req.user._id,
      notes: "Offer marked Sent to candidate",
      timestamp: new Date(),
    });
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer sent to candidate successfully",
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

    const offer = await JobOffer.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
      status: { $in: ["Sent", "Pending", "Viewed", "sent", "pending"] },
      expiryDate: { $gt: new Date() },
    });

    if (!offer) {
      return res.status(409).json({
        success: false,
        message: "Offer is unavailable, expired, or has already been responded to.",
      });
    }

    offer.status = status;
    offer.candidateResponseNotes = candidateResponseNotes || "";
    offer.respondedAt = new Date();
    offer.offerHistory.push({
      status,
      changedBy: req.user._id,
      notes: `Candidate responded: ${status}. Notes: ${candidateResponseNotes || "None"}`,
      timestamp: new Date(),
    });

    await offer.save();

    // Update application status
    if (offer.applicationId) {
      const newAppStatus = status === "Accepted" ? "Hired" : "Rejected";
      const newStage = status === "Accepted" ? "Hired / Placed" : "Offer Declined";

      await Application.findByIdAndUpdate(offer.applicationId, {
        status: newAppStatus,
        stage: newStage,
        $push: {
          notes: {
            text: `Candidate ${status.toLowerCase()} the formal offer. Notes: ${candidateResponseNotes || "None"}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
          stageHistory: {
            stage: newStage,
            notes: `Candidate ${status} offer (${offer.salary} ${offer.salaryPeriod})`,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      });
    }

    // Notify Employer
    try {
      const employerProfile = await EmployerProfile.findById(offer.employerId).select("userId");
      const targetUserId = employerProfile?.userId || offer.employerId;

      await notificationService.createNotification({
        recipientId: targetUserId,
        senderId: req.user._id,
        title: `Offer ${status} by Candidate! 📋`,
        message: `${req.user.fullName || "The candidate"} has ${status.toLowerCase()} the offer for ${offer.designation}.`,
        notificationType: status === "Accepted" ? "OFFER_ACCEPTED" : "OFFER_REJECTED",
        relatedOfferId: offer._id,
        relatedApplicationId: offer.applicationId,
        actionUrl: "/employer/dashboard?tab=offers",
        metadata: {
          status,
          candidateName: req.user.fullName,
          designation: offer.designation,
          notes: candidateResponseNotes,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch offer response notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Offer ${status.toLowerCase()} successfully`,
      offer,
    });
  } catch (error) {
    next(error);
  }
};
