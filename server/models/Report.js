const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // Primary Category of Report
    category: {
      type: String,
      enum: [
        "Opportunity",
        "Company / Employer",
        "User / Profile",
        "Application",
        "Interview",
        "Spam / Fraud",
        "Technical Issue",
        "Other",
      ],
      default: "Opportunity",
      index: true,
    },

    // Legacy/display report type support
    reportType: {
      type: String,
      default: "Opportunity",
      index: true,
    },

    // Moderation Status Lifecycle
    status: {
      type: String,
      enum: ["Open", "Investigating", "Under Review", "Resolved", "Dismissed"],
      default: "Open",
      index: true,
    },

    // Priority Level
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
    },

    // Title / Subject
    title: {
      type: String,
      default: "",
      trim: true,
    },

    // Complaint Details / Description
    details: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Submitter Reference
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reportedByName: {
      type: String,
      default: "Anonymous User",
    },

    // Associated Tenant / Company Reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    // Deep Related Entity References
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "opportunityModel",
      default: null,
      index: true,
    },
    opportunityModel: {
      type: String,
      enum: ["Job", "Internship"],
      default: "Job",
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
      index: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      default: null,
      index: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Legacy Target Tracking
    targetType: {
      type: String,
      default: "Opportunity",
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetTitle: {
      type: String,
      default: "",
    },

    // Internal Admin Notes Timeline
    adminNotes: [
      {
        note: { type: String, required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        authorName: { type: String, default: "Admin" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Resolution Tracking
    resolutionNote: {
      type: String,
      default: "",
      trim: true,
    },
    resolutionNotes: {
      type: String,
      default: "",
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // Dismissal Tracking
    dismissalReason: {
      type: String,
      default: "",
      trim: true,
    },
    dismissedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ companyId: 1, status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
