const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const accountController = require("../controllers/accountController");
const protect = require("../middleware/authMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");

// Limits are per signed-in user. Password checks get the tighter one.
const perUser = (max, windowMs) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => `account:${req.user._id}`,
    message: { success: false, message: "Too many requests. Please try again later." },
  });
const passwordLimiter = perUser(10, 15 * 60 * 1000);
const accountLimiter = perUser(40, 15 * 60 * 1000);

router.use(protect, sanitizeInputs);

// Change email: verify it's you (password, or a code to the current email + new password),
// then verify a code sent to the new address.
router.post("/email/verify-password", passwordLimiter, accountController.verifyPassword);
router.post("/email/send-old-otp", accountLimiter, accountController.sendOldEmailOtp);
router.post("/email/verify-old-otp", accountLimiter, accountController.verifyOldEmailOtp);
router.post("/password/reset", passwordLimiter, accountController.resetPassword);
router.post("/email/request-new", accountLimiter, accountController.requestNewEmail);
router.post("/email/confirm-new", accountLimiter, accountController.confirmNewEmail);

module.exports = router;
