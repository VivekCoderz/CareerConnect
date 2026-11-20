// Passwords: forgot / reset with a code, and first password setup for Google accounts.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const { disconnectUser } = require("../../services/socketService.js");
const PendingOTP = require("../../models/PendingOTP.js");
const sendEmail = require("../../utils/sendEmail.js");
const getFirebaseAdmin = require("../../config/firebaseAdmin.js");
const { normalizeEmail, issueOtp, verifyOtp, consumeVerifiedOtp } = require("../../services/otpService.js");
const { validatePassword, PASSWORD_VALIDATION_ERROR, generateToken, isProduction, setTokenCookie, userPayload } = require("./shared");

// ==========================================
// COMPLETE PASSWORD SETUP
// Called after user enters password on /set-password.
// Updates password in Firebase via Firebase Admin SDK,
// hashes and stores password in MongoDB (user.password),
// sets hasPassword=true, and issues full E2Job JWT.
// ==========================================
module.exports.completePasswordSetup = async (req, res, next) => {
  try {
    const { idToken, password, keepSignedIn = false } = req.body;

    if (!password || !validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin || !idToken) {
      return res.status(401).json({ success: false, message: "A fresh Google sign-in is required." });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, message: "Google sign-in expired. Please sign in again." });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "E2Job account not found. Please sign in again.",
      });
    }

    let isGoogleProvider =
      decoded.firebase?.sign_in_provider === "google.com" ||
      Boolean(decoded.firebase?.identities?.["google.com"]) ||
      decoded.firebase?.sign_in_provider === "google";

    const normalizedTokenEmail = decoded.email?.toLowerCase();
    const isGmail = Boolean(
      normalizedTokenEmail?.endsWith("@gmail.com") || normalizedTokenEmail?.endsWith("@googlemail.com")
    );

    if (!isGoogleProvider && decoded.uid) {
      try {
        const fbUser = await admin.auth().getUser(decoded.uid);
        if (fbUser?.providerData?.some((p) => p.providerId === "google.com")) {
          isGoogleProvider = true;
        }
      } catch { /* If the Firebase lookup fails, the account stays unverified. */ }
    }

    let isEmailVerified =
      decoded.email_verified === true ||
      decoded.email_verified === "true" ||
      (isGoogleProvider && isGmail);

    if (!isEmailVerified && decoded.uid) {
      try {
        const fbUser = await admin.auth().getUser(decoded.uid);
        if (fbUser?.emailVerified || fbUser?.providerData?.some((p) => p.providerId === "google.com")) {
          isEmailVerified = true;
        }
      } catch { /* If the Firebase lookup fails, the account stays unverified. */ }
    }

    if (user.password || user.hasPassword || !user.firebaseUid ||
        user.firebaseUid !== decoded.uid ||
        user.email !== normalizedTokenEmail ||
        !isEmailVerified ||
        !isGoogleProvider) {
      return res.status(403).json({ success: false, message: "Password setup is not available for this account." });
    }

    await admin.auth().updateUser(user.firebaseUid, { password });

    // Save hashed password in MongoDB and update flags
    user.password = password; // pre-save hook will hash with bcrypt
    user.hasPassword = true;
    if (!user.authProviders.includes("email")) {
      user.authProviders.push("email");
    }
    if (!user.authProviders.includes("google")) {
      user.authProviders.push("google");
    }
    await user.save();

    // Issue full-duration JWT now that setup is complete
    const token = generateToken(user, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Password set successfully! You can now sign in with Google or email + password.",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
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

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({ success: true, message: "If this account exists, a code has been sent." });
    }

    const { code: otp, otpHash } = await issueOtp(normalizedEmail, "reset-password");

    const delivery = await sendEmail({
      kind: "otp",
      to: normalizedEmail,
      subject: "Reset your E2Job password",
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
    if (delivery?.error || (isProduction && delivery?.messageId === "simulated-email")) {
      await PendingOTP.deleteOne({ email: normalizedEmail, otpHash });
      return res.status(503).json({ success: false, message: "Password reset email is temporarily unavailable." });
    }

    return res.status(200).json({
      success: true,
      message: "If this account exists, a code has been sent.",
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

    const result = await verifyOtp(normalizeEmail(email), "reset-password", String(otp).trim(), { returnLockStatus: true });
    if (result && result.locked) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }
    const verificationToken = typeof result === "string" ? result : result?.verificationToken;
    if (!verificationToken) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      verificationToken,
    });
  } catch (error) {
    next(error);
  }
};

// ========== RESET PASSWORD ==========
module.exports.resetPassword = async (req, res, next) => {
  try {
    const { email, verificationToken, password, confirmPassword } = req.body;

    if (!email || !verificationToken || !password) {
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

    const normalizedEmail = normalizeEmail(email);
    if (!(await consumeVerifiedOtp(normalizedEmail, "reset-password", verificationToken))) {
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
    user.authVersion = (user.authVersion || 0) + 1;
    if (!user.authProviders.includes("email")) {
      user.authProviders.push("email");
    }
    await user.save();
    // Old tokens are revoked; close the sockets they opened too (H17).
    disconnectUser(user._id);

    // Also sync updated password to Firebase if user is linked
    const admin = getFirebaseAdmin();
    if (admin && user.firebaseUid) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { password });
      } catch (fbErr) {
        console.warn("[resetPassword] Firebase admin updateUser warning:", fbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
