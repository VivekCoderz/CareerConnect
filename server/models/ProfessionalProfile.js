const mongoose = require("mongoose");

// ======================================================
// WORK EXPERIENCE SUB-SCHEMA
// ======================================================
const workExperienceSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },
    jobTitle: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [120, "Job title cannot exceed 120 characters"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Freelance", "Consultant", "Co-founder"],
      default: "Full-time",
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, "Industry cannot exceed 100 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    workMode: {
      type: String,
      enum: ["Remote", "Hybrid", "On-site"],
      default: "Hybrid",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
    },
    currentlyWorking: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    responsibilities: {
      type: String,
      trim: true,
      maxlength: [1500, "Responsibilities cannot exceed 1500 characters"],
    },
    achievements: {
      type: String,
      trim: true,
      maxlength: [1000, "Achievements cannot exceed 1000 characters"],
    },
    technologiesUsed: [
      {
        type: String,
        trim: true,
      },
    ],
    teamSize: {
      type: Number,
      default: 0,
      min: [0, "Team size cannot be negative"],
    },
    managerialRole: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ======================================================
// PROJECT SUB-SCHEMA
// ======================================================
const professionalProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [150, "Project name cannot exceed 150 characters"],
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [150, "Organization name cannot exceed 150 characters"],
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, "Role cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    technologies: [
      {
        type: String,
        trim: true,
      },
    ],
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    responsibilities: {
      type: String,
      trim: true,
      maxlength: [1000, "Responsibilities cannot exceed 1000 characters"],
    },
    businessImpact: {
      type: String,
      trim: true,
      maxlength: [1000, "Business impact cannot exceed 1000 characters"],
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
  },
  { _id: true }
);

// ======================================================
// LEADERSHIP SUB-SCHEMA
// ======================================================
const leadershipSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: [true, "Leadership role is required"],
      trim: true,
      maxlength: [120, "Role cannot exceed 120 characters"],
    },
    teamSize: {
      type: Number,
      default: 0,
      min: [0, "Team size cannot be negative"],
    },
    responsibilities: {
      type: String,
      trim: true,
      maxlength: [1000, "Responsibilities cannot exceed 1000 characters"],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    currentlyLeading: {
      type: Boolean,
      default: false,
    },
    achievements: {
      type: String,
      trim: true,
      maxlength: [1000, "Achievements cannot exceed 1000 characters"],
    },
  },
  { _id: true }
);

// ======================================================
// CERTIFICATION SUB-SCHEMA
// ======================================================
const professionalCertificationSchema = new mongoose.Schema(
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
    credentialId: {
      type: String,
      trim: true,
      maxlength: [100, "Credential ID cannot exceed 100 characters"],
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
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
// PROFESSIONAL DEVELOPMENT SUB-SCHEMA
// ======================================================
const professionalDevelopmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    type: {
      type: String,
      enum: ["Course", "Workshop", "Conference", "Bootcamp", "Executive Training", "Learning Goal"],
      default: "Course",
    },
    providerOrHost: {
      type: String,
      trim: true,
      maxlength: [150, "Provider cannot exceed 150 characters"],
    },
    completionDate: {
      type: Date,
    },
    skillsGained: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: true }
);

// ======================================================
// EDUCATION SUB-SCHEMA
// ======================================================
const educationSchema = new mongoose.Schema(
  {
    qualificationType: {
      type: String,
      enum: ["B.Tech", "B.E.", "BCA", "MCA", "B.Sc", "M.Sc", "M.Tech", "MBA", "Diploma", "Other"],
      default: "B.Tech",
    },
    degree: {
      type: String,
      required: [true, "Degree is required"],
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
      required: [true, "Institution name is required"],
      trim: true,
      maxlength: [150, "Institution name cannot exceed 150 characters"],
    },
    graduationYear: {
      type: Number,
      min: [1970, "Invalid graduation year"],
      max: [2035, "Invalid graduation year"],
    },
    percentageOrCgpa: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// SKILL ITEM SUB-SCHEMA WITH EXPERT PROFICIENCY
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
      enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      default: "Advanced",
    },
    yearsOfExperience: {
      type: Number,
      default: 1,
      min: [0, "Experience cannot be negative"],
    },
  },
  { _id: false }
);

// ======================================================
// ACHIEVEMENT SUB-SCHEMA
// ======================================================
const professionalAchievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Achievement title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [150, "Organization cannot exceed 150 characters"],
    },
    date: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    impact: {
      type: String,
      trim: true,
      maxlength: [1000, "Impact cannot exceed 1000 characters"],
    },
    achievementUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ======================================================
// WORKING PROFESSIONAL PROFILE SCHEMA
// ======================================================
const professionalProfileSchema = new mongoose.Schema(
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
      maxlength: [200, "Headline cannot exceed 200 characters"],
      default: "",
    },

    professionalSummary: {
      type: String,
      trim: true,
      maxlength: [1200, "Summary cannot exceed 1200 characters"],
      default: "",
    },

    careerSpecialization: {
      type: String,
      trim: true,
      maxlength: [100, "Specialization cannot exceed 100 characters"],
      default: "Full Stack & Cloud Architecture",
    },

    currentLevel: {
      type: String,
      enum: ["Mid-Level", "Senior", "Lead / Staff", "Principal", "Manager / Director", "Executive (VP/CTO)"],
      default: "Senior",
    },

    targetLevel: {
      type: String,
      enum: ["Senior", "Lead / Staff", "Principal", "Manager / Director", "Executive (VP/CTO)"],
      default: "Lead / Staff",
    },

    // ==================================================
    // CURRENT EMPLOYMENT
    // ==================================================
    currentEmployment: {
      company: {
        type: String,
        trim: true,
        default: "",
        maxlength: [150, "Company name cannot exceed 150 characters"],
      },
      jobTitle: {
        type: String,
        trim: true,
        default: "",
        maxlength: [120, "Job title cannot exceed 120 characters"],
      },
      department: {
        type: String,
        trim: true,
        default: "Engineering",
        maxlength: [100, "Department cannot exceed 100 characters"],
      },
      employmentType: {
        type: String,
        enum: ["Full-time", "Part-time", "Contract", "Freelance", "Consultant", "Co-founder"],
        default: "Full-time",
      },
      industry: {
        type: String,
        trim: true,
        default: "Information Technology",
        maxlength: [100, "Industry cannot exceed 100 characters"],
      },
      location: {
        type: String,
        trim: true,
        default: "",
        maxlength: [100, "Location cannot exceed 100 characters"],
      },
      workMode: {
        type: String,
        enum: ["Remote", "Hybrid", "On-site"],
        default: "Hybrid",
      },
      joiningDate: {
        type: Date,
      },
      currentlyWorking: {
        type: Boolean,
        default: true,
      },
      description: {
        type: String,
        trim: true,
        default: "",
        maxlength: [1500, "Description cannot exceed 1500 characters"],
      },
      responsibilities: {
        type: String,
        trim: true,
        default: "",
        maxlength: [1500, "Responsibilities cannot exceed 1500 characters"],
      },
      companyWebsite: {
        type: String,
        trim: true,
        default: "",
      },
      companyLogo: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ==================================================
    // TOTAL WORK EXPERIENCE & HISTORY
    // ==================================================
    experience: {
      type: [workExperienceSchema],
      default: [],
    },

    totalExperienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalExperienceMonths: {
      type: Number,
      default: 0,
      min: 0,
    },

    experienceLevelCategory: {
      type: String,
      enum: ["1-3 years", "3-5 years", "5-8 years", "8-12 years", "12+ years"],
      default: "3-5 years",
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
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      country: { type: String, default: "India", trim: true },
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },

    socialLinks: {
      linkedin: { type: String, default: "", trim: true },
      github: { type: String, default: "", trim: true },
      portfolio: { type: String, default: "", trim: true },
    },

    // ==================================================
    // PROFESSIONAL SKILLS CATEGORIZATION
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
      cloud: {
        type: [skillItemSchema],
        default: [],
      },
      devOps: {
        type: [skillItemSchema],
        default: [],
      },
      tools: {
        type: [skillItemSchema],
        default: [],
      },
      domain: {
        type: [skillItemSchema],
        default: [],
      },
      management: {
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
    // PROJECTS, ACHIEVEMENTS & LEADERSHIP
    // ==================================================
    projects: {
      type: [professionalProjectSchema],
      default: [],
    },

    achievements: {
      type: [professionalAchievementSchema],
      default: [],
    },

    leadership: {
      type: [leadershipSchema],
      default: [],
    },

    certifications: {
      type: [professionalCertificationSchema],
      default: [],
    },

    professionalDevelopment: {
      type: [professionalDevelopmentSchema],
      default: [],
    },

    education: {
      type: [educationSchema],
      default: [],
    },

    // ==================================================
    // CAREER GOAL
    // ==================================================
    careerGoal: {
      goal: {
        type: String,
        trim: true,
        default: "",
        maxlength: [200, "Career goal cannot exceed 200 characters"],
      },
      targetRole: {
        type: String,
        trim: true,
        default: "Engineering Lead / Staff Engineer",
        maxlength: [100, "Target role cannot exceed 100 characters"],
      },
      targetIndustry: {
        type: String,
        trim: true,
        default: "Information Technology & Services",
      },
      targetLevel: {
        type: String,
        default: "Lead / Staff",
      },
      timeline: {
        type: String,
        enum: ["Immediate (1-3 Months)", "Next 6 Months", "Next 1-2 Years", "Exploring Long-term"],
        default: "Next 6 Months",
      },
    },

    // ==================================================
    // JOB PREFERENCES
    // ==================================================
    jobPreferences: {
      preferredRoles: [
        {
          type: String,
          trim: true,
        },
      ],
      industries: [
        {
          type: String,
          trim: true,
        },
      ],
      locations: [
        {
          type: String,
          trim: true,
        },
      ],
      workModes: [
        {
          type: String,
          enum: ["Remote", "Hybrid", "On-site", "Any"],
        },
      ],
      employmentTypes: [
        {
          type: String,
          enum: ["Full-time", "Contract", "Freelance", "Consultant"],
        },
      ],
    },

    // ==================================================
    // AVAILABILITY, NOTICE PERIOD & COMPENSATION
    // ==================================================
    availability: {
      status: {
        type: String,
        enum: ["Employed (Actively Looking)", "Employed (Passive / Open)", "Serving Notice Period", "Available Immediately"],
        default: "Employed (Passive / Open)",
      },
      expectedJoiningDate: {
        type: Date,
      },
      noticePeriod: {
        type: String,
        enum: ["Immediate", "7 Days", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days", "Other"],
        default: "30 Days",
      },
    },

    compensation: {
      currentSalary: {
        type: Number,
        default: 0,
      },
      expectedMinSalary: {
        type: Number,
        default: 0,
      },
      expectedMaxSalary: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "INR (LPA)",
      },
      isCurrentSalaryConfidential: {
        type: Boolean,
        default: true,
      },
    },

    relocation: {
      willingToRelocate: {
        type: String,
        enum: ["Yes", "No", "Depends on Opportunity"],
        default: "Depends on Opportunity",
      },
      preferredCities: [
        {
          type: String,
          trim: true,
        },
      ],
      preferredCountries: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    recruiterPreferences: {
      allowContact: {
        type: Boolean,
        default: true,
      },
      preferredContactMethod: {
        type: String,
        enum: ["Email", "LinkedIn", "Phone", "Platform Chat"],
        default: "Email",
      },
    },

    jobSearchStatus: {
      type: String,
      enum: ["Not Looking", "Open to Opportunities", "Actively Looking", "Open to Recruiter Contact"],
      default: "Open to Opportunities",
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
      enum: ["public", "private", "recruiter-only"],
      default: "recruiter-only",
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

    careerStrengthScore: {
      type: Number,
      default: 0,
      min: [0, "Career strength cannot be below 0"],
      max: [100, "Career strength cannot exceed 100"],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Fast search indexes
professionalProfileSchema.index({ "currentEmployment.jobTitle": 1 });
professionalProfileSchema.index({ "currentEmployment.company": 1 });
professionalProfileSchema.index({ "careerGoal.targetRole": 1 });
professionalProfileSchema.index({ profileVisibility: 1 });
professionalProfileSchema.index({ jobSearchStatus: 1 });
professionalProfileSchema.index({ "location.city": 1 });

module.exports = mongoose.model("ProfessionalProfile", professionalProfileSchema);
