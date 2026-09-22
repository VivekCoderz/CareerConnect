const express = require("express");
const router = express.Router();

const authControllers = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiddleware");
const verifyCaptcha = require("../middleware/captchaMiddleware");
const { limitOtpAction } = require("../services/otpService");
const { sanitizeInputs } = require("../middleware/validationMiddleware");

// ==========================================
// PUBLIC — Email / Password (legacy + bcrypt)
// ==========================================
router.post("/register", sanitizeInputs, verifyCaptcha("signup"), authControllers.registerUser);
router.post("/login", sanitizeInputs, limitOtpAction("login"), verifyCaptcha("login"), authControllers.loginUser);

// ==========================================
// PUBLIC — Firebase Authentication
// ==========================================
// Called after signInWithEmailAndPassword / signInWithPopup on the frontend
router.post("/firebase-login", sanitizeInputs, limitOtpAction("login"), verifyCaptcha("firebase_login"), authControllers.firebaseLogin);

// Called after signInWithPopup(auth, googleProvider) — first-time or returning Google sign-ins (Google handles verification)
router.post("/google-auth", sanitizeInputs, limitOtpAction("login"), authControllers.googleAuth);

// ==========================================
// PROTECTED — Password Setup (Google users only)
// ==========================================
// Called when user clicks Back to Home / Cancel during first-time Google signup
router.post(
  "/cancel-google-signup",
  authMiddleware,
  authControllers.cancelGoogleSignup
);

// Requires a Google ID token; the backend sets the password on the same Firebase UID.
router.post(
  "/complete-password-setup",
  authMiddleware,
  authControllers.completePasswordSetup
);

// ==========================================
// PROTECTED — Google Onboarding (Step 3: profile info + resume)
// ==========================================
// Called after Google user has: set password → selected role → fills profile info
router.post(
  "/google-onboarding",
  authMiddleware,
  sanitizeInputs,
  authControllers.completeGoogleOnboarding
);

router.post(
  "/complete-google-onboarding",
  authMiddleware,
  sanitizeInputs,
  authControllers.completeGoogleOnboarding
);

// Called after Google employer user has: set password → fills company details
router.post(
  "/complete-employer-google-onboarding",
  authMiddleware,
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
// PUBLIC — Email & Phone checks & OTP
// ==========================================
router.post("/check-email", sanitizeInputs, authControllers.checkEmail);
router.post("/check-phone", sanitizeInputs, authControllers.checkPhone);
router.post("/send-otp", sanitizeInputs, limitOtpAction("send"), authControllers.sendOTP);
router.post("/verify-otp", sanitizeInputs, limitOtpAction("verify"), authControllers.verifyOTP);

// ==========================================
// PUBLIC — Forgot / Reset Password (3 times in 24 hours / per day)
// ==========================================
router.post("/forgot-password", sanitizeInputs, limitOtpAction("forgot"), verifyCaptcha("forgot_password"), authControllers.forgotPassword);
router.post("/verify-reset-otp", sanitizeInputs, limitOtpAction("verify-reset"), authControllers.verifyResetOTP);
router.post("/reset-password", sanitizeInputs, limitOtpAction("reset"), authControllers.resetPassword);

// ==========================================
// PUBLIC — Employer Registration
// ==========================================
router.post("/register-employer", sanitizeInputs, verifyCaptcha("employer_signup"), authControllers.registerEmployer);

module.exports = router;
