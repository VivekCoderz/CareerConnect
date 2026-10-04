const mongoose = require("mongoose");
const Report = require("../models/Report");
const Job = require("../models/Job");
const Internship = require("../models/Internship");

// G11: "Report this job" from the public job and internship pages. Reports land in the
// existing Report collection, so they show up on /admin/reports.
const REASONS = {
  // Money and scam reports are handled within 2 hours (moderation SOP), so they are Critical.
  asks_for_money: { label: "Asks candidates for money", category: "Spam / Fraud", priority: "Critical", urgent: true },
  fake_or_scam: { label: "Fake or scam job", category: "Spam / Fraud", priority: "Critical", urgent: true },
  misleading: { label: "Wrong or misleading information", category: "Opportunity", priority: "Medium" },
  duplicate: { label: "Duplicate", category: "Opportunity", priority: "Low" },
  other: { label: "Other", category: "Opportunity", priority: "Medium" },
};
const MAX_DETAILS = 500;
const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

const findListing = async (opportunityType, id) => {
  if (opportunityType === "Job") {
    const job = await Job.findById(id).select("title companyId").lean();
    return job ? { listing: job, model: "Job" } : null;
  }
  const internship = await Internship.findById(id).select("title companyId").lean();
  if (internship) return { listing: internship, model: "Internship" };
  // Some internships are stored as jobs with employmentType "Internship".
  const job = await Job.findOne({ _id: id, employmentType: "Internship" }).select("title companyId").lean();
  return job ? { listing: job, model: "Job" } : null;
};

// POST /api/reports  { opportunityType, opportunityId, reason, details }
exports.createUserReport = async (req, res, next) => {
  try {
    const { opportunityType, opportunityId, reason } = req.body;
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";

    if (!["Job", "Internship"].includes(opportunityType)) {
      return res.status(400).json({ success: false, field: "opportunityType", message: "Choose a job or internship to report." });
    }
    if (!mongoose.isValidObjectId(opportunityId)) {
      return res.status(404).json({ success: false, message: "This listing was not found." });
    }
    const reasonInfo = typeof reason === "string" && Object.hasOwn(REASONS, reason) ? REASONS[reason] : null;
    if (!reasonInfo) {
      return res.status(400).json({ success: false, field: "reason", message: "Please choose a reason." });
    }
    if (details.length > MAX_DETAILS) {
      return res.status(400).json({ success: false, field: "details", message: `Please keep the details under ${MAX_DETAILS} characters.` });
    }

    const found = await findListing(opportunityType, opportunityId);
    if (!found) {
      return res.status(404).json({ success: false, message: "This listing was not found." });
    }

    const reportedBy = req.user._id;
    if (await Report.exists({ reportedBy, opportunityId })) {
      return res.status(409).json({
        success: false,
        code: "ALREADY_REPORTED",
        message: "You've already reported this listing. Our team is reviewing it.",
      });
    }

    // Counted per user (not per IP) and stored in the database, so a server restart doesn't reset it.
    const recent = await Report.countDocuments({ reportedBy, createdAt: { $gte: new Date(Date.now() - HOUR_MS) } });
    if (recent >= HOURLY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "REPORT_LIMIT",
        message: "You've sent several reports in the last hour. Please try again a little later.",
      });
    }

    const { listing, model } = found;
    const text = details ? `${reasonInfo.label}\n\n${details}` : reasonInfo.label;
    await Report.create({
      category: reasonInfo.category,
      reportType: reasonInfo.category,
      priority: reasonInfo.priority,
      status: "Open",
      title: `${reasonInfo.label}: ${listing.title}`.slice(0, 200),
      details: text,
      description: text,
      reportedBy,
      reportedByName: req.user.fullName || "User",
      // No companyId: company admins see reports filed against their own company along
      // with the reporter's contact details. Platform admins trace the company via the listing.
      opportunityId: listing._id,
      opportunityModel: model,
      targetType: opportunityType,
      targetId: listing._id,
      targetTitle: listing.title,
    });

    return res.status(201).json({
      success: true,
      message: reasonInfo.urgent
        ? "Thanks for reporting this. We review money and scam reports within 2 hours. Please don't pay anything."
        : "Thanks, our team will review this within 24 hours.",
    });
  } catch (error) {
    next(error);
  }
};
