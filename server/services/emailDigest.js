// Once a day, sends each candidate one summary email of their rejections and
// closed positions, instead of one email per update. The worker runs it at 6 PM IST
// (jobs/scheduledJobs.js). Notifications that don't fit in today's email budget stay
// pending for tomorrow; the in-app notification already reached the candidate either way.

const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { reserveNotificationEmail, releaseNotificationEmail } = require("./emailBudget");
const { emailHtml } = require("./applicationNotifications");

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
      const result = await sendEmail({ to: user.email, subject: "Updates on your E2Job applications", html: emailHtml(user.fullName, items) });
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

module.exports = { sendPendingDigests };
