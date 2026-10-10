const crypto = require("crypto");
const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  VERDICT_STATUSES,
  ADMIN_STATUSES,
  FINAL_STATUSES,
  MAX_NOT_SOLVED,
} = require("../models/SupportTicket");
const { createNotification } = require("../services/notificationService");
const { escapeRegex } = require("../utils/listingSecurity");

const MAX_SUBJECT = 150;
const MAX_TEXT = 2000;
const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;
const ADMIN_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "admin"];
// Where the "Help & Support" tab lives for each kind of user.
const DASHBOARDS = {
  student: "/student/dashboard",
  fresher: "/fresher/dashboard",
  professional: "/professional/dashboard",
  employer: "/employer/dashboard",
};

const text = (value) => (typeof value === "string" ? value.trim() : "");
const newTicketNumber = () =>
  `TKT-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

// ===================================================
// USER ENDPOINTS (student, fresher, professional, employer)
// ===================================================

// POST /api/support-tickets  { subject, category, description }
exports.createTicket = async (req, res, next) => {
  try {
    if (ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Admins can't raise support tickets." });
    }

    const subject = text(req.body.subject);
    const description = text(req.body.description);
    const category = TICKET_CATEGORIES.includes(req.body.category) ? req.body.category : "Other";

    if (!subject) return res.status(400).json({ success: false, field: "subject", message: "Please add a subject." });
    if (subject.length > MAX_SUBJECT) {
      return res.status(400).json({ success: false, field: "subject", message: `Please keep the subject under ${MAX_SUBJECT} characters.` });
    }
    if (!description) {
      return res.status(400).json({ success: false, field: "description", message: "Please describe your issue." });
    }
    if (description.length > MAX_TEXT) {
      return res.status(400).json({ success: false, field: "description", message: `Please keep the description under ${MAX_TEXT} characters.` });
    }

    const recent = await SupportTicket.countDocuments({
      raisedBy: req.user._id,
      createdAt: { $gte: new Date(Date.now() - HOUR_MS) },
    });
    if (recent >= HOURLY_LIMIT) {
      return res.status(429).json({
        success: false,
        code: "TICKET_LIMIT",
        message: "You've raised several tickets in the last hour. Please try again a little later.",
      });
    }

    const ticket = await SupportTicket.create({
      ticketNumber: newTicketNumber(),
      subject,
      category,
      description,
      raisedBy: req.user._id,
      raisedByName: req.user.fullName || "User",
      raisedByEmail: req.user.email || "",
      raisedByType: req.user.userType || req.user.role || "",
    });

    return res.status(201).json({ success: true, message: "Your ticket has been raised. Our team will get back to you soon.", ticket });
  } catch (error) {
    next(error);
  }
};

// GET /api/support-tickets — only the signed-in user's own tickets
exports.getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ raisedBy: req.user._id }).sort({ updatedAt: -1 }).limit(100).lean();
    return res.status(200).json({ success: true, tickets });
  } catch (error) {
    next(error);
  }
};

// GET /api/support-tickets/:id — 404 for anyone but the person who raised it
exports.getMyTicket = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }
    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id }).lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });
    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// POST /api/support-tickets/:id/feedback  { solved: boolean, message? }
// The user's answer to the admin's verdict. "Solved" closes the ticket; "not solved" reopens
// it (a message is required), and the MAX_NOT_SOLVED-th "not solved" expires it.
exports.submitFeedback = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }
    const { solved } = req.body;
    const message = text(req.body.message);
    if (typeof solved !== "boolean") {
      return res.status(400).json({ success: false, field: "solved", message: "Tell us whether your problem was solved." });
    }
    if (message.length > MAX_TEXT) {
      return res.status(400).json({ success: false, field: "message", message: `Please keep the message under ${MAX_TEXT} characters.` });
    }

    const ticket = await SupportTicket.findOne({ _id: req.params.id, raisedBy: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });
    if (!VERDICT_STATUSES.includes(ticket.status)) {
      return res.status(409).json({ success: false, message: "This ticket isn't waiting for your feedback." });
    }

    const author = { authorRole: "user", authorId: req.user._id, authorName: ticket.raisedByName };
    if (solved) {
      ticket.status = "Closed";
      ticket.closedAt = new Date();
      ticket.messages.push({ ...author, event: "confirmed", text: message });
    } else {
      const expires = ticket.notSolvedCount + 1 >= MAX_NOT_SOLVED;
      if (!message && !expires) {
        return res.status(400).json({ success: false, field: "message", message: "Please tell us what is still not working." });
      }
      ticket.notSolvedCount += 1;
      ticket.status = expires ? "Expired" : "Reopened";
      if (expires) ticket.closedAt = new Date();
      ticket.messages.push({ ...author, event: expires ? "expired" : "reopened", text: message });
    }
    await ticket.save();

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// ADMIN ENDPOINTS (SUPER_ADMIN)
// ===================================================

// GET /api/admin/support-tickets?status=&search=
exports.getAdminTickets = async (req, res, next) => {
  try {
    const query = {};
    if (TICKET_STATUSES.includes(req.query.status)) query.status = req.query.status;

    const search = text(req.query.search);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      query.$or = [{ ticketNumber: pattern }, { subject: pattern }, { raisedByName: pattern }, { raisedByEmail: pattern }];
    }

    const [tickets, counts] = await Promise.all([
      SupportTicket.find(query).sort({ updatedAt: -1 }).limit(200).lean(),
      SupportTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const statusCounts = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0]));
    counts.forEach(({ _id, count }) => {
      if (_id in statusCounts) statusCounts[_id] = count;
    });

    return res.status(200).json({ success: true, tickets, statusCounts });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/support-tickets/:id  { status?, message? }
// Replies and/or sets the status, then notifies the person who raised the ticket. A verdict
// (Solved / Not Solved) locks the ticket until the user gives feedback; Closed and Expired
// tickets can't be changed.
exports.updateAdminTicket = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    const status = req.body.status;
    const message = text(req.body.message);
    if (status !== undefined && !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, field: "status", message: "Choose a valid status." });
    }
    if (message.length > MAX_TEXT) {
      return res.status(400).json({ success: false, field: "message", message: `Please keep the message under ${MAX_TEXT} characters.` });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });

    if (FINAL_STATUSES.includes(ticket.status)) {
      return res.status(409).json({ success: false, code: "TICKET_CLOSED", message: `This ticket is ${ticket.status.toLowerCase()} and can't be changed.` });
    }
    if (VERDICT_STATUSES.includes(ticket.status)) {
      return res.status(409).json({
        success: false,
        code: "AWAITING_FEEDBACK",
        message: "This ticket is waiting for the user's feedback. You can reply once they respond.",
      });
    }

    const statusChanged = status !== undefined && status !== ticket.status;
    if (statusChanged && !ADMIN_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, field: "status", message: `Set the status to ${ADMIN_STATUSES.join(", ")}.` });
    }
    if (!statusChanged && !message) {
      return res.status(400).json({ success: false, message: "Change the status or add a message." });
    }

    const isVerdict = statusChanged && VERDICT_STATUSES.includes(status);
    if (statusChanged) {
      ticket.status = status;
      if (isVerdict) ticket.resolvedAt = new Date();
    }
    if (message || isVerdict) {
      ticket.messages.push({
        authorRole: "admin",
        authorId: req.user._id,
        authorName: "E2Job Support",
        text: message,
        event: isVerdict ? (status === "Solved" ? "solved" : "not_solved") : null,
      });
    }
    await ticket.save();

    const title = isVerdict
      ? `Ticket ${ticket.ticketNumber} marked ${ticket.status}: please confirm`
      : statusChanged
        ? `Ticket ${ticket.ticketNumber} is now ${ticket.status}`
        : `New reply on ticket ${ticket.ticketNumber}`;
    const body = [`"${ticket.subject}"`, message, isVerdict && "Let us know whether your problem is solved."]
      .filter(Boolean)
      .join(" — ");
    createNotification({
      recipientId: ticket.raisedBy,
      senderId: req.user._id,
      title,
      message: body,
      notificationType: "SUPPORT_TICKET",
      actionUrl: `${DASHBOARDS[ticket.raisedByType] || DASHBOARDS.student}?tab=support`,
      metadata: { ticketId: ticket._id, ticketStatus: ticket.status },
    });

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
};
