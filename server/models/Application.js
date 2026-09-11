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
      maxlength: 5000,
    },

    coverLetter: {
      type: String,
      default: "",
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    studentName: {
      type: String,
      default: "",
    },

    studentEmail: {
      type: String,
      default: "",
    },

    studentPhone: {
      type: String,
      default: "",
    },

    education: {
      type: String,
      default: "",
    },

    skills: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    experience: {
      type: String,
      default: "",
    },

    portfolioUrl: {
      type: String,
      default: "",
    },

    applicationData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Approved",
        "Under Review",
        "Shortlisted",
        "Interview",
        "Interview Scheduled",
        "Interview Completed",
        "Selected",
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

    stageHistory: [
      {
        stage: String,
        notes: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    matchScore: {
      type: mongoose.Schema.Types.Mixed,
    },

    matchingDetails: {
      type: mongoose.Schema.Types.Mixed,
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

applicationSchema.pre("validate", function () {
  if (this.opportunityType === "Internship" && !this.internshipId) {
    throw new Error("internshipId is required for Internship applications");
  }

  if (this.opportunityType === "Job" && !this.jobId) {
    throw new Error("jobId is required for Job applications");
  }
});

module.exports = mongoose.model("Application", applicationSchema);