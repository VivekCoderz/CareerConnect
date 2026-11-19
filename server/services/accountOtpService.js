const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/sendEmail");
const { consumeWindow } = require("./otpService");

// Codes for account settings: 6 digits, valid 10 minutes, 5 wrong tries, a new code at most
// once a minute and 5 times an hour per purpose.
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const EMAIL_COPY = {
  verify_old_email: {
    subject: "Your E2Job verification code",
    heading: "Confirm it's you",
    body: "Use this code to confirm it's you and set a new password for your E2Job account:",
  },
  verify_new_email: {
    subject: "Confirm your new E2Job email",
    heading: "Confirm your new email",
    body: "Use this code to make this address the email for your E2Job account:",
  },
};

class OtpError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const createAndSend = async (user, purpose, target) => {
  const now = Date.now();
  const existing = await Otp.findOne({ user: user._id, purpose });
  if (existing && now - existing.lastSentAt.getTime() < RESEND_AFTER_MS) {
    const retryAfter = Math.ceil((RESEND_AFTER_MS - (now - existing.lastSentAt.getTime())) / 1000);
    throw new OtpError("RESEND_TOO_SOON", `Please wait ${retryAfter} seconds before requesting a new code.`, { retryAfter });
  }
  if (!(await consumeWindow(`account_otp:${purpose}`, String(user._id), MAX_SENDS_PER_HOUR, 60 * 60 * 1000))) {
    throw new OtpError("TOO_MANY_SENDS", "Too many codes requested. Please try again in an hour.");
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const record = await Otp.findOneAndUpdate(
    { user: user._id, purpose },
    {
      $set: {
        target,
        codeHash: await bcrypt.hash(code, 10),
        attempts: 0,
        expiresAt: new Date(now + CODE_TTL_MS),
        lastSentAt: new Date(now),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const copy = EMAIL_COPY[purpose];
  const delivery = await sendEmail({
    kind: "otp",
    to: target,
    subject: copy.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af; margin-bottom: 8px;">${copy.heading}</h2>
        <p style="color: #475569;">Hi ${user.fullName},</p>
        <p style="color: #475569;">${copy.body}</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  if (delivery?.error || (isProduction && delivery?.messageId === "simulated-email")) {
    await Otp.deleteOne({ _id: record._id });
    throw new OtpError("SEND_FAILED", "We couldn't send the code right now. Please try again later.");
  }
};

// Returns the address the code was sent to. Throws OTP_INVALID (with attemptsLeft),
// OTP_EXPIRED or OTP_LOCKED.
const verify = async (user, purpose, code) => {
  const now = new Date();
  // Count the attempt before comparing, so parallel guesses can't go past the limit.
  const record = await Otp.findOneAndUpdate(
    { user: user._id, purpose, expiresAt: { $gt: now }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" }
  ).select("+codeHash");

  if (!record) {
    const stale = await Otp.findOne({ user: user._id, purpose });
    if (stale && stale.expiresAt > now) {
      throw new OtpError("OTP_LOCKED", "Too many incorrect attempts. Please request a new code.");
    }
    throw new OtpError("OTP_EXPIRED", "This code has expired. Please request a new code.");
  }

  const cleanCode = String(code || "").trim();
  if (/^\d{6}$/.test(cleanCode) && (await bcrypt.compare(cleanCode, record.codeHash))) {
    await Otp.deleteOne({ _id: record._id });
    return record.target;
  }

  const attemptsLeft = MAX_ATTEMPTS - record.attempts;
  if (attemptsLeft <= 0) {
    throw new OtpError("OTP_LOCKED", "Too many incorrect attempts. Please request a new code.");
  }
  throw new OtpError(
    "OTP_INVALID",
    `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`,
    { attemptsLeft }
  );
};

module.exports = { createAndSend, verify, OtpError };
