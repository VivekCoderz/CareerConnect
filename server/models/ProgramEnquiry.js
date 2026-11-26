// C10: an enquiry about a career programme (C05/C09). It is not an enrolment: the team
// calls the student back. On purpose there is no batch, timing or trainer field; those are
// shared on the call, never stored from the form.
const mongoose = require("mongoose");

// C11: the admin moves an enquiry through these after calling the student.
const ENQUIRY_STATUSES = ["New", "Contacted", "Enrolled", "Not interested"];
// "Open" enquiries block a second one for the same email and programme.
const OPEN_ENQUIRY_STATUSES = ["New", "Contacted"];
const NOTE_MAX = 1000;

// One entry per admin status change, with the admin's note (never shown to the student).
const historySchema = new mongoose.Schema(
  {
    from: { type: String, enum: ENQUIRY_STATUSES, required: true },
    to: { type: String, enum: ENQUIRY_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: NOTE_MAX, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);
const PROGRAM_LEVELS = ["foundation", "professional", "advanced"];
const YEARS_OF_STUDY = ["1", "2", "3", "4", "5", "graduated"];

const programEnquirySchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    programSlug: { type: String, required: true, trim: true },
    // Title at the time of the enquiry, so the team's list still reads well if it changes.
    programTitle: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    countryCode: { type: String, required: true, trim: true, maxlength: 5 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    college: { type: String, required: true, trim: true, maxlength: 150 },
    degree: { type: String, required: true, trim: true, maxlength: 100 },
    yearOfStudy: { type: String, required: true, enum: YEARS_OF_STUDY },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    level: { type: String, required: true, enum: PROGRAM_LEVELS },
    message: { type: String, trim: true, maxlength: 500, default: "" },

    // Terms/Privacy consent, same shape as signup (G05): who agreed to which version, when.
    consent: {
      termsVersion: { type: String, required: true },
      acceptedAt: { type: Date, required: true },
    },

    // Set when the student was logged in.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: { type: String, enum: ENQUIRY_STATUSES, default: "New" },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

// One open enquiry per email per programme; the controller checks first for a friendly
// message, and this index stops two requests that arrive together.
programEnquirySchema.index(
  { email: 1, programSlug: 1 },
  { unique: true, partialFilterExpression: { status: { $in: OPEN_ENQUIRY_STATUSES } } }
);
programEnquirySchema.index({ status: 1, createdAt: -1 });
programEnquirySchema.index({ programSlug: 1, createdAt: -1 });
programEnquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProgramEnquiry", programEnquirySchema);
module.exports.ENQUIRY_STATUSES = ENQUIRY_STATUSES;
module.exports.OPEN_ENQUIRY_STATUSES = OPEN_ENQUIRY_STATUSES;
module.exports.PROGRAM_LEVELS = PROGRAM_LEVELS;
module.exports.YEARS_OF_STUDY = YEARS_OF_STUDY;
module.exports.NOTE_MAX = NOTE_MAX;
