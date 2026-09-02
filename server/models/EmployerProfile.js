const mongoose = require("mongoose");

const leadershipSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    profileImage: { type: String, default: "" },
    linkedinUrl: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Step 1: Basic Company Information
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 150,
    },
    officialEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    mobile: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
      trim: true,
      default: "Information Technology",
    },
    companyType: {
      type: String,
      default: "Private",
    },
    foundedYear: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    tagline: {
      type: String,
      trim: true,
      default: "",
    },

    // Step 2: About Company
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    mission: {
      type: String,
      trim: true,
      default: "",
    },
    vision: {
      type: String,
      trim: true,
      default: "",
    },
    coreValues: {
      type: [String],
      default: [],
    },
    companyStory: {
      type: String,
      trim: true,
      default: "",
    },
    whyWorkWithUs: {
      type: String,
      trim: true,
      default: "",
    },
    companyHighlights: {
      type: [String],
      default: [],
    },

    // Step 3: Company Details
    companySize: {
      type: String,
      default: "11–50",
    },
    headquarters: {
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
    },
    offices: {
      type: [String],
      default: [],
    },
    departments: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      other: { type: String, trim: true, default: "" },
    },

    // Step 4: Team & Culture
    culture: {
      workEnvironment: {
        type: String,
        enum: ["Remote", "Hybrid", "On-site", "remote", "hybrid", "on-site", ""],
        default: "Hybrid",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },
    benefits: {
      type: [String],
      default: [],
    },
    perks: {
      type: [String],
      default: [],
    },
    leadership: [leadershipSchema],
    gallery: {
      type: [String],
      default: [],
    },
    companyStructure: {
      type: String,
      trim: true,
      default: "",
    },

    // Step 5: Hiring Preferences
    hiringPreferences: {
      candidateTypes: {
        type: [String],
        default: ["Students", "Freshers", "Working Professionals", "Interns"],
      },
      skills: {
        type: [String],
        default: [],
      },
      qualifications: {
        type: [String],
        default: [],
      },
      minimumCGPA: {
        type: String,
        default: "",
      },
      specializations: {
        type: [String],
        default: [],
      },
      experienceLevels: {
        type: [String],
        default: [],
      },
      locations: {
        type: [String],
        default: [],
      },
      jobTypes: {
        type: [String],
        default: ["Full-time", "Internship"],
      },
      workModes: {
        type: [String],
        default: ["Hybrid", "On-site"],
      },
      salaryRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
      },
      applicationEmail: {
        type: String,
        trim: true,
        default: "",
      },
    },

    recruiter: {
      name: { type: String, trim: true, default: "" },
      designation: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },

    // Step Progress and Completion
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    profileCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EmployerProfile", employerProfileSchema);
