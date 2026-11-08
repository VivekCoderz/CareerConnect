// Bug 5: a signed-in candidate changes their email. The new address must be confirmed
// with a code sent to it; the account keeps the old email until then.
const User = require("../models/User");
const PendingOTP = require("../models/PendingOTP");
const sendEmail = require("../utils/sendEmail.js");
const { validateEmail, maskEmail } = require("../services/emailValidationService.js");
const { normalizeEmail, issueOtp, verifyOtp, consumeVerifiedOtp } = require("../services/otpService");

const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Bound to the account, so a code for one account's change can't confirm another's.
const purposeFor = (user) => `email-change:${user._id}`;

const emailTaken = (email, userId) => User.exists({ email, _id: { $ne: userId } });

module.exports.requestEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    // Employer and admin emails are tied to company access, so they are changed by support.
    if (user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only candidate accounts can change their email here." });
    }

    // Asking for the password stops someone using a left-open session from taking the account.
    // 403, not 401: the client signs the user out on any 401.
    const { password } = req.body || {};
    if (user.password) {
      if (typeof password !== "string" || !password || !(await user.comparePassword(password))) {
        return res.status(403).json({ success: false, code: "INVALID_PASSWORD", message: "Password is incorrect." });
      }
    }

    let newEmail = normalizeEmail(req.body?.email);
    if (!newEmail) return res.status(400).json({ success: false, field: "email", message: "Enter your new email." });
    try {
      const result = await validateEmail(newEmail);
      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          field: "email",
          message: result.reason || "Invalid email address or temporary domain.",
        });
      }
      newEmail = result.normalizedEmail || newEmail;
    } catch (err) {
      console.warn("[Email change] validation fallback:", err.message);
    }

    if (newEmail === user.email) {
      return res.status(400).json({ success: false, field: "email", message: "This is already your email." });
    }
    if (await emailTaken(newEmail, user._id)) {
      return res.status(409).json({ success: false, field: "email", message: "Email is already registered" });
    }

    const { code, otpHash } = await issueOtp(newEmail, purposeFor(user));
    const delivery = await sendEmail({
      kind: "otp",
      to: newEmail,
      subject: "Confirm your new E2Job email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e40af; margin-bottom: 8px;">Confirm your new email</h2>
          <p style="color: #475569;">Use this code to change the email on your E2Job account to this address:</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    if (delivery?.error || (isProduction && delivery?.messageId === "simulated-email")) {
      await PendingOTP.deleteOne({ email: newEmail, otpHash });
      return res.status(503).json({ success: false, message: "We couldn't send the code right now. Please try again later." });
    }

    return res.status(200).json({ success: true, message: "Code sent to your new email", email: newEmail });
  } catch (error) {
    next(error);
  }
};

module.exports.confirmEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    if (user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only candidate accounts can change their email here." });
    }

    const newEmail = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    if (!newEmail || !otp) {
      return res.status(400).json({ success: false, message: "Email and code are required" });
    }

    const purpose = purposeFor(user);
    const result = await verifyOtp(newEmail, purpose, otp, { returnLockStatus: true });
    if (result && result.locked) {
      return res.status(429).json({ success: false, message: "Too many failed attempts. Please request a new code." });
    }
    if (typeof result !== "string" || !(await consumeVerifiedOtp(newEmail, purpose, result))) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    // Someone may have registered the address since the code was sent.
    if (await emailTaken(newEmail, user._id)) {
      return res.status(409).json({ success: false, field: "email", message: "Email is already registered" });
    }

    const oldEmail = user.email;
    try {
      await User.updateOne({ _id: user._id }, { $set: { email: newEmail, isEmailVerified: true } });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, field: "email", message: "Email is already registered" });
      }
      throw error;
    }
    if (req.session?.user) req.session.user.email = newEmail;

    // Let the old address know, in case the change wasn't the owner's doing.
    sendEmail({
      kind: "otp",
      to: oldEmail,
      subject: "Your E2Job email was changed",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e40af; margin-bottom: 8px;">Your email was changed</h2>
          <p style="color: #475569;">The email on your E2Job account is now ${maskEmail(newEmail)}.</p>
          <p style="color: #475569;">If you didn't make this change, contact E2Job support right away.</p>
        </div>
      `,
    }).catch((err) => console.warn("[Email change] notice to old email failed:", err.message));

    return res.status(200).json({ success: true, message: "Email updated", email: newEmail });
  } catch (error) {
    next(error);
  }
};
