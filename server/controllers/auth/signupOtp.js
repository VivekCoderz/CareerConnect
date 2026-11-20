// Email sign-up step 1: send and verify the one-time code.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const PendingOTP = require("../../models/PendingOTP.js");
const sendEmail = require("../../utils/sendEmail.js");
const { validateEmail, maskEmail } = require("../../services/emailValidationService.js");
const { normalizeEmail, issueOtp, verifyOtp } = require("../../services/otpService.js");
const { isProduction, EMAIL_SIGNUP_BUSY_MESSAGE } = require("./shared");

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

    // 1. Email Validation Protection (Timeout Added for Cloud Safety)
    let normalizedEmail = email.trim().toLowerCase();
    try {
      console.log("2. [Email Validation] Validating...");
      const validationResult = await validateEmail(email);
      
      if (!validationResult.isValid) {
        console.log("❌ [Email Validation Failed]:", maskEmail(email), validationResult?.reason);
        return res.status(400).json({
          success: false,
          field: "email",
          code: validationResult.isDisposable ? "DISPOSABLE_EMAIL_REJECTED" : "INVALID_EMAIL_DOMAIN",
          message: validationResult.reason || "Invalid email address or temporary domain.",
        });
      }
      normalizedEmail = validationResult.normalizedEmail || normalizedEmail;
    } catch (valErr) {
      console.warn("⚠️ [Email Validation Warning]: Fallback used -", valErr.message);
    }

    // 2. Already registered?
    console.log("3. [DB Check] User.findOne...");
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      console.log("❌ [User Already Exists]");
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    const { code: otp, otpHash } = await issueOtp(normalizedEmail, "verification");

    // Send email
    const delivery = await sendEmail({
      kind: "otp",
      to: normalizedEmail,
      subject: "Your E2Job verification code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e40af; margin-bottom: 8px;">Verify your email</h2>
          <p style="color: #475569;">Hi${fullName ? ` ${fullName}` : ""},</p>
          <p style="color: #475569;">Use this code to continue creating your E2Job account:</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code expires in 1 minute.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    if (delivery?.error || (isProduction && delivery?.messageId === "simulated-email")) {
      await PendingOTP.deleteOne({ email: normalizedEmail, otpHash });
      // Brevo and the fallback provider (if any) both failed: point the student to Google sign-up.
      return res.status(503).json({ success: false, code: "EMAIL_SIGNUP_BUSY", message: EMAIL_SIGNUP_BUSY_MESSAGE });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("🔥 [sendOTP Fatal Error]:", error);
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

    const normalizedEmail = normalizeEmail(email);
    const result = await verifyOtp(normalizedEmail, "verification", String(otp).trim(), { returnLockStatus: true });
    if (result && result.locked) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }
    const verificationToken = typeof result === "string" ? result : result?.verificationToken;
    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      email: normalizedEmail,
      verificationToken,
    });
  } catch (error) {
    next(error);
  }
};
