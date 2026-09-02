const mongoose = require("mongoose");

const MarketSnapshotSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: String,
      default: "India / Remote",
      index: true,
    },
    experienceBand: {
      type: String,
      default: "5+ Years",
    },
    period: {
      type: String,
      default: "30D", // "7D", "30D", "90D"
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    activeJobs: {
      type: Number,
      default: 0,
    },
    companiesHiring: {
      type: Number,
      default: 0,
    },
    previousPeriodJobs: {
      type: Number,
      default: 0,
    },
    demandTrendPercentage: {
      type: Number,
      default: 0,
    },
    demandTrendDirection: {
      type: String,
      enum: ["increasing", "stable", "decreasing"],
      default: "increasing",
    },
    salaryData: {
      min: { type: Number, default: 35 },
      max: { type: Number, default: 52 },
      median: { type: Number, default: 42 },
      currency: { type: String, default: "INR (LPA)" },
      sampleSize: { type: Number, default: 86 },
      isAvailable: { type: Boolean, default: true },
    },
    historicalData: [
      {
        date: { type: String, required: true },
        activeJobs: { type: Number, required: true },
      },
    ],
    topCompanies: [
      {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        openRoles: { type: Number, default: 0 },
        locations: [String],
        matchPercentage: { type: Number, default: 90 },
        hiringTrend: { type: String, default: "↑ 12%" },
        logoText: { type: String, default: "C" },
        overview: { type: String, default: "" },
        topSkills: [String],
        listedSalaryRange: { type: String, default: "" },
        careerPageUrl: { type: String, default: "" },
        matchingOpenings: [
          {
            title: String,
            location: String,
            type: String,
            experience: String,
            salary: String,
            url: String,
            skills: [String],
          },
        ],
      },
    ],
    skillsDistribution: [
      {
        name: { type: String, required: true },
        percentage: { type: Number, required: true },
        category: { type: String, default: "Technical" },
        importance: { type: String, default: "High" },
      },
    ],
    locationBreakdown: [
      {
        location: { type: String, required: true },
        percentage: { type: Number, required: true },
        activeJobs: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketSnapshot", MarketSnapshotSchema);
