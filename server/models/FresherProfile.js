const mongoose = require("mongoose");

// ======================================================
// EDUCATION SUB-SCHEMA
// ======================================================
const educationSchema = new mongoose.Schema(
  {
    qualificationType: {
      type: String,
      enum: ["B.Tech", "B.E.", "BCA", "MCA", "B.Sc", "M.Sc", "Diploma", "10th", "12th", "Other"],
      default: "B.Tech",
    },
    degree: {
      type: String,
      required: [true, "Degree / Certificate title is required"],
      trim: true,
      maxlength: [120, "Degree name cannot exceed 120 characters"],
    },
    specialization: {
      type: String,
      trim: true,
      maxlength: [100, "Specialization cannot exceed 100 characters"],
    },
    institution: {
      type: String,
      required: [true, "Institution / College name is required"],
      trim: true,
      maxlength: [150, "Institution name cannot exceed 150 characters"],
    },
    university: {
      type: String,
      trim: true,
      maxlength: [150, "University or board name cannot exceed 150 characters"],
    },
    graduationYear: {
      type: Number,
      min: [1970, "Invalid graduation year"],
      max: [2035, "Invalid graduation year"],
    },
    percentageOrCgpa: {
      type: String,
      trim: true,
      maxlength: [20, "Percentage / CGPA cannot exceed 20 characters"],
    },
    academicGrade: {
      type: String,
      trim: true,
      maxlength: [20, "Academic grade cannot exceed 20 characters"],
    },
    backlogs: {
      type: Number,
      default: 0,
      min: [0, "Backlogs cannot be negative"],
    },
    academicAchievements: {
      type: String,
      trim: true,
      maxlength: [500, "Academic achievements cannot exceed 500 characters"],
    },
    isHighest: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ======================================================
// PROJECT SUB-SCHEMA
// ======================================================
const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [150, "Project title cannot exceed 150 characters"],
    },
    projectType: {
      type: String,
      enum: ["Academic", "Personal", "Freelance", "Hackathon", "Open Source"],
      default: "Personal",
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxlength: [2000, "Project description cannot exceed 2000 characters"],
    },
    technologies: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Technology name cannot exceed 50 characters"],
      },
    ],
    role: {
      type: String,
      trim: true,
      maxlength: [100, "Role cannot exceed 100 characters"],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    liveUrl: {
      type: String,
      trim: true,
    },
    projectImage: {
      type: String,
      trim: true,
    },
    keyFeatures: [
      {
        type: String,
        trim: true,
        maxlength: [250, "Feature text cannot exceed 250 characters"],
      },
    ],
    challenges: {
      type: String,
      trim: true,
      maxlength: [1000, "Challenges cannot exceed 1000 characters"],
    },
    achievements: {
      type: String,
      trim: true,
      maxlength: [500, "Achievements cannot exceed 500 characters"],
    },
  },
  { _id: true }
);

// ======================================================
// INTERNSHIP SUB-SCHEMA
// ======================================================
const internshipSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },
    role: {
      type: String,
      required: [true, "Internship role is required"],
      trim: true,
      maxlength: [100, "Role cannot exceed 100 characters"],
    },
    internshipType: {
      type: String,
      enum: ["Technical", "Non-Technical", "Research", "Graduate Trainee"],
      default: "Technical",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    currentlyWorking: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "On-site"],
      default: "Remote",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1500, "Description cannot exceed 1500 characters"],
    },
    technologiesUsed: [
      {
        type: String,
        trim: true,
      },
    ],
    responsibilities: {
      type: String,
      trim: true,
      maxlength: [1000, "Responsibilities cannot exceed 1000 characters"],
    },
    achievements: {
      type: String,
      trim: true,
      maxlength: [500, "Achievements cannot exceed 500 characters"],
    },
    certificateUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// CERTIFICATION SUB-SCHEMA
// ======================================================
const certificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Certification name is required"],
      trim: true,
      maxlength: [150, "Certification name cannot exceed 150 characters"],
    },
    issuingOrganization: {
      type: String,
      required: [true, "Issuing organization is required"],
      trim: true,
      maxlength: [150, "Organization name cannot exceed 150 characters"],
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: [100, "Credential ID cannot exceed 100 characters"],
    },
    credentialUrl: {
      type: String,
      trim: true,
    },
    certificateUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// ACHIEVEMENT SUB-SCHEMA
// ======================================================
const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Achievement title is required"],
      trim: true,
      maxlength: [150, "Achievement title cannot exceed 150 characters"],
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [150, "Organization name cannot exceed 150 characters"],
    },
    date: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      enum: [
        "Hackathon",
        "Coding Competition",
        "Academic Award",
        "Scholarship",
        "Open Source Contribution",
        "Competition",
        "Leadership",
        "Publication",
        "Other",
      ],
      default: "Hackathon",
    },
    achievementUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// CODING PROFILE SUB-SCHEMA
// ======================================================
const codingProfileSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["LeetCode", "HackerRank", "CodeChef", "Codeforces", "GeeksforGeeks", "GitHub", "Other"],
      required: true,
    },
    username: {
      type: String,
      trim: true,
      maxlength: [100, "Username cannot exceed 100 characters"],
    },
    profileUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// SKILL ITEM SUB-SCHEMA WITH PROFICIENCY
// ======================================================
const skillItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [60, "Skill name cannot exceed 60 characters"],
    },
    proficiency: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Intermediate",
    },
  },
  { _id: false }
);

// ======================================================
// FRESHER PROFILE SCHEMA
// ======================================================
const fresherProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },

    // ==================================================
    // PROFESSIONAL IDENTITY
    // ==================================================
    professionalHeadline: {
      type: String,
      trim: true,
      maxlength: [180, "Headline cannot exceed 180 characters"],
      default: "",
    },

    careerObjective: {
      type: String,
      trim: true,
      maxlength: [600, "Career objective cannot exceed 600 characters"],
      default: "",
    },

    targetRole: {
      type: String,
      trim: true,
      maxlength: [100, "Target role cannot exceed 100 characters"],
      default: "",
    },

    targetIndustry: {
      type: String,
      trim: true,
      maxlength: [100, "Target industry cannot exceed 100 characters"],
      default: "Information Technology",
    },

    // ==================================================
    // PERSONAL & COMMON OVERRIDES (Synched with User)
    // ==================================================
    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say", ""],
      default: "",
    },

    location: {
      city: {
        type: String,
        trim: true,
        default: "",
        maxlength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        trim: true,
        default: "",
        maxlength: [100, "State cannot exceed 100 characters"],
      },
      country: {
        type: String,
        default: "India",
        trim: true,
        maxlength: [100, "Country cannot exceed 100 characters"],
      },
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [600, "Bio cannot exceed 600 characters"],
    },

    socialLinks: {
      linkedin: { type: String, default: "", trim: true },
      github: { type: String, default: "", trim: true },
      portfolio: { type: String, default: "", trim: true },
    },

    // ==================================================
    // EDUCATION QUALIFICATION
    // ==================================================
    education: {
      type: [educationSchema],
      default: [],
    },

    // ==================================================
    // SKILLS CATEGORIZATION
    // ==================================================
    skills: {
      programmingLanguages: {
        type: [skillItemSchema],
        default: [],
      },
      frameworks: {
        type: [skillItemSchema],
        default: [],
      },
      databases: {
        type: [skillItemSchema],
        default: [],
      },
      tools: {
        type: [skillItemSchema],
        default: [],
      },
      softSkills: {
        type: [skillItemSchema],
        default: [],
      },
      technical: {
        type: [skillItemSchema],
        default: [],
      },
    },

    // ==================================================
    // PROJECTS & INTERNSHIPS
    // ==================================================
    projects: {
      type: [projectSchema],
      default: [],
    },

    internships: {
      type: [internshipSchema],
      default: [],
    },

    // ==================================================
    // CERTIFICATIONS & ACHIEVEMENTS
    // ==================================================
    certifications: {
      type: [certificationSchema],
      default: [],
    },

    achievements: {
      type: [achievementSchema],
      default: [],
    },

    codingProfiles: {
      type: [codingProfileSchema],
      default: [],
    },

    // ==================================================
    // JOB PREFERENCES
    // ==================================================
    jobPreferences: {
      preferredRoles: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Role cannot exceed 100 characters"],
        },
      ],
      employmentTypes: [
        {
          type: String,
          enum: ["Full-time", "Internship", "Contract", "Freelance", "Apprenticeship", "Graduate Trainee"],
        },
      ],
      preferredLocations: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Location cannot exceed 100 characters"],
        },
      ],
      workMode: [
        {
          type: String,
          enum: ["On-site", "Hybrid", "Remote", "Any"],
        },
      ],
      expectedSalary: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        currency: { type: String, default: "INR (LPA)" },
      },
    },

    // ==================================================
    // AVAILABILITY & WORK AUTHORIZATION
    // ==================================================
    availability: {
      status: {
        type: String,
        enum: ["Immediately Available", "Available Soon (15-30 Days)", "Available After Notice Period", "Not Looking"],
        default: "Immediately Available",
      },
      expectedJoiningDate: {
        type: Date,
      },
      currentEmploymentStatus: {
        type: String,
        enum: ["Unemployed", "Looking for Job", "Intern", "Freelancing", "Other"],
        default: "Looking for Job",
      },
    },

    workAuthorization: {
      status: {
        type: String,
        default: "Authorized to work in India",
        trim: true,
      },
      willingToRelocate: {
        type: Boolean,
        default: true,
      },
      willingToWorkRemote: {
        type: Boolean,
        default: true,
      },
      preferredCountries: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // ==================================================
    // RESUME & PORTFOLIO
    // ==================================================
    resume: {
      resumeUrl: {
        type: String,
        default: "",
        trim: true,
      },
      resumeName: {
        type: String,
        default: "",
        trim: true,
      },
      uploadedAt: {
        type: Date,
      },
      isGenerated: {
        type: Boolean,
        default: false,
      },
    },

    // ==================================================
    // PROFILE VISIBILITY & COMPLETION STATUS
    // ==================================================
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified",
    },

    profileCompletion: {
      type: Number,
      default: 0,
      min: [0, "Profile completion cannot be below 0"],
      max: [100, "Profile completion cannot exceed 100"],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    jobReadinessScore: {
      type: Number,
      default: 0,
      min: [0, "Readiness score cannot be below 0"],
      max: [100, "Readiness score cannot exceed 100"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching & matching
fresherProfileSchema.index({ targetRole: 1 });
fresherProfileSchema.index({ "jobPreferences.preferredRoles": 1 });
fresherProfileSchema.index({ "jobPreferences.preferredLocations": 1 });
fresherProfileSchema.index({ "location.city": 1 });
fresherProfileSchema.index({ profileVisibility: 1 });

module.exports = mongoose.model("FresherProfile", fresherProfileSchema);
