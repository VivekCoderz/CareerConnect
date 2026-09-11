const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "My Resume",
      trim: true,
    },
    rawData: {
      type: Object,
      required: true,
    },
    generatedData: {
      type: Object,
      default: null,
    },
    selectedTemplate: {
      type: String,
      default: "classic",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    targetJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },
    targetInternshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      default: null,
      index: true,
    },
    opportunityType: {
      type: String,
      enum: ["Job", "Internship", null],
      default: null,
    },
    targetOpportunityTitle: {
      type: String,
      default: "",
    },
    isTailored: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

resumeSchema.index({ user: 1, createdAt: -1 });

const Resume = mongoose.model("Resume", resumeSchema);

// Safely drop old unique user_1 index if it exists in MongoDB
Resume.collection?.dropIndex("user_1").catch(() => {});

module.exports = Resume;