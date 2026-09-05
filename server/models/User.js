const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must contain at least 2 characters"],
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must contain at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers and underscore",
      ],
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: false, // Google-only (Firebase) users do not have a MongoDB password
      select: false,
    },

    // ==========================================
    // FIREBASE INTEGRATION
    // ==========================================

    // Firebase UID — links this MongoDB user to a Firebase Authentication user.
    // null/undefined for legacy users who registered before Firebase was added.
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values (legacy users)
      trim: true,
      index: true,
    },

    // Tracks which authentication providers are linked to this account.
    // e.g. ["google"], ["email"], ["google", "email"]
    authProviders: {
      type: [String],
      default: [],
    },

    // True when the user has set a password via Firebase email/password provider.
    // Used to determine whether to show the "Set Password" page after Google sign-in.
    hasPassword: {
      type: Boolean,
      default: false,
    },


    // ==========================================
    // COMMON ACCOUNT INFORMATION
    // ==========================================

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // SOCIAL LINKS
    // ==========================================

    socialLinks: {
      linkedin: {
        type: String,
        default: "",
        trim: true,
      },

      github: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ==========================================
    // ACCOUNT ROLE
    // ==========================================

    role: {
      type: String,

      enum: {
        values: ["user", "admin", "employer"],
        message: "Invalid user role",
      },

      default: "user",
      index: true,
    },

    // ==========================================
    // USER TYPE
    // ==========================================

    userType: {
      type: String,

      enum: {
        values: ["student", "fresher", "professional", "employer"],
        message: "Invalid user type",
      },

      required: [true, "User type is required"],

      index: true,
    },


    // ========== EMAIL VERIFICATION ==========
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailOTP: {
      type: String,
      select: false,
    },

    emailOTPExpires: {
      type: Date,
      select: false,
    },

    // ==========================================
    // PROFILE STATUS
    // ==========================================

    profileCompletion: {
      type: Number,
      default: 0,
      min: [0, "Profile completion cannot be below 0"],
      max: [100, "Profile completion cannot exceed 100"],
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ==========================================
    // ACCOUNT STATUS
    // ==========================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastLogin: {
      type: Date,
    },
  },

  {
    timestamps: true,
  }
);

// ==========================================
// PASSWORD HASHING
// ==========================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// PASSWORD COMPARISON
// ==========================================

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;