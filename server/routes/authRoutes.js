const express = require("express");
const router = express.Router();

const authControllers = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiddleware");
const verifyCaptcha = require("../middleware/captchaMiddleware");
const {
  loginLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimitMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");

// ==========================================
// PUBLIC — Email / Password (legacy + bcrypt)
// ==========================================
router.post("/register", sanitizeInputs, verifyCaptcha, authControllers.registerUser);
router.post("/login", loginLimiter, sanitizeInputs, verifyCaptcha, authControllers.loginUser);

// ==========================================
// PUBLIC — Firebase Authentication
// ==========================================
// Called after signInWithEmailAndPassword / signInWithPopup on the frontend
router.post("/firebase-login", loginLimiter, sanitizeInputs, verifyCaptcha, authControllers.firebaseLogin);

// Called after signInWithPopup(auth, googleProvider) — first-time or returning Google sign-ins
router.post("/google-auth", sanitizeInputs, verifyCaptcha, authControllers.googleAuth);

// ==========================================
// PROTECTED — Password Setup (Google users only)
// ==========================================
// Called after linkWithCredential(firebaseUser, EmailAuthProvider.credential(...))
// to confirm Firebase has the password provider and update MongoDB.
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
  authControllers.updateExperienceLevel,
);

// ==========================================
// PUBLIC — Email & Phone checks & OTP
// ==========================================
router.post("/check-email", sanitizeInputs, authControllers.checkEmail);
router.post("/check-phone", sanitizeInputs, authControllers.checkPhone);
router.post("/send-otp", sanitizeInputs, authControllers.sendOTP);
router.post("/verify-otp", sanitizeInputs, authControllers.verifyOTP);

// ==========================================
// PUBLIC — Forgot / Reset Password (3 times in 24 hours / per day)
// ==========================================
router.post("/forgot-password", passwordResetLimiter, sanitizeInputs, verifyCaptcha, authControllers.forgotPassword);
router.post("/verify-reset-otp", sanitizeInputs, authControllers.verifyResetOTP);
router.post("/reset-password", passwordResetLimiter, sanitizeInputs, authControllers.resetPassword);

// ==========================================
// PUBLIC — Employer Registration
// ==========================================
router.post("/register-employer", sanitizeInputs, verifyCaptcha, authControllers.registerEmployer);

module.exports = router;
