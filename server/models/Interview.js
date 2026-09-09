const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Internship",
      default: null,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Technical Interview Round",
      trim: true,
    },
    roundNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    roundName: {
      type: String,
      default: "Round 1 - Technical Assessment",
      trim: true,
    },
    interviewType: {
      type: String,
      default: "Online",
      trim: true,
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    interviewerName: {
      type: String,
      default: "Hiring Lead",
      trim: true,
    },
    interviewerRole: {
      type: String,
      default: "Technical Interviewer",
      trim: true,
    },
    interviewerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    scheduledDate: {
      type: String,
      required: [true, "Interview date is required"],
    },
    startTime: {
      type: String,
      default: "",
    },
    scheduledTime: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 45,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    meetingMode: {
      type: String,
      default: "Online",
    },
    meetingLink: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    instructions: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "completed",
        "rescheduled",
        "cancelled",
        "no_show",
        "Scheduled",
        "Completed",
        "Cancelled",
        "Rescheduled",
      ],
      default: "scheduled",
      index: true,
    },
    result: {
      type: String,
      enum: ["pending", "passed", "failed", "Pending", "Passed", "Failed"],
      default: "pending",
      index: true,
    },
    scorecard: {
      technicalSkills: { type: Number, min: 0, max: 5, default: 0 },
      problemSolving: { type: Number, min: 0, max: 5, default: 0 },
      communication: { type: Number, min: 0, max: 5, default: 0 },
      roleKnowledge: { type: Number, min: 0, max: 5, default: 0 },
      cultureFit: { type: Number, min: 0, max: 5, default: 0 },
      overallScore: { type: Number, min: 0, max: 5, default: 0 },
      strengths: { type: String, default: "" },
      areasForImprovement: { type: String, default: "" },
      feedback: { type: String, default: "" },
      recommendation: {
        type: String,
        enum: ["Strong Hire", "Hire", "Hold", "No Hire", "Pending", ""],
        default: "Pending",
      },
      submittedAt: { type: Date, default: null },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    feedback: {
      rating: { type: Number, min: 0, max: 5, default: 0 },
      technicalScore: { type: Number, min: 0, max: 5, default: 0 },
      communicationScore: { type: Number, min: 0, max: 5, default: 0 },
      comments: { type: String, default: "" },
      recommendation: {
        type: String,
        default: "Pending",
      },
      submittedAt: { type: Date, default: null },
    },
    interviewerFeedback: {
      type: String,
      default: "",
    },
    candidateFeedback: {
      type: String,
      default: "",
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    rescheduledReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

interviewSchema.index({ applicationId: 1, roundNumber: 1 });
interviewSchema.index({ employerId: 1, status: 1 });
interviewSchema.index({ candidateId: 1, status: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
