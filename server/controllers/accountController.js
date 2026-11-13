const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const getFirebaseAdmin = require("../config/firebaseAdmin");
const { validateEmail } = require("../services/emailValidationService");
const { normalizeEmail } = require("../services/otpService");
const { createAndSend, verify, OtpError } = require("../services/accountOtpService");
const { generateToken, setTokenCookie, createSession, userPayload } = require("./authController");

// Changing email, signed in: prove it's you (password, or a code to the current email plus a
// new password), then verify a code sent to the new address. Each step hands the client a
// short-lived token for the next; tokens die when authVersion changes, so each works once.
const STEP_TOKEN_TTL = "10m";
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters with a letter, a number and a special character.";

const stepTokenSecret = () => {
  if (process.env.ACCOUNT_TOKEN_SECRET) return process.env.ACCOUNT_TOKEN_SECRET;
  if (!process.env.JWT_SECRET) throw new Error("ACCOUNT_TOKEN_SECRET or JWT_SECRET is required");
  // Derived, so a step token can never pass as a sign-in token.
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update("account-step-token").digest("hex");
};

const signStepToken = (user, typ) =>
  jwt.sign({ sub: String(user._id), typ, av: user.authVersion || 0, em: user.email }, stepTokenSecret(), {
    expiresIn: STEP_TOKEN_TTL,
  });

const readStepToken = (token, user, typ) => {
  try {
    const decoded = jwt.verify(String(token || ""), stepTokenSecret());
    return (
      decoded.typ === typ &&
      decoded.sub === String(user._id) &&
      decoded.av === (user.authVersion || 0) &&
      decoded.em === user.email
    );
  } catch {
    return false;
  }
};

const stepExpired = (res) =>
  res.status(400).json({
    success: false,
    code: "STEP_EXPIRED",
    message: "This session has expired. Please start again.",
  });

// "im***@example.com"
const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, Math.min(2, local.length - 1) || 1)}***@${domain}`;
};

// A reissued sign-in token keeps the length chosen at login.
const wasKeptSignedIn = (req) => {
  const raw = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  const decoded = raw ? jwt.decode(raw) : null;
  return Boolean(decoded?.exp && decoded?.iat && decoded.exp - decoded.iat > 25 * 60 * 60);
};

// After authVersion changes, keep this device signed in; every other device is signed out.
const signInAgain = async (req, res, user) => {
  if (req.session) {
    try {
      await createSession(req, user);
    } catch (sessErr) {
      console.warn("Could not refresh session after account change:", sessErr.message);
    }
  }
  const keepSignedIn = wasKeptSignedIn(req);
  const authToken = generateToken(user, keepSignedIn);
  setTokenCookie(res, authToken, keepSignedIn);
  return authToken;
};

const sendOtpError = (res, err) => {
  if (!(err instanceof OtpError)) throw err;
  // 400, not 429: the client shows its global rate-limit popup for every 429.
  const status = err.code === "SEND_FAILED" ? 503 : 400;
  return res.status(status).json({
    success: false,
    code: err.code,
    message: err.message,
    ...(err.attemptsLeft !== undefined && { attemptsLeft: err.attemptsLeft }),
    ...(err.retryAfter !== undefined && { retryAfter: err.retryAfter }),
  });
};

const securityAlert = (to, fullName, heading, text) =>
  sendEmail({
    to,
    subject: `E2Job security alert: ${heading.toLowerCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af; margin-bottom: 8px;">${heading}</h2>
        <p style="color: #475569;">Hi ${fullName},</p>
        <p style="color: #475569;">${text}</p>
        <p style="color: #94a3b8; font-size: 13px;">If you didn't make this change, contact E2Job support right away.</p>
      </div>
    `,
  }).catch((mailErr) => console.warn("[account] security alert failed:", mailErr.message));

// POST /api/account/email/verify-password { password } -> { changeToken }
exports.verifyPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    if (!user.password) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_NOT_SET",
        message: "Your account doesn't have a password yet. Use \"Forgot password?\" to set one.",
      });
    }
    const { password } = req.body || {};
    // 400, not 401: the client signs the user out on any 401.
    if (typeof password !== "string" || !password || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, code: "INVALID_PASSWORD", message: "Password is incorrect." });
    }

    return res.status(200).json({ success: true, changeToken: signStepToken(user, "email_change") });
  } catch (error) {
    next(error);
  }
};

// POST /api/account/email/send-old-otp -> { maskedEmail }
exports.sendOldEmailOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    await createAndSend(user, "verify_old_email", user.email);
    return res.status(200).json({ success: true, maskedEmail: maskEmail(user.email) });
  } catch (error) {
    try {
      return sendOtpError(res, error);
    } catch (unexpected) {
      next(unexpected);
    }
  }
};

// POST /api/account/email/verify-old-otp { otp } -> { resetToken }
exports.verifyOldEmailOtp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    const target = await verify(user, "verify_old_email", req.body?.otp);
    // The account email changed after the code was sent.
    if (target !== user.email) return stepExpired(res);

    return res.status(200).json({ success: true, resetToken: signStepToken(user, "password_reset") });
  } catch (error) {
    try {
      return sendOtpError(res, error);
    } catch (unexpected) {
      next(unexpected);
    }
  }
};

// POST /api/account/password/reset { resetToken, newPassword } -> { authToken, changeToken }
exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    const { resetToken, newPassword } = req.body || {};
    if (!readStepToken(resetToken, user, "password_reset")) return stepExpired(res);
    if (typeof newPassword !== "string" || !PASSWORD_RULE.test(newPassword)) {
      return res.status(400).json({ success: false, field: "newPassword", message: PASSWORD_RULE_MESSAGE });
    }

    // authVersion signs out other devices and makes the reset token unusable.
    user.password = newPassword; // pre-save hook hashes it
    user.hasPassword = true;
    user.authVersion = (user.authVersion || 0) + 1;
    if (!user.authProviders.includes("email")) user.authProviders.push("email");
    await user.save();

    const admin = user.firebaseUid ? getFirebaseAdmin() : null;
    if (admin) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { password: newPassword });
      } catch (fbErr) {
        console.warn("[account resetPassword] Firebase admin updateUser warning:", fbErr.message);
      }
    }

    const authToken = await signInAgain(req, res, user);
    securityAlert(user.email, user.fullName, "Your password was changed",
      "The password for your E2Job account was changed and other devices were signed out.");

    return res.status(200).json({
      success: true,
      message: "Password changed. Other devices were logged out.",
      authToken,
      changeToken: signStepToken(user, "email_change"),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/account/email/request-new { changeToken, newEmail }
exports.requestNewEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    const { changeToken, newEmail } = req.body || {};
    if (!readStepToken(changeToken, user, "email_change")) return stepExpired(res);

    let email = normalizeEmail(newEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, code: "INVALID_EMAIL", message: "Please enter a valid email address." });
    }
    try {
      const validation = await validateEmail(email);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          code: "INVALID_EMAIL",
          message: validation.reason || "Invalid email address or temporary domain.",
        });
      }
      email = validation.normalizedEmail || email;
    } catch (valErr) {
      console.warn("⚠️ [Email Validation Warning]: Fallback used -", valErr.message);
    }

    if (email === user.email) {
      return res.status(400).json({ success: false, code: "SAME_EMAIL", message: "This is already your email address." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, code: "EMAIL_TAKEN", message: "This email is already used by another account." });
    }

    await createAndSend(user, "verify_new_email", email);
    return res.status(200).json({ success: true, email });
  } catch (error) {
    try {
      return sendOtpError(res, error);
    } catch (unexpected) {
      next(unexpected);
    }
  }
};

// POST /api/account/email/confirm-new { changeToken, otp } -> { user, authToken }
exports.confirmNewEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    const { changeToken, otp } = req.body || {};
    if (!readStepToken(changeToken, user, "email_change")) return stepExpired(res);

    let newEmail;
    try {
      newEmail = await verify(user, "verify_new_email", otp);
    } catch (otpErr) {
      return sendOtpError(res, otpErr);
    }

    const taken = { success: false, code: "EMAIL_TAKEN", message: "This email is already used by another account." };
    if (await User.exists({ email: newEmail, _id: { $ne: user._id } })) return res.status(409).json(taken);

    // Firebase sign-in carries the email too, so it moves with ours.
    const oldEmail = user.email;
    const admin = user.firebaseUid ? getFirebaseAdmin() : null;
    if (admin) {
      try {
        await admin.auth().updateUser(user.firebaseUid, { email: newEmail, emailVerified: true });
      } catch (fbErr) {
        if (fbErr.code === "auth/email-already-exists") return res.status(409).json(taken);
        if (fbErr.code !== "auth/user-not-found") {
          console.error("[confirmNewEmail] Firebase updateUser failed:", fbErr.message);
          return res.status(503).json({ success: false, message: "We couldn't update your email right now. Please try again." });
        }
      }
    }
    const revertFirebase = () =>
      admin ? admin.auth().updateUser(user.firebaseUid, { email: oldEmail }).catch(() => {}) : null;

    let updated;
    try {
      updated = await User.findOneAndUpdate(
        { _id: user._id, email: oldEmail },
        { $set: { email: newEmail, isEmailVerified: true }, $inc: { authVersion: 1 } },
        { returnDocument: "after", runValidators: true }
      );
    } catch (err) {
      await revertFirebase();
      if (err.code === 11000) return res.status(409).json(taken);
      throw err;
    }
    if (!updated) {
      await revertFirebase();
      return stepExpired(res);
    }

    const authToken = await signInAgain(req, res, updated);
    securityAlert(oldEmail, updated.fullName, "Your email was changed",
      "The email for your E2Job account was changed. This address will no longer receive account emails.");

    return res.status(200).json({ success: true, message: "Email updated", user: userPayload(updated), authToken });
  } catch (error) {
    next(error);
  }
};
