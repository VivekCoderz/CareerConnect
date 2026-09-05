const User = require("../models/User.js");
const StudentProfile = require("../models/StudentProfile.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const PendingOTP = require("../models/PendingOTP.js");
const sendEmail = require("../utils/sendEmail.js");
const EmployerProfile = require("../models/EmployerProfile.js");
const getFirebaseAdmin = require("../config/firebaseAdmin.js");

// ==========================================
// HELPERS
// ==========================================

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT with dynamic expiry based on "Keep Me Signed In"
const generateToken = (userId, keepSignedIn = false) => {
  const expiresIn = keepSignedIn ? "7d" : "25h";
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

// Set HTTP-only cookie with dynamic maxAge
const setTokenCookie = (res, token, keepSignedIn = false) => {
  const maxAge = keepSignedIn
    ? 7 * 24 * 60 * 60 * 1000   // 7 days in ms
    : 25 * 60 * 60 * 1000;       // 25 hours in ms

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge,
  });
};

// Helper: Generate username from email
const generateUsername = (email) => {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base}${random}`;
};

// Helper: Generate unique username (ensures no collision)
const generateUniqueUsername = async (email) => {
  let attempts = 0;
  while (attempts < 10) {
    const username = generateUsername(email);
    const exists = await User.findOne({ username });
    if (!exists) return username;
    attempts++;
  }
  return `user${Date.now()}`;
};

// Shared user payload shape
const userPayload = (user, extra = {}) => ({
  _id: user._id,
  id: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  phone: user.phone,
  profileImage: user.profileImage,
  role: user.role,
  userType: user.userType,
  profileCompletion: user.profileCompletion || 0,
  isProfileComplete: user.isProfileComplete || false,
  socialLinks: user.socialLinks,
  isActive: user.isActive,
  hasPassword: user.hasPassword,
  authProviders: user.authProviders || [],
  ...extra,
});

// ==========================================
// SEND OTP (Step 1 Continue pe call hoga)
// ==========================================
module.exports.sendOTP = async (req, res, next) => {
  try {
    const { email, fullName } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Already registered?
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert pending OTP
    await PendingOTP.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        expiresAt,
        isVerified: false,
      },
      { upsert: true, new: true },
    );

    console.log(`\n==================================================`);
    console.log(`🔑 [DEMO / DEV OTP] Email: ${normalizedEmail}`);
    console.log(`🔑 [DEMO / DEV OTP] OTP Code: ${otp}`);
    console.log(`🔑 [DEMO / DEV OTP] (Master Demo Code: 123456)`);
    console.log(`==================================================\n`);

    // Send email
    await sendEmail({
      to: normalizedEmail,
      subject: "Your CareerConnect verification code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e40af; margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #475569;">Hi${fullName ? ` ${fullName}` : ""},</p>
          <p style="color: #475569;">Use this code to continue creating your CareerConnect account:</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: normalizedEmail,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY OTP
// ==========================================
module.exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const enteredOtp = otp.toString().trim();

    let record = await PendingOTP.findOne({ email: normalizedEmail });

    // In non-production, auto-create or allow master demo OTP
    const isMasterDemoOtp =
      process.env.NODE_ENV !== "production" &&
      (enteredOtp === "123456" || enteredOtp === "000000");

    if (!record && isMasterDemoOtp) {
      record = await PendingOTP.create({
        email: normalizedEmail,
        otp: enteredOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isVerified: true,
      });
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (record.expiresAt < new Date() && !isMasterDemoOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isValid = record.otp === enteredOtp || isMasterDemoOtp;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Mark verified
    record.isVerified = true;
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REGISTER (Multi-step form ke hisaab se)
// ==========================================
module.exports.registerUser = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      linkedin,
      github,
      userType, // student | fresher | professional
      keepSignedIn = false,

      // Student fields
      college,
      course,
      year,
      graduationYear,

      // Fresher fields
      highestQualification,
      passoutYear,
      skills,

      // Professional fields
      currentCompany,
      jobTitle,
      experienceYears,
      industry,
    } = req.body;

    // -------------------- Validation --------------------
    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        field: "fullName",
        message: "Full name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Email is required",
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Phone number is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password must contain at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        field: "confirmPassword",
        message: "Passwords do not match",
      });
    }

    if (
      !userType ||
      !["student", "fresher", "professional"].includes(userType)
    ) {
      return res.status(400).json({
        success: false,
        field: "userType",
        message: "Please select a valid user type",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    // -------------------- Prepare user data --------------------
    const userData = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      userType,
      authProviders: ["email"],
      hasPassword: true,
      socialLinks: {
        linkedin: linkedin?.trim() || "",
        github: github?.trim() || "",
      },
      role: "user",
      username: await generateUniqueUsername(normalizedEmail),
    };

    // -------------------- Validate type-specific data --------------------
    if (userType === "student") {
      if (!college || !course || !year || !graduationYear) {
        return res.status(400).json({
          success: false,
          message:
            "College, course, year and graduation year are required for students",
        });
      }
    } else if (userType === "fresher") {
      if (!highestQualification || !passoutYear) {
        return res.status(400).json({
          success: false,
          message:
            "Highest qualification and passout year are required for freshers",
        });
      }
    } else if (userType === "professional") {
      if (!currentCompany || !jobTitle) {
        return res.status(400).json({
          success: false,
          message:
            "Current company and job title are required for professionals",
        });
      }
    }

    // -------------------- Create user --------------------
    const user = await User.create(userData);

    // -------------------- Create student profile if student --------------------
    if (userType === "student") {
      try {
        await StudentProfile.create({
          userId: user._id,
          education: [
            {
              institution: college.trim(),
              degree: course.trim(),
              startYear: Number(graduationYear) - Number(year),
              endYear: Number(graduationYear),
              currentlyStudying: true,
            },
          ],
        });
      } catch (profileErr) {
        console.error(
          "Error creating student profile during registration:",
          profileErr,
        );
      }
    }

    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN (Legacy — email/password via MongoDB bcrypt)
// For existing users who registered before Firebase was introduced.
// Firebase users use /firebase-login instead.
// ==========================================
module.exports.loginUser = async (req, res, next) => {
  try {
    const { email, username, password, keepSignedIn = false } = req.body;

    // Frontend se emailOrUsername bhi aa sakta hai
    const loginIdentifier = email || username || req.body.emailOrUsername;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required",
      });
    }

    const loginValue = loginIdentifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: loginValue }, { username: loginValue }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Firebase users (Google-only) with no MongoDB password should use /firebase-login
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message:
          "This account uses Google sign-in. Please use 'Continue with Google' to sign in.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// FIREBASE LOGIN
// Handles login for all Firebase-authenticated users:
//   - Google sign-in (repeat logins)
//   - Email+password sign-in (Firebase-managed passwords)
//
// Frontend signs in via Firebase SDK → gets ID Token → sends here.
// Backend verifies the ID Token with Firebase Admin SDK → issues CareerConnect JWT.
// ==========================================
module.exports.firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, keepSignedIn = false } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on this server",
      });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please sign in again.",
      });
    }

    const { uid, email } = decoded;

    // Find MongoDB user by Firebase UID first, then by email (for linking)
    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { email: email?.toLowerCase() }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No CareerConnect account found. Please sign up first or use Google sign-in.",
      });
    }

    // Link Firebase UID if this is a legacy user logging in via Firebase for the first time
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      if (!user.authProviders.includes("email")) {
        user.authProviders.push("email");
      }
      user.hasPassword = true;
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GOOGLE AUTH
// Called after signInWithPopup(auth, googleProvider) on the frontend.
// Creates a new MongoDB user for first-time Google sign-ins, or finds
// the existing one. Returns requiresPasswordSetup=true for new users
// so the frontend can route them to the Set Password page.
// ==========================================
module.exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken, keepSignedIn = false } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on this server",
      });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please try again.",
      });
    }

    const { uid, email, name, picture } = decoded;
    const normalizedEmail = email?.toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email not available from Google account",
      });
    }

    // Find existing user by Firebase UID or email
    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { email: normalizedEmail }],
    });

    let isNewUser = false;

    if (user) {
      // --- Existing user ---
      if (user.firebaseUid && user.firebaseUid !== uid) {
        // Safety check: email matched but different Firebase UID (should be rare)
        return res.status(409).json({
          success: false,
          message:
            "This email is associated with a different account. Please contact support.",
        });
      }

      // Upgrade legacy user: link Firebase UID
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
      }

      // Add google to providers if not present
      if (!user.authProviders.includes("google")) {
        user.authProviders.push("google");
      }

      // Update profile image from Google if not set
      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }
    } else {
      // --- New user: create MongoDB record ---
      isNewUser = true;
      const username = await generateUniqueUsername(normalizedEmail);

      user = new User({
        fullName: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        firebaseUid: uid,
        authProviders: ["google"],
        hasPassword: false,
        isEmailVerified: true, // Google email is always verified
        profileImage: picture || "",
        username,
        role: "user",
        userType: "student", // default; will be changed in /select-role
        phone: "",
      });

      await user.save({ validateBeforeSave: false });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const requiresPasswordSetup = !user.hasPassword;

    // For users who still need to set a password, issue a short-lived token
    // regardless of keepSignedIn. Full duration is granted after password setup.
    const effectiveKeepSignedIn = requiresPasswordSetup ? false : keepSignedIn;
    const token = generateToken(user._id, effectiveKeepSignedIn);
    setTokenCookie(res, token, effectiveKeepSignedIn);

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Google account connected successfully"
        : "Login successful",
      token,
      user: userPayload(user),
      requiresPasswordSetup,
      isNewUser,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// COMPLETE PASSWORD SETUP
// Called after linkWithCredential(firebaseUser, EmailAuthProvider.credential(...))
// on the frontend. Verifies that Firebase now has the "password" provider linked,
// then updates MongoDB to set hasPassword=true.
//
// This is the ONLY way a password gets "stored" — in Firebase, not MongoDB.
// MongoDB only tracks the boolean flag.
// ==========================================
module.exports.completePasswordSetup = async (req, res, next) => {
  try {
    const { idToken, keepSignedIn = false } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on this server",
      });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please sign in again.",
      });
    }

    const { uid } = decoded;

    // Double-check: verify the Firebase user now has "password" provider linked
    let firebaseRecord;
    try {
      firebaseRecord = await admin.auth().getUser(uid);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Could not verify Firebase user record.",
      });
    }

    const hasPasswordProvider = firebaseRecord.providerData.some(
      (p) => p.providerId === "password"
    );

    if (!hasPasswordProvider) {
      return res.status(400).json({
        success: false,
        message:
          "Password has not been linked to your Firebase account. Please try setting the password again.",
      });
    }

    // Update MongoDB: mark hasPassword=true, add "email" to authProviders
    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        hasPassword: true,
        $addToSet: { authProviders: "email" },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "CareerConnect account not found. Please sign in again.",
      });
    }

    // Issue full-duration JWT now that setup is complete
    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Password set successfully! You can now sign in with Google or email + password.",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGOUT
// ==========================================
module.exports.logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// ==========================================
// GET ME (Current logged in user)
// ==========================================
module.exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: userPayload(req.user),
  });
};

// ==========================================
// UPDATE USER TYPE / EXPERIENCE LEVEL
// ==========================================
module.exports.updateExperienceLevel = async (req, res, next) => {
  try {
    const { userType, experienceLevel } = req.body;
    const selectedType = userType || experienceLevel;

    const allowed = ["student", "fresher", "professional"];
    if (!allowed.includes(selectedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Allowed: student, fresher, professional",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        userType: selectedType,
      },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User type updated successfully",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CHECK EMAIL
// ==========================================
module.exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ exists: false });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    return res.status(200).json({
      exists: !!user,
    });
  } catch (error) {
    return res.status(200).json({ exists: false });
  }
};

// ========== FORGOT PASSWORD - SEND OTP ==========
module.exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Firebase users who haven't set a MongoDB password need to use Firebase password reset
    if (user.firebaseUid && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google sign-in. Please use 'Continue with Google' or reset your password via Google.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await PendingOTP.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        expiresAt,
        isVerified: false,
        purpose: "reset-password",
      },
      { upsert: true, new: true },
    );

    console.log(`\n==================================================`);
    console.log(`🔑 [PASSWORD RESET OTP] Email: ${normalizedEmail}`);
    console.log(`🔑 [PASSWORD RESET OTP] OTP Code: ${otp}`);
    console.log(`🔑 [PASSWORD RESET OTP] (Master Demo Code: 123456)`);
    console.log(`==================================================\n`);

    await sendEmail({
      to: normalizedEmail,
      subject: "Reset your CareerConnect password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e3a8a;">Password Reset</h2>
          <p>Hi ${user.fullName || ""},</p>
          <p>Use this code to reset your password:</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// ========== VERIFY RESET OTP ==========
module.exports.verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const enteredOtp = otp.toString().trim();
    let record = await PendingOTP.findOne({ email: normalizedEmail });

    const isMasterDemoOtp =
      process.env.NODE_ENV !== "production" &&
      (enteredOtp === "123456" || enteredOtp === "000000");

    if (!record && isMasterDemoOtp) {
      record = await PendingOTP.create({
        email: normalizedEmail,
        otp: enteredOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isVerified: true,
      });
    }

    if (!record) {
      return res
        .status(400)
        .json({ success: false, message: "No OTP found. Request a new one." });
    }

    if (record.expiresAt < new Date() && !isMasterDemoOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Request a new one.",
      });
    }

    const isValid = record.otp === enteredOtp || isMasterDemoOtp;

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    record.isVerified = true;
    await record.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ========== RESET PASSWORD ==========
module.exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = await PendingOTP.findOne({ email: normalizedEmail });

    if (!record || !record.isVerified || record.otp !== otp.trim()) {
      return res.status(403).json({
        success: false,
        message: "Please verify OTP first",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.password = password; // pre-save hook will hash
    user.hasPassword = true;
    if (!user.authProviders.includes("email")) {
      user.authProviders.push("email");
    }
    await user.save();

    // Cleanup OTP
    await PendingOTP.deleteOne({ email: normalizedEmail });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REGISTER EMPLOYER
// ==========================================
module.exports.registerEmployer = async (req, res, next) => {
  try {
    const {
      companyName,
      email,
      phone,
      password,
      confirmPassword,
      contactPerson,
      designation,
      website,
      companyType,
      industry,
      location,
      keepSignedIn = false,
    } = req.body;

    // ---------- Validation ----------
    if (!companyName?.trim()) {
      return res.status(400).json({
        success: false,
        field: "companyName",
        message: "Company name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Official email is required",
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Mobile number is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password must contain at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        field: "confirmPassword",
        message: "Passwords do not match",
      });
    }

    if (!contactPerson?.trim()) {
      return res.status(400).json({
        success: false,
        field: "contactPerson",
        message: "Contact person is required",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        field: "designation",
        message: "Designation is required",
      });
    }

    if (!companyType) {
      return res.status(400).json({
        success: false,
        field: "companyType",
        message: "Company type is required",
      });
    }

    if (!industry?.trim()) {
      return res.status(400).json({
        success: false,
        field: "industry",
        message: "Industry is required",
      });
    }

    if (!location?.trim()) {
      return res.status(400).json({
        success: false,
        field: "location",
        message: "Location is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // OTP verified?
    const otpRecord = await PendingOTP.findOne({ email: normalizedEmail });
    if (!otpRecord || !otpRecord.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // Already registered?
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    // ---------- Create User (role: employer) ----------
    const user = await User.create({
      fullName: contactPerson.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      role: "employer",
      userType: "employer",
      username: await generateUniqueUsername(normalizedEmail),
      isEmailVerified: true,
      isProfileComplete: false,
      profileCompletion: 20,
      authProviders: ["email"],
      hasPassword: true,
    });

    // ---------- Create Employer Profile ----------
    try {
      await EmployerProfile.create({
        userId: user._id,
        companyName: companyName.trim(),
        officialEmail: normalizedEmail,
        mobile: phone.trim(),
        website: website?.trim() || "",
        companyType: companyType || "Private",
        industry: industry?.trim() || "Information Technology",
        headquarters: {
          city: location?.trim() || "",
          state: "",
          country: "India",
        },
        recruiter: {
          name: contactPerson.trim(),
          designation: designation.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
        },
        currentStep: 1,
        profileCompletion: 20,
      });
    } catch (profileErr) {
      console.error("EmployerProfile creation error:", profileErr);
    }

    // Cleanup OTP
    await PendingOTP.deleteOne({ email: normalizedEmail });

    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(201).json({
      success: true,
      message: "Employer account created successfully",
      token,
      user: {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        userType: user.userType,
        companyName: companyName.trim(),
        hasPassword: true,
        authProviders: ["email"],
      },
    });
  } catch (error) {
    next(error);
  }
};
