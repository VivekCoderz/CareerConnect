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
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    title: {
      type: String,
      default: "Technical Interview",
      trim: true,
    },
    interviewType: {
      type: String,
      enum: ["Technical", "HR Round", "Managerial", "Coding Challenge", "Cultural Fit"],
      default: "Technical",
    },
    interviewerName: {
      type: String,
      default: "Recruiter Lead",
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
    scheduledTime: {
      type: String,
      required: [true, "Interview time is required"],
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    meetingMode: {
      type: String,
      enum: ["Google Meet", "Zoom", "Microsoft Teams", "In-Person"],
      default: "Google Meet",
    },
    meetingLink: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    feedback: {
      rating: { type: Number, min: 0, max: 5, default: 0 },
      technicalScore: { type: Number, min: 0, max: 5, default: 0 },
      communicationScore: { type: Number, min: 0, max: 5, default: 0 },
      comments: { type: String, default: "" },
      recommendation: {
        type: String,
        enum: ["Strong Hire", "Hire", "Hold", "Reject", "Pending"],
        default: "Pending",
      },
      submittedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interview", interviewSchema);
