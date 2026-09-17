const crypto = require("crypto");
const PendingOTP = require("../models/PendingOTP");
const OtpRateLimit = require("../models/OtpRateLimit");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const hashOtp = (email, purpose, otp) => {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET or JWT_SECRET is required");
  return crypto.createHmac("sha256", secret)
    .update(`${purpose}:${email}:${otp}`)
    .digest("hex");
};

const issueOtp = async (email, purpose) => {
  const code = String(crypto.randomInt(100000, 1000000));
  const otpHash = hashOtp(email, purpose, code);
  await PendingOTP.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        purpose,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        verifiedAt: null,
        verificationTokenHash: null,
        attempts: 0,
      },
      $unset: { otp: "", isVerified: "", tempData: "" },
    },
    { upsert: true, returnDocument: "after" }
  );
  return { code, otpHash };
};

const verifyOtp = async (email, purpose, code) => {
  if (!/^\d{6}$/.test(code)) return null;
  const otpHash = hashOtp(email, purpose, code);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const now = new Date();
  const record = await PendingOTP.findOneAndUpdate(
    { email, purpose, expiresAt: { $gt: now }, verifiedAt: null, attempts: { $lt: MAX_ATTEMPTS } },
    [{
      $set: {
        attempts: { $add: ["$attempts", 1] },
        verifiedAt: { $cond: [{ $eq: ["$otpHash", otpHash] }, now, null] },
        verificationTokenHash: { $cond: [{ $eq: ["$otpHash", otpHash] }, verificationTokenHash, null] },
      },
    }],
    { returnDocument: "after", updatePipeline: true, projection: { otpHash: 1, verifiedAt: 1, verificationTokenHash: 1 } }
  );
  return record && record.otpHash === otpHash && record.verifiedAt ? verificationToken : null;
};

const consumeVerifiedOtp = async (email, purpose, token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const record = await PendingOTP.findOneAndDelete({
    email,
    purpose,
    verificationTokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    verifiedAt: { $ne: null },
    expiresAt: { $gt: new Date() },
    attempts: { $lte: MAX_ATTEMPTS },
  });
  return Boolean(record);
};

const consumeWindow = async (scope, value, limit, windowMs) => {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const id = crypto.createHash("sha256").update(`${scope}:${value}:${bucket}`).digest("hex");
  const expiresAt = new Date((bucket + 1) * windowMs + windowMs);
  let record;
  try {
    record = await OtpRateLimit.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    record = await OtpRateLimit.findOneAndUpdate(
      { _id: id }, { $inc: { count: 1 } }, { returnDocument: "after" }
    );
  }
  return Boolean(record && record.count <= limit);
};

const limitOtpAction = (action) => async (req, res, next) => {
  try {
    const email = normalizeEmail(action === "login"
      ? (req.body?.email || req.body?.emailOrUsername || req.body?.username)
      : req.body?.email);
    if (!email && action !== "login") return next();
    const isSend = action === "send" || action === "forgot";
    const emailLimit = action === "forgot" ? 3 : isSend ? 5 : 10;
    const windowMs = isSend ? 60 * 60 * 1000 : 10 * 60 * 1000;
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const [emailAllowed, ipAllowed] = await Promise.all([
      email ? consumeWindow(`${action}:email`, email, emailLimit, windowMs) : true,
      consumeWindow(`${action}:ip`, ip, action === "login" ? 1000 : isSend ? 300 : 500, windowMs),
    ]);
    if (!emailAllowed || !ipAllowed) {
      return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { normalizeEmail, issueOtp, verifyOtp, consumeVerifiedOtp, limitOtpAction };
