const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: [
        "Fake opportunity",
        "Spam",
        "Inappropriate content",
        "Fraud",
        "Company complaint",
        "User complaint",
        "Suspicious activity",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Open", "Under Review", "Resolved", "Dismissed"],
      default: "Open",
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["Opportunity", "User", "Company", "Application", "Platform"],
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
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reportedByName: {
      type: String,
      default: "Anonymous User",
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    resolutionNotes: {
      type: String,
      default: "",
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
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
