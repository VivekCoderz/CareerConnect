const User = require("../models/User.js");
const StudentProfile = require("../models/StudentProfile.js");
const FresherProfile = require("../models/FresherProfile.js");
const ProfessionalProfile = require("../models/ProfessionalProfile.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const PendingOTP = require("../models/PendingOTP.js");
const sendEmail = require("../utils/sendEmail.js");
const EmployerProfile = require("../models/EmployerProfile.js");
const getFirebaseAdmin = require("../config/firebaseAdmin.js");
const { validateEmail, maskEmail } = require("../services/emailValidationService.js");

// ==========================================
// PASSWORD VALIDATION & HELPERS
// ==========================================

const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 6) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[@#$%&*!?]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
};

const PASSWORD_VALIDATION_ERROR =
  "Password must contain at least 6 characters, one letter, one number, and one special character.";

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

const { validatePhoneFormat } = require("../middleware/validationMiddleware");

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

// Helper: Check if phone number is already registered across any user
const isPhoneAlreadyTaken = async (phone, countryCode = "+91", excludeUserId = null) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return false;
  const last10 = digits.slice(-10);

  const orConditions = [
    { phone: digits, countryCode: countryCode },
    { phone: last10, countryCode: countryCode },
    { phone: digits },
    { phone: `${countryCode}${digits}` },
    { phone: `${countryCode}${last10}` },
  ];

  const query = { $or: orConditions };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existing = await User.findOne(query);
  return !!existing;
};

// Shared user payload shape
const userPayload = (user, extra = {}) => ({
  _id: user._id,
  id: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  countryCode: user.countryCode || "+91",
  phone: user.phone,
  profileImage: user.profileImage,
  role: user.role,
  userType: user.userType,
  profileCompletion: user.profileCompletion || 0,
  isProfileComplete: user.isProfileComplete || false,
  socialLinks: user.socialLinks,
  isActive: user.isActive,
  hasPassword: Boolean(user.hasPassword && (user.password !== undefined ? !!user.password : true)),
  authProviders: user.authProviders || [],
  resumeUrl: user.resumeUrl || "",
  resumeName: user.resumeName || "",
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

    // Comprehensive Email & Disposable Domain Protection
    const validationResult = await validateEmail(email);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        field: "email",
        code: validationResult.isDisposable ? "DISPOSABLE_EMAIL_REJECTED" : "INVALID_EMAIL_DOMAIN",
        message: validationResult.reason || "Invalid email address or temporary domain.",
      });
    }

    const normalizedEmail = validationResult.normalizedEmail || email.trim().toLowerCase();

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

/**
 * Helper to create/regenerate session in Redis
 * Stores ONLY minimal, essential data (userId, email, role, loginTime, lastActive)
 */
const createSession = (req, user) => {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve(null);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return reject(err);
      }

      req.session.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        userType: user.userType,
        loginTime: new Date(),
        lastActive: new Date(),
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return reject(saveErr);
        }
        resolve(req.session.user);
      });
    });
  });
};

// ==========================================
// REGISTER (Multi-step form ke hisaab se)
// ==========================================
module.exports.registerUser = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      countryCode = "+91",
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

    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Mobile number is required",
      });
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, "");
    const cleanCountryCode = countryCode?.trim() || "+91";

    if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      });
    }

    // Check duplicate phone number
    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Yeh mobile number pehle se registered hai (Mobile number is already registered)",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
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

    // Verify OTP first (manual email registration requires verified OTP)
    const otpRecord = await PendingOTP.findOne({ email: normalizedEmail });
    if (!otpRecord || !otpRecord.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email with OTP first",
      });
    }

    // -------------------- Prepare user data --------------------
    const userData = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      countryCode: cleanCountryCode,
      phone: cleanPhone,
      password,
      userType,
      authProviders: ["email"],
      hasPassword: true,
      isEmailVerified: true,
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

    // Cleanup OTP after successful registration
    await PendingOTP.deleteOne({ email: normalizedEmail });

    // Initialize Redis Session
    if (req.session) {
      try {
        await createSession(req, user);
      } catch (sessErr) {
        console.warn("Could not save registration session to Redis:", sessErr.message);
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

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    // If user has a password set in MongoDB, verify it
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    } else {
      // Account created via Google sign-in without a set password yet
      return res.status(401).json({
        success: false,
        code: "PASSWORD_NOT_SET",
        message:
          "No password has been set for this account yet. Please sign in with 'Continue with Google' to set your password, or use 'Forgot Password'.",
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Initialize Redis Session (15 min idle timeout with rolling reset)
    if (req.session) {
      try {
        await createSession(req, user);
      } catch (sessErr) {
        console.warn("Could not save login session to Redis:", sessErr.message);
      }
    }

    const token = generateToken(user._id, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      sessionExpiresInMs: req.session?.cookie?.maxAge || null,
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
    const { idToken, password, keepSignedIn = false } = req.body;

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
      console.error("[GoogleAuth Link] verifyIdToken failed:", firebaseErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please sign in again.",
      });
    }

    const { uid, email } = decoded;

    // Find MongoDB user by Firebase UID first, then by email (for linking)
    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { email: email?.toLowerCase() }],
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No CareerConnect account found. Please sign up first or use Google sign-in.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    // Link Firebase UID if this is a user logging in via Firebase for the first time
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
    }
    if (!user.authProviders.includes("email")) {
      user.authProviders.push("email");
    }

    // If password provided and user has no MongoDB password, sync it now
    if (password && !user.password) {
      user.password = password;
      user.hasPassword = true;
    }

    user.lastLogin = new Date();
    await user.save();

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
    const { idToken, keepSignedIn = false, role = "user" } = req.body;

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
      console.error("[GoogleAuth] verifyIdToken failed:", firebaseErr.message);
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
    }).select("+password");

    let isNewUser = false;

    if (user) {
      // --- Existing user ---
      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
        });
      }

      if (user.firebaseUid && user.firebaseUid !== uid) {
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

      // If user has no MongoDB password, ensure hasPassword is false
      if (!user.password && user.hasPassword) {
        user.hasPassword = false;
      }

      // Update profile image from Google if not set
      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }
    } else {
      // --- New user: create MongoDB record ---
      isNewUser = true;
      const username = await generateUniqueUsername(normalizedEmail);

      // Determine role/userType from request (employer vs candidate)
      const isEmployer = role === "employer";

      user = new User({
        fullName: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        firebaseUid: uid,
        authProviders: ["google"],
        hasPassword: false,
        isEmailVerified: true, // Google email is always verified
        profileImage: picture || "",
        username,
        role: isEmployer ? "employer" : "user",
        userType: isEmployer ? "employer" : "student", // employer stays employer; candidate will pick in /select-role
        phone: "",
      });

      await user.save({ validateBeforeSave: false });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const requiresPasswordSetup = !user.hasPassword || !user.password;
    if (requiresPasswordSetup && user.hasPassword) {
      user.hasPassword = false;
      await user.save({ validateBeforeSave: false });
    }

    // For users who still need to set a password, issue a short-lived token
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
// Called after user enters password on /set-password.
// Updates password in Firebase via Firebase Admin SDK,
// hashes and stores password in MongoDB (user.password),
// sets hasPassword=true, and issues full CareerConnect JWT.
// ==========================================
module.exports.completePasswordSetup = async (req, res, next) => {
  try {
    const { idToken, password, keepSignedIn = false } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    if (!password || !validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
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
      console.error("[SetPasswordGoogle] verifyIdToken failed:", firebaseErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please sign in again.",
      });
    }

    const { uid, email } = decoded;

    // Update Firebase user password directly via Firebase Admin SDK
    try {
      await admin.auth().updateUser(uid, { password });
    } catch (fbErr) {
      console.warn("[completePasswordSetup] Firebase admin updateUser warning:", fbErr.message);
    }

    // Find MongoDB user by firebaseUid, email, or authenticated session user
    let user = await User.findOne({
      $or: [
        { firebaseUid: uid },
        { email: email?.toLowerCase() },
        ...(req.user?._id ? [{ _id: req.user._id }] : []),
      ],
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "CareerConnect account not found. Please sign in again.",
      });
    }

    // Save hashed password in MongoDB and update flags
    user.password = password; // pre-save hook will hash with bcrypt
    user.hasPassword = true;
    if (!user.authProviders.includes("email")) {
      user.authProviders.push("email");
    }
    if (!user.authProviders.includes("google")) {
      user.authProviders.push("google");
    }
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
    }

    await user.save();

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
  // 1. Clear token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  // 2. Clear session cookie
  res.clearCookie("sid", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  // 3. Destroy session in Redis
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying Redis session during logout:", err);
      }
      return res.status(200).json({
        success: true,
        message: "Logout successful. Session destroyed.",
      });
    });
  } else {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
};

// ==========================================
// GET ME (Current logged in user)
// ==========================================
module.exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    sessionExpiresInMs: req.session?.cookie?.maxAge || null,
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

// ==========================================
// CHECK PHONE
// ==========================================
module.exports.checkPhone = async (req, res) => {
  try {
    const { phone, countryCode = "+91" } = req.body;
    if (!phone) {
      return res.status(200).json({ exists: false });
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    const cleanCountryCode = countryCode.trim() || "+91";

    const exists = await isPhoneAlreadyTaken(
      cleanPhone,
      cleanCountryCode,
      req.user?._id || req.user?.id || null
    );

    return res.status(200).json({
      exists,
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

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, field: "confirmPassword", message: "Passwords do not match" });
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

    // Also sync updated password to Firebase if user is linked
    const admin = getFirebaseAdmin();
    if (admin && user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { password });
      } catch (fbErr) {
        console.warn("[resetPassword] Firebase admin updateUser warning:", fbErr.message);
      }
    }

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
      countryCode = "+91",
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

    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Mobile number is required",
      });
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, "");
    const cleanCountryCode = countryCode?.trim() || "+91";

    if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      });
    }

    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Yeh mobile number pehle se registered hai (Mobile number is already registered)",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
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
      countryCode: cleanCountryCode,
      phone: cleanPhone,
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

    // Initialize Redis Session
    if (req.session) {
      try {
        await createSession(req, user);
      } catch (sessErr) {
        console.warn("Could not save employer session to Redis:", sessErr.message);
      }
    }

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

// ==========================================
// COMPLETE GOOGLE ONBOARDING
// Called after Google user has set password and selected a role.
// Saves phone, role-specific details, and (optionally) a resume URL.
// Protected — requires valid JWT cookie.
// ==========================================
module.exports.completeGoogleOnboarding = async (req, res, next) => {
  try {
    const {
      countryCode = "+91",
      phone,
      linkedin,
      github,
      userType,

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

      // Optional resume
      resumeUrl,
    } = req.body;

    const userId = req.user.id;

    // -------- Basic Validation --------
    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Phone number is required",
      });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const cleanCountryCode = countryCode.trim() || "+91";

    if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      });
    }

    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode, userId);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Yeh mobile number pehle se registered hai (Mobile number is already registered)",
      });
    }

    const allowedTypes = ["student", "fresher", "professional"];
    if (!userType || !allowedTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        field: "userType",
        message: "Invalid user type",
      });
    }

    // -------- Role-specific Validation --------
    if (userType === "student") {
      if (!college?.trim() || !course?.trim() || !year || !graduationYear) {
        return res.status(400).json({
          success: false,
          message: "College, course, year and graduation year are required for students",
        });
      }
    } else if (userType === "fresher") {
      if (!highestQualification?.trim() || !passoutYear) {
        return res.status(400).json({
          success: false,
          message: "Highest qualification and passout year are required",
        });
      }
    } else if (userType === "professional") {
      if (!currentCompany?.trim() || !jobTitle?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Current company and job title are required",
        });
      }
    }

    // -------- Update User document --------
    const updateData = {
      countryCode: cleanCountryCode,
      phone: cleanPhone,
      userType,
      socialLinks: {
        linkedin: linkedin?.trim() || "",
        github: github?.trim() || "",
      },
      profileCompletion: 50,
    };

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // -------- Create role-specific profile --------
    try {
      if (userType === "student") {
        // Check if profile already exists (idempotent)
        const existing = await StudentProfile.findOne({ userId });
        if (!existing) {
          await StudentProfile.create({
            userId,
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
        } else {
          // Update education if blank
          if (!existing.education?.length) {
            existing.education = [
              {
                institution: college.trim(),
                degree: course.trim(),
                startYear: Number(graduationYear) - Number(year),
                endYear: Number(graduationYear),
                currentlyStudying: true,
              },
            ];
            await existing.save();
          }
        }
      } else if (userType === "fresher") {
        const existing = await FresherProfile.findOne({ userId });
        if (!existing) {
          await FresherProfile.create({
            userId,
            // Use the education sub-schema
            education: [
              {
                degree: highestQualification.trim(),
                institution: "Not specified",
                graduationYear: Number(passoutYear),
                isHighest: true,
              },
            ],
          });
        }
      } else if (userType === "professional") {
        const existing = await ProfessionalProfile.findOne({ userId });
        if (!existing) {
          await ProfessionalProfile.create({
            userId,
            currentEmployment: {
              company: currentCompany.trim(),
              jobTitle: jobTitle.trim(),
              industry: industry?.trim() || "Information Technology",
            },
          });
        }
      }
    } catch (profileErr) {
      // Profile creation failure is non-fatal — user can complete later
      console.error("[GoogleOnboarding] Profile creation error:", profileErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Profile setup complete",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// COMPLETE EMPLOYER GOOGLE ONBOARDING
// Called after employer Google user has set password.
// Collects company info and creates EmployerProfile.
// Protected — requires valid JWT cookie.
// ==========================================
module.exports.completeEmployerGoogleOnboarding = async (req, res, next) => {
  try {
    const {
      countryCode = "+91",
      phone,
      companyName,
      contactPerson,
      designation,
      website,
      companyType,
      industry,
      location,
    } = req.body;

    const userId = req.user.id;

    // -------- Validation --------
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, field: "phone", message: "Mobile number is required" });
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanCountryCode = countryCode.trim() || "+91";

    if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      });
    }

    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode, userId);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Yeh mobile number pehle se registered hai (Mobile number is already registered)",
      });
    }

    if (!companyName?.trim()) {
      return res.status(400).json({ success: false, field: "companyName", message: "Company name is required" });
    }
    if (!contactPerson?.trim()) {
      return res.status(400).json({ success: false, field: "contactPerson", message: "Contact person name is required" });
    }
    if (!designation?.trim()) {
      return res.status(400).json({ success: false, field: "designation", message: "Designation is required" });
    }
    if (!industry?.trim()) {
      return res.status(400).json({ success: false, field: "industry", message: "Industry is required" });
    }
    if (!location?.trim()) {
      return res.status(400).json({ success: false, field: "location", message: "Location is required" });
    }

    // -------- Update User --------
    const user = await User.findByIdAndUpdate(
      userId,
      {
        countryCode: cleanCountryCode,
        phone: cleanPhone,
        role: "employer",
        userType: "employer",
        profileCompletion: 40,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // -------- Create EmployerProfile (idempotent) --------
    try {
      const existing = await EmployerProfile.findOne({ userId });
      if (!existing) {
        await EmployerProfile.create({
          userId,
          companyName: companyName.trim(),
          officialEmail: user.email,
          mobile: phone.trim(),
          website: website?.trim() || "",
          companyType: companyType || "Private",
          industry: industry.trim(),
          headquarters: {
            city: location.trim(),
            state: "",
            country: "India",
          },
          recruiter: {
            name: contactPerson.trim(),
            designation: designation.trim(),
            email: user.email,
            phone: phone.trim(),
          },
          currentStep: 1,
          profileCompletion: 40,
        });
      }
    } catch (profileErr) {
      console.error("[EmployerGoogleOnboarding] Profile creation error:", profileErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Employer profile setup complete",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};