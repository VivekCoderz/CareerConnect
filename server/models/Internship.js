const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    companyName: { type: String, default: "", trim: true },
    title: {
      type: String,
      required: [true, "Internship title is required"],
      trim: true,
      maxlength: 150,
    },
    department: { type: String, default: "General", trim: true },
    // No defaults for category, city or education (see Job).
    category: { type: String, default: "", trim: true, index: true },
    subCategory: { type: String, default: "", trim: true },
    workMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Hybrid",
      index: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    city: { type: String, default: "", trim: true, index: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "India", trim: true, index: true },
    isPaid: { type: Boolean, default: true, index: true },
    hasJobOffer: { type: Boolean, default: false, index: true },
    isInternational: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    // Empty when the employer didn't give one (older internships stored "Not disclosed").
    stipend: { type: String, default: "", trim: true },
    stipendAmount: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },
    duration: { type: String, default: "", trim: true },
    openings: { type: Number, default: 1, min: 1 },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    responsibilities: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    education: {
      type: String,
      default: "",
    },
    eligibility: { type: String, default: "", trim: true },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Published", "Paused", "Closed", "Rejected"],
      // Listings must be approved before they are public; publishers set status explicitly.
      default: "Pending Approval",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    // "auto" when published by the autoApproveJobs setting (approvedBy stays null).
    approvalMethod: {
      type: String,
      enum: ["admin", "auto", "legacy", null],
      default: null,
    },
    // Why the platform closed the listing (deadline passed, its employer was rejected, or its
    // company was deactivated or deleted).
    closedReason: {
      type: String,
      enum: ["expired", "employer_rejected", "company_inactive", null],
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    adminNote: {
      type: String,
      default: null,
    },
    viewsCount: { type: Number, default: 0 },
    applicantsCount: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["CareerConnect", "LinkedIn", "Internshala", "Remotive", "Arbeitnow", "GU Drives", "Jooble", "Other"],
      default: "CareerConnect", // stored value for own listings (old brand); shown as E2Job
      index: true,
    },
    isExternal: { type: Boolean, default: false, index: true },
    externalId: { type: String, default: null },
    applyUrl: { type: String, default: "", trim: true },
    // Feed credit line and last time the scheduled feed sync saw this listing (external only)
    attribution: { type: String, default: "", trim: true },
    lastSyncedAt: { type: Date, default: null },

    // ---------- Dynamic Recruitment Pipeline Stages ----------
    recruitmentStages: [
      {
        name: {
          type: String,
          required: [true, "Stage name is required"],
          trim: true,
        },
        type: {
          type: String,
          enum: [
            "Resume Screening",
            "Online Test",
            "Coding Test",
            "Aptitude Test",
            "Technical Interview",
            "HR Interview",
            "Group Discussion",
            "Final Interview",
            "Custom",
          ],
          default: "Resume Screening",
        },
        order: {
          type: Number,
          default: 0,
        },
        description: {
          type: String,
          default: "",
          trim: true,
        },
        configuration: {
          interviewType: {
            type: String,
            enum: ["Online", "Offline", ""],
            default: "Online",
          },
          durationMinutes: {
            type: Number,
            default: 45,
          },
          instructions: {
            type: String,
            default: "",
            trim: true,
          },
          testLink: {
            type: String,
            default: "",
            trim: true,
          },
          passingCriteria: {
            type: String,
            default: "",
            trim: true,
          },
          deadlineDays: {
            type: Number,
            default: 0,
          },
        },
      },
    ],
  },
  { timestamps: true }
);

internshipSchema.index({ employerId: 1, status: 1 });
// Expiry sweep and public "still open" filter
internshipSchema.index({ status: 1, deadline: 1 });
// Public internship list: status filter + newest-first sort
internshipSchema.index({ status: 1, createdAt: -1 });
internshipSchema.index({ status: 1, isExternal: 1 });
internshipSchema.index({ requiredSkills: 1 });
internshipSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } }
);

module.exports = mongoose.model("Internship", internshipSchema);