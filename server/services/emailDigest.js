// Once a day, sends each candidate one summary email of their rejections and
// closed positions, instead of one email per update. Notifications that don't fit
// in today's email budget stay pending for tomorrow; the in-app notification
// already reached the candidate either way.

const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { reserveNotificationEmail, releaseNotificationEmail, istDay } = require("./emailBudget");
const { emailHtml } = require("./applicationNotifications");

const DIGEST_HOUR_IST = 18; // 6 PM IST
const MAX_ITEMS_PER_EMAIL = 20;

const sendPendingDigests = async ({ maxUsers = 500 } = {}) => {
  const pending = await Notification.aggregate([
    { $match: { "metadata.emailDigest": true, "metadata.digestSent": false } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: "$recipient", ids: { $push: "$_id" }, items: { $push: { title: "$title", message: "$message" } } } },
    { $limit: maxUsers },
  ]);

  let sent = 0;
  for (const group of pending) {
    const user = await User.findById(group._id).select("email fullName").lean();
    if (!user?.email) {
      await Notification.updateMany({ _id: { $in: group.ids } }, { $set: { "metadata.digestSent": true } });
      continue;
    }
    if (!(await reserveNotificationEmail())) break; // today's budget is used; continue tomorrow
    try {
      const items = group.items.slice(-MAX_ITEMS_PER_EMAIL);
      const result = await sendEmail({ to: user.email, subject: "Updates on your CareerConnect applications", html: emailHtml(user.fullName, items) });
      if (result?.error) throw new Error(String(result.error));
      await Notification.updateMany({ _id: { $in: group.ids } }, { $set: { "metadata.digestSent": true } });
      sent += 1;
    } catch (err) {
      await releaseNotificationEmail();
      console.warn(`Digest email failed for user ${group._id}: ${err.message}`);
    }
  }
  return sent;
};

let lastRunDay = null;
let timer = null;

/** Checks every 10 minutes and runs the digest once a day after 6 PM IST. */
const startEmailDigestScheduler = () => {
  if (timer || process.env.NODE_ENV === "test") return;
  timer = setInterval(async () => {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5 + (now.getUTCMinutes() >= 30 ? 1 : 0)) % 24;
    const day = istDay(now);
    if (istHour < DIGEST_HOUR_IST || lastRunDay === day) return;
    lastRunDay = day;
    try {
      const sent = await sendPendingDigests();
      if (sent) console.log(`Application digest: sent ${sent} summary emails`);
    } catch (err) {
      console.warn("Application digest run failed:", err.message);
    }
  }, 10 * 60 * 1000);
  timer.unref?.();
};

module.exports = { sendPendingDigests, startEmailDigestScheduler };
