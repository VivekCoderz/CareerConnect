const mongoose = require("mongoose");

const jobOfferSchema = new mongoose.Schema(
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
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },
    department: {
      type: String,
      default: "Engineering",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    salary: {
      type: Number,
      required: [true, "Annual / Monthly CTC is required"],
    },
    salaryPeriod: {
      type: String,
      enum: ["Per Annum (LPA)", "Per Month", "Stipend / Month"],
      default: "Per Annum (LPA)",
    },
    currency: {
      type: String,
      default: "INR (₹)",
    },
    joiningDate: {
      type: Date,
      required: [true, "Expected joining date is required"],
    },
    location: {
      type: String,
      default: "Gurugram / Hybrid",
    },
    benefits: {
      type: [String],
      default: ["Health Insurance", "Paid Leaves", "Learning Allowance", "Performance Bonus"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Offer expiry date is required"],
    },
    additionalTerms: {
      type: String,
      default: "",
    },
    offerLetterUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
      default: "Sent",
      index: true,
    },
    candidateResponseNotes: {
      type: String,
      default: "",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("JobOffer", jobOfferSchema);
