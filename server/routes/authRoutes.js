const express = require("express");
const router = express.Router();

const authControllers = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiddleware");
const verifyCaptcha = require("../middleware/captchaMiddleware");
const { authLimiter, otpLimiter, resetLimiter } = require("../middleware/rateLimitMiddleware");
const { sanitizeInputs, validateEmailMiddleware } = require("../middleware/validationMiddleware");

// ==========================================
// PUBLIC — Email / Password (legacy + bcrypt)
// ==========================================
router.post(
  "/register",
  authLimiter,
  sanitizeInputs,
  validateEmailMiddleware,
  verifyCaptcha,
  authControllers.registerUser
);

router.post(
  "/login",
  authLimiter,
  sanitizeInputs,
  verifyCaptcha,
  authControllers.loginUser
);

// ==========================================
// PUBLIC — Firebase Authentication
// ==========================================
// Called after signInWithEmailAndPassword / signInWithPopup on the frontend
router.post(
  "/firebase-login",
  authLimiter,
  sanitizeInputs,
  verifyCaptcha,
  authControllers.firebaseLogin
);

// Called after signInWithPopup(auth, googleProvider) — first-time or returning Google sign-ins
router.post(
  "/google-auth",
  authLimiter,
  sanitizeInputs,
  verifyCaptcha,
  authControllers.googleAuth
);

// ==========================================
// PROTECTED — Password Setup (Google users only)
// ==========================================
// Called after linkWithCredential(firebaseUser, EmailAuthProvider.credential(...))
// to confirm Firebase has the password provider and update MongoDB.
router.post(
  "/complete-password-setup",
  authMiddleware,
  resetLimiter,
  authControllers.completePasswordSetup
);

// ==========================================
// PROTECTED — Google Onboarding (Step 3: profile info + resume)
// ==========================================
// Called after Google user has: set password → selected role → fills profile info
router.post(
  "/complete-google-onboarding",
  authMiddleware,
  authLimiter,
  sanitizeInputs,
  authControllers.completeGoogleOnboarding
);

// Called after Google employer user has: set password → fills company details
router.post(
  "/complete-employer-google-onboarding",
  authMiddleware,
  authLimiter,
  sanitizeInputs,
  authControllers.completeEmployerGoogleOnboarding
);

// ==========================================
// PUBLIC — Logout
// ==========================================
router.post("/logout", authControllers.logoutUser);

// ==========================================
// PROTECTED — Current User
// ==========================================
router.get("/me", authMiddleware, authControllers.getMe);

router.patch(
  "/update-experience-level",
  authMiddleware,
  authControllers.updateExperienceLevel
);

// ==========================================
// PUBLIC — Email checks & OTP
// ==========================================
router.post(
  "/check-email",
  sanitizeInputs,
  validateEmailMiddleware,
  authControllers.checkEmail
);

router.post(
  "/send-otp",
  otpLimiter,
  sanitizeInputs,
  validateEmailMiddleware,
  authControllers.sendOTP
);

router.post("/verify-otp", sanitizeInputs, authControllers.verifyOTP);

// ==========================================
// PUBLIC — Forgot / Reset Password
// ==========================================
router.post(
  "/forgot-password",
  otpLimiter,
  sanitizeInputs,
  verifyCaptcha,
  authControllers.forgotPassword
);

router.post(
  "/verify-reset-otp",
  resetLimiter,
  sanitizeInputs,
  authControllers.verifyResetOTP
);

router.post(
  "/reset-password",
  resetLimiter,
  sanitizeInputs,
  authControllers.resetPassword
);

// ==========================================
// PUBLIC — Employer Registration
// ==========================================
router.post(
  "/register-employer",
  authLimiter,
  sanitizeInputs,
  validateEmailMiddleware,
  verifyCaptcha,
  authControllers.registerEmployer
);

module.exports = router;
