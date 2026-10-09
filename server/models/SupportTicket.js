const mongoose = require("mongoose");

// A help request raised by a student, fresher, professional or employer. Platform admins see
// every ticket, reply, and give a final verdict (Solved / Not Solved). The ticket then waits for
// the user's feedback: confirming closes it; saying it isn't solved reopens it, up to
// MAX_NOT_SOLVED times, after which it expires and the user must raise a new ticket.
const TICKET_CATEGORIES = ["Account", "Profile", "Jobs & Internships", "Applications", "Interviews", "Payments", "Technical Issue", "Other"];
const TICKET_STATUSES = ["Open", "In Progress", "Reopened", "Solved", "Not Solved", "Closed", "Expired"];
// Admin verdicts: the ticket is locked for the admin until the user gives feedback.
const VERDICT_STATUSES = ["Solved", "Not Solved"];
// Statuses an admin can set.
const ADMIN_STATUSES = ["In Progress", ...VERDICT_STATUSES];
const FINAL_STATUSES = ["Closed", "Expired"];
// The user's "not solved" feedback reopens the ticket; the MAX_NOT_SOLVED-th one expires it instead.
const MAX_NOT_SOLVED = 3;

const ticketMessageSchema = new mongoose.Schema(
  {
    authorRole: { type: String, enum: ["user", "admin"], required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, default: "" },
    text: { type: String, default: "", trim: true },
    // Set on the message that recorded a status change.
    event: { type: String, enum: ["solved", "not_solved", "confirmed", "reopened", "expired", null], default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: "Other" },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: TICKET_STATUSES, default: "Open", index: true },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Copied at creation so the admin list needs no lookup.
    raisedByName: { type: String, default: "" },
    raisedByEmail: { type: String, default: "" },
    raisedByType: { type: String, default: "" },

    messages: [ticketMessageSchema],
    // When the admin last gave a verdict.
    resolvedAt: { type: Date, default: null },
    // How many times the user said the verdict didn't solve their problem.
    notSolvedCount: { type: Number, default: 0 },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supportTicketSchema.index({ raisedBy: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
module.exports.TICKET_CATEGORIES = TICKET_CATEGORIES;
module.exports.TICKET_STATUSES = TICKET_STATUSES;
module.exports.VERDICT_STATUSES = VERDICT_STATUSES;
module.exports.ADMIN_STATUSES = ADMIN_STATUSES;
module.exports.FINAL_STATUSES = FINAL_STATUSES;
module.exports.MAX_NOT_SOLVED = MAX_NOT_SOLVED;
