// Helpers shared by the auth controllers (H27): passwords, tokens and cookies, usernames,
// phone checks and the user payload sent to the client.
const User = require("../../models/User.js");
const jwt = require("jsonwebtoken");
const { authCookieOptions } = require("../../utils/authCookies.js");
const { validatePhoneFormat } = require("../../middleware/validationMiddleware");


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

// Generate JWT with dynamic expiry based on "Keep Me Signed In"
const generateToken = (user, keepSignedIn = false) => {
  const expiresIn = keepSignedIn ? "7d" : "25h";
  return jwt.sign({ id: user._id, av: user.authVersion || 0 }, process.env.JWT_SECRET, { expiresIn });
};

// Determine production environment (checks standard NODE_ENV and Render environment)
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Set HTTP-only cookie with dynamic maxAge
const setTokenCookie = (res, token, keepSignedIn = false) => {
  const maxAge = keepSignedIn
    ? 7 * 24 * 60 * 60 * 1000   // 7 days in ms
    : 25 * 60 * 60 * 1000;       // 25 hours in ms

  res.cookie("token", token, authCookieOptions(maxAge));
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


const EMPLOYER_REGISTRATION_CLOSED = {
  success: false,
  code: "EMPLOYER_REGISTRATION_CLOSED",
  message: "Employer registration is closed",
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

// Helper: Check if phone number is already registered. Employers may share a number
// (several recruiters, one office line), so their numbers never block anyone.
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

  const query = { $or: orConditions, role: { $ne: "employer" } };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existing = await User.findOne(query);
  return !!existing;
};

// Employers may leave the mobile number empty, and may use a number another account
// already has. When given it must be a valid number.
// Returns { phone, countryCode } (phone "" when empty) or { status, error } to send back.
const readOptionalEmployerPhone = (phone, countryCode) => {
  const cleanCountryCode = countryCode?.toString().trim() || "+91";
  const cleanPhone = (phone ?? "").toString().replace(/\D/g, "");
  if (!cleanPhone) return { phone: "", countryCode: cleanCountryCode };
  if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
    return {
      status: 400,
      error: {
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      },
    };
  }
  return { phone: cleanPhone, countryCode: cleanCountryCode };
};

// Shared user payload shape
const userPayload = (user, extra = {}) => ({
  _id: user._id,
  id: user._id,
  fullName: user.fullName,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  username: user.username,
  email: user.email,
  countryCode: user.countryCode || "+91",
  phone: user.phone,
  city: user.city || "",
  gender: user.gender || "",
  languages: user.languages || [],
  interests: user.interests || [],
  workExperience: user.workExperience || "",
  college: user.college || "",
  course: user.course || "",
  stream: user.stream || "",
  startYear: user.startYear || null,
  endYear: user.endYear || null,
  profileImage: user.profileImage,
  role: user.role,
  userType: user.userType,
  profileCompletion: user.profileCompletion || 0,
  isProfileComplete: user.isProfileComplete || false,
  // Signup finished (employers: company details given). Phone is optional for employers.
  onboardingComplete: Boolean(user.onboardingCompletedAt),
  socialLinks: user.socialLinks,
  isActive: user.isActive,
  hasPassword: Boolean(user.hasPassword && (user.password !== undefined ? !!user.password : true)),
  authProviders: user.authProviders || [],
  resumeUrl: user.resumeUrl || "",
  resumeName: user.resumeName || "",
  ...extra,
});

const EMAIL_SIGNUP_BUSY_MESSAGE = "Email sign-up is busy right now. Please use Continue with Google or try again later.";


module.exports = {
  validatePassword,
  PASSWORD_VALIDATION_ERROR,
  generateToken,
  isProduction,
  setTokenCookie,
  generateUsername,
  EMPLOYER_REGISTRATION_CLOSED,
  generateUniqueUsername,
  isPhoneAlreadyTaken,
  readOptionalEmployerPhone,
  userPayload,
  EMAIL_SIGNUP_BUSY_MESSAGE,
};
