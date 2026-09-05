const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
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

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null,
      index: true,
    },

    opportunityType: {
      type: String,
      enum: ["Job", "Internship"],
      required: true,
      index: true,
    },

    opportunityTitle: {
      type: String,
      default: "",
    },

    companyName: {
      type: String,
      default: "",
    },

    coverNote: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Under Review",
        "Shortlisted",
        "Interview",
        "Offered",
        "Hired",
        "Rejected",
        "Withdrawn",
      ],
      default: "Applied",
      index: true,
    },

    stage: {
      type: String,
      default: "Applied",
    },

    notes: [
      {
        text: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isExternal: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

applicationSchema.index(
  { candidateId: 1, internshipId: 1 },
  {
    unique: true,
    partialFilterExpression: { opportunityType: "Internship" },
  }
);

applicationSchema.index(
  { candidateId: 1, jobId: 1 },
  {
    unique: true,
    partialFilterExpression: { opportunityType: "Job" },
  }
);

applicationSchema.pre("validate", function (next) {
  if (this.opportunityType === "Internship" && !this.internshipId) {
    return next(
      new Error("internshipId is required for Internship applications")
    );
  }

  if (this.opportunityType === "Job" && !this.jobId) {
    return next(
      new Error("jobId is required for Job applications")
    );
  }

  next();
});

module.exports = mongoose.model("Application", applicationSchema);