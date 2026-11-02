const mongoose = require("mongoose");

const careerGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: [true, "Target role is required"],
      trim: true,
    },
    targetIndustry: {
      type: String,
      default: "",
      trim: true,
    },
    targetSalary: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR (₹)",
    },
    targetTimeline: {
      type: String,
      enum: ["1 Month", "3 Months", "6 Months", "1 Year", "2+ Years"],
      default: "6 Months",
    },
    preferredLocations: {
      type: [String],
      default: [],
    },
    preferredWorkModes: {
      type: [String],
      enum: ["Remote", "Hybrid", "On-site"],
      default: ["Remote", "Hybrid"],
    },
    targetSkillsToLearn: [
      {
        skill: { type: String, trim: true },
        status: { type: String, enum: ["To Learn", "In Progress", "Mastered"], default: "To Learn" },
        progress: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Achieved", "Paused", "Archived"],
      default: "Active",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CareerGoal", careerGoalSchema);
