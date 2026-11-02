// Daily email budget. Brevo's free plan sends about 300 emails a day, and signup
// OTPs must never run out, so non-OTP emails (application updates, digests) get a
// smaller share: NOTIFICATION_EMAIL_DAILY_BUDGET, default 150. Counts live in
// MongoDB so they survive restarts. When Brevo's own daily limit (BREVO_DAILY_LIMIT,
// default 300) is used up, utils/sendEmail.js sends OTPs through the fallback provider.

const EmailUsage = require("../models/EmailUsage");

const istDay = (date = new Date()) =>
  new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const notificationBudget = () => {
  const parsed = parseInt(process.env.NOTIFICATION_EMAIL_DAILY_BUDGET, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 150;
};

const brevoDailyLimit = () => {
  const parsed = parseInt(process.env.BREVO_DAILY_LIMIT, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 300;
};

const OTP_PROVIDERS = ["brevo", "resend", "mailjet"];

/** Records one OTP email and the provider that sent it. OTPs are never blocked here. */
const recordOtpEmail = async (provider) => {
  const inc = { count: 1 };
  if (OTP_PROVIDERS.includes(provider)) inc[`providers.${provider}`] = 1;
  await EmailUsage.updateOne({ day: istDay(), kind: "otp" }, { $inc: inc }, { upsert: true })
    .catch((err) => console.warn("Email usage count failed:", err.message));
};

/**
 * True when today's Brevo sends (notifications plus OTPs Brevo sent) have reached
 * BREVO_DAILY_LIMIT. If the count can't be read, assumes Brevo still has room.
 */
const isBrevoQuotaUsed = async () => {
  try {
    const docs = await EmailUsage.find({ day: istDay() }).lean();
    const used = docs.reduce((sum, doc) => {
      if (doc.kind !== "otp") return sum + (doc.count || 0);
      // Older documents have no per-provider counts: everything in them went through Brevo.
      const viaFallback = (doc.providers?.resend || 0) + (doc.providers?.mailjet || 0);
      return sum + Math.max((doc.count || 0) - viaFallback, 0);
    }, 0);
    return used >= brevoDailyLimit();
  } catch (err) {
    console.warn("Email usage read failed:", err.message);
    return false;
  }
};

/**
 * Reserves one non-OTP email for today. Returns false when today's budget is used,
 * in which case the caller should rely on the in-app notification instead.
 */
const reserveNotificationEmail = async () => {
  const day = istDay();
  const budget = notificationBudget();
  if (budget === 0) return false;
  try {
    const doc = await EmailUsage.findOneAndUpdate(
      { day, kind: "notification", count: { $lt: budget } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return Boolean(doc);
  } catch (err) {
    // A duplicate-key error means today's document exists but is at the limit.
    if (err.code === 11000) return false;
    throw err;
  }
};

const releaseNotificationEmail = async () => {
  await EmailUsage.updateOne({ day: istDay(), kind: "notification", count: { $gt: 0 } }, { $inc: { count: -1 } })
    .catch(() => {});
};

module.exports = {
  recordOtpEmail,
  isBrevoQuotaUsed,
  reserveNotificationEmail,
  releaseNotificationEmail,
  istDay,
  notificationBudget,
  brevoDailyLimit,
};
