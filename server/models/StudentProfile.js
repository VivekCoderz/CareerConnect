const mongoose = require("mongoose");

// ======================================================
// EDUCATION SUB-SCHEMA
// ======================================================

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      maxlength: [150, "Institution name cannot exceed 150 characters"],
    },

    degree: {
      type: String,
      required: [true, "Degree is required"],
      trim: true,
      maxlength: [100, "Degree cannot exceed 100 characters"],
    },

    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: [100, "Field of study cannot exceed 100 characters"],
    },

    startYear: {
      type: Number,
      min: [1950, "Invalid start year"],
      max: [2100, "Invalid start year"],
    },

    endYear: {
      type: Number,
      min: [1950, "Invalid end year"],
      max: [2100, "Invalid end year"],
    },

    currentlyStudying: {
      type: Boolean,
      default: false,
    },

    grade: {
      type: String,
      trim: true,
      maxlength: [20, "Grade cannot exceed 20 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  {
    _id: true,
  }
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

    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      maxlength: [1500, "Project description cannot exceed 1500 characters"],
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
  },
  {
    _id: true,
  }
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
  {
    _id: true,
  }
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

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    organization: {
      type: String,
      trim: true,
      maxlength: [150, "Organization name cannot exceed 150 characters"],
    },

    date: {
      type: Date,
    },

    proofUrl: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
  }
);

// ======================================================
// EXPERIENCE SUB-SCHEMA
// ======================================================

const experienceSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [150, "Organization name cannot exceed 150 characters"],
    },

    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      maxlength: [100, "Role cannot exceed 100 characters"],
    },

    experienceType: {
      type: String,
      enum: [
        "internship",
        "freelance",
        "volunteer",
        "research",
        "part-time",
        "other",
      ],
      default: "internship",
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

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    skillsUsed: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    _id: true,
  }
);

// ======================================================
// STUDENT PROFILE SCHEMA
// ======================================================

const studentProfileSchema = new mongoose.Schema(
  {
    // ==================================================
    // USER REFERENCE
    // ==================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },

    // ==================================================
    // PERSONAL INFORMATION
    // ==================================================

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },

    location: {
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
      },

      state: {
        type: String,
        trim: true,
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
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },

    // ==================================================
    // EDUCATION
    // ==================================================

    education: {
      type: [educationSchema],
      default: [],
    },

    // ==================================================
    // SKILLS
    // ==================================================

    technicalSkills: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Technical skill cannot exceed 50 characters"],
      },
    ],

    softSkills: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Soft skill cannot exceed 50 characters"],
      },
    ],

    // ==================================================
    // PROJECTS
    // ==================================================

    projects: {
      type: [projectSchema],
      default: [],
    },

    // ==================================================
    // CERTIFICATIONS
    // ==================================================

    certifications: {
      type: [certificationSchema],
      default: [],
    },

    // ==================================================
    // ACHIEVEMENTS
    // ==================================================

    achievements: {
      type: [achievementSchema],
      default: [],
    },

    // ==================================================
    // EXPERIENCE
    // ==================================================

    experience: {
      type: [experienceSchema],
      default: [],
    },

    // ==================================================
    // CAREER INFORMATION
    // ==================================================

    careerGoal: {
      type: String,
      trim: true,
      maxlength: [100, "Career goal cannot exceed 100 characters"],
    },

    interests: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Interest cannot exceed 50 characters"],
      },
    ],

    // ==================================================
    // JOB / CAREER PREFERENCES
    // ==================================================

    jobPreferences: {
      preferredRoles: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Role cannot exceed 100 characters"],
        },
      ],

      preferredLocations: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Location cannot exceed 100 characters"],
        },
      ],

      jobTypes: [
        {
          type: String,
          enum: [
            "full-time",
            "part-time",
            "internship",
            "freelance",
          ],
        },
      ],

      remote: {
        type: Boolean,
        default: false,
      },
    },

    // ==================================================
    // RESUME
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
    },

    // ==================================================
    // PROFILE STATUS
    // ==================================================

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

    // ==================================================
    // VERIFICATION
    // ==================================================

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

studentProfileSchema.index({
  "location.city": 1,
  "location.state": 1,
});

studentProfileSchema.index({
  careerGoal: 1,
});

studentProfileSchema.index({
  technicalSkills: 1,
});

module.exports = mongoose.model(
  "StudentProfile",
  studentProfileSchema
);