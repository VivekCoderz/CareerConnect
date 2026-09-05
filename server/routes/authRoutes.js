const express = require("express");
const router = express.Router();

const authControllers = require("../controllers/authController.js");
const authMiddleware = require("../middleware/authMiddleware");
const verifyCaptcha = require("../middleware/captchaMiddleware");
const { authLimiter, otpLimiter, resetLimiter } = require("../middleware/rateLimitMiddleware");

// ==========================================
// PUBLIC — Email / Password (legacy + bcrypt)
// ==========================================
router.post("/register", authLimiter, verifyCaptcha, authControllers.registerUser);
router.post("/login", authLimiter, verifyCaptcha, authControllers.loginUser);

// ==========================================
// PUBLIC — Firebase Authentication
// ==========================================
// Called after signInWithEmailAndPassword / signInWithPopup on the frontend
router.post("/firebase-login", authLimiter, verifyCaptcha, authControllers.firebaseLogin);

// Called after signInWithPopup(auth, googleProvider) — first-time Google sign-ins
router.post("/google-auth", authLimiter, verifyCaptcha, authControllers.googleAuth);

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
// PUBLIC — Email checks & OTP
// ==========================================
router.post("/check-email", authControllers.checkEmail);
router.post("/send-otp", otpLimiter, authControllers.sendOTP);
router.post("/verify-otp", authControllers.verifyOTP);

// ==========================================
// PUBLIC — Forgot / Reset Password
// ==========================================
router.post("/forgot-password", otpLimiter, verifyCaptcha, authControllers.forgotPassword);
router.post("/verify-reset-otp", resetLimiter, authControllers.verifyResetOTP);
router.post("/reset-password", resetLimiter, authControllers.resetPassword);

// ==========================================
// PUBLIC — Employer Registration
// ==========================================
router.post("/register-employer", authLimiter, verifyCaptcha, authControllers.registerEmployer);

module.exports = router;
