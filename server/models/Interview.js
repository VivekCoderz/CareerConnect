const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
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
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
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
    preparationGuidelines: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "ongoing",
        "completed",
        "rescheduled",
        "cancelled",
        "missed",
        "no_show",
        "draft",
        "Scheduled",
        "Confirmed",
        "Ongoing",
        "Completed",
        "Cancelled",
        "Missed",
        "Rescheduled",
        "Draft",
      ],
      default: "scheduled",
      index: true,
    },
    result: {
      type: String,
      enum: [
        "pending",
        "passed",
        "failed",
        "selected",
        "rejected",
        "next_round",
        "Pending",
        "Passed",
        "Failed",
        "Selected",
        "Rejected",
        "Next Round",
      ],
      default: "pending",
      index: true,
    },
    scorecard: {
      technicalSkills: { type: Number, min: 0, max: 5, default: 0 },
      problemSolving: { type: Number, min: 0, max: 5, default: 0 },
      communication: { type: Number, min: 0, max: 5, default: 0 },
      roleKnowledge: { type: Number, min: 0, max: 5, default: 0 },
      cultureFit: { type: Number, min: 0, max: 5, default: 0 },
      overallPerformance: { type: Number, min: 0, max: 5, default: 0 },
      overallScore: { type: Number, min: 0, max: 5, default: 0 },
      strengths: { type: String, default: "" },
      areasForImprovement: { type: String, default: "" },
      feedback: { type: String, default: "" },
      overallFeedback: { type: String, default: "" },
      recommendation: {
        type: String,
        enum: ["Strong Hire", "Hire", "Hold", "No Hire", "Pending", "Selected", "Rejected", "Next Round", ""],
        default: "Pending",
      },
      submittedAt: { type: Date, default: null },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    feedback: {
      rating: { type: Number, min: 0, max: 5, default: 0 },
      technicalScore: { type: Number, min: 0, max: 5, default: 0 },
      communicationScore: { type: Number, min: 0, max: 5, default: 0 },
      problemSolvingScore: { type: Number, min: 0, max: 5, default: 0 },
      overallPerformance: { type: Number, min: 0, max: 5, default: 0 },
      overallFeedback: { type: String, default: "" },
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
    // Cancellation tracking
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    cancellationMessage: {
      type: String,
      default: "",
    },
    // Rescheduling tracking
    rescheduleCount: {
      type: Number,
      default: 0,
    },
    rescheduledAt: {
      type: Date,
      default: null,
    },
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    previousDate: {
      type: String,
      default: "",
    },
    previousStartTime: {
      type: String,
      default: "",
    },
    newDate: {
      type: String,
      default: "",
    },
    newStartTime: {
      type: String,
      default: "",
    },
    rescheduledReason: {
      type: String,
      default: "",
    },
    previousSchedule: {
      scheduledDate: { type: String, default: "" },
      startTime: { type: String, default: "" },
      endTime: { type: String, default: "" },
      duration: { type: Number, default: 45 },
      meetingMode: { type: String, default: "" },
      meetingLink: { type: String, default: "" },
    },
    rescheduleHistory: [
      {
        previousDate: String,
        previousStartTime: String,
        previousEndTime: String,
        previousDuration: Number,
        newDate: String,
        newStartTime: String,
        newEndTime: String,
        newDuration: Number,
        meetingMode: String,
        meetingLink: String,
        reason: String,
        rescheduledAt: { type: Date, default: Date.now },
        rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

interviewSchema.index({ applicationId: 1, roundNumber: 1 });
interviewSchema.index({ employerId: 1, status: 1 });
interviewSchema.index({ candidateId: 1, status: 1 });
interviewSchema.index({ companyId: 1, status: 1, scheduledAt: 1 });

// Ensure scheduledAt is populated from scheduledDate + startTime if not explicitly provided
interviewSchema.pre("save", function () {
  if (!this.scheduledAt && this.scheduledDate) {
    try {
      const { getInterviewDateTimes } = require("../utils/interviewTimeUtils");
      const times = getInterviewDateTimes(this);
      if (times?.startDateTime) {
        this.scheduledAt = times.startDateTime;
      } else {
        const parsed = new Date(this.scheduledDate);
        if (!isNaN(parsed.getTime())) {
          this.scheduledAt = parsed;
        }
      }
    } catch {
      const parsed = new Date(this.scheduledDate);
      if (!isNaN(parsed.getTime())) {
        this.scheduledAt = parsed;
      }
    }
  }
});

module.exports = mongoose.model("Interview", interviewSchema);
