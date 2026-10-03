// Daily email budget. Brevo's free plan sends about 300 emails a day, and signup
// OTPs must never run out, so non-OTP emails (application updates, digests) get a
// smaller share: NOTIFICATION_EMAIL_DAILY_BUDGET, default 150. Counts live in
// MongoDB so they survive restarts.

const EmailUsage = require("../models/EmailUsage");

const istDay = (date = new Date()) =>
  new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const notificationBudget = () => {
  const parsed = parseInt(process.env.NOTIFICATION_EMAIL_DAILY_BUDGET, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 150;
};

/** Records one OTP email. OTPs are never blocked here. */
const recordOtpEmail = async () => {
  await EmailUsage.updateOne({ day: istDay(), kind: "otp" }, { $inc: { count: 1 } }, { upsert: true })
    .catch((err) => console.warn("Email usage count failed:", err.message));
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

module.exports = { recordOtpEmail, reserveNotificationEmail, releaseNotificationEmail, istDay, notificationBudget };
