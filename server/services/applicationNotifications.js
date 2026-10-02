// Tells candidates when their application changes. Every change creates an in-app
// notification (free, shown in the bell icon). Email follows the launch rules:
//   good news (shortlisted, interview, offer, hired) -> email right away
//   rejected / position filled                        -> one daily summary email
// Emails use the daily notification budget (services/emailBudget.js), so signup
// OTPs are never starved. Built for bulk actions: one insertMany per call.

const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { track } = require("./notificationEmail");
const { broadcastRealtimeNotification } = require("./notificationService");
const { reserveNotificationEmail, releaseNotificationEmail } = require("./emailBudget");

const GOOD_NEWS = new Set(["Shortlisted", "Interview", "Interview Scheduled", "Selected", "Offered", "Hired"]);
const DIGEST = new Set(["Rejected", "PositionFilled"]);

const escapeHtml = (value) =>
  String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const describe = (status, role, company) => {
  const where = company ? `${role} at ${company}` : role;
  switch (status) {
    case "Shortlisted": return { title: "You've been shortlisted 🎉", message: `Good news! You've been shortlisted for ${where}.` };
    case "Interview":
    case "Interview Scheduled": return { title: "Interview stage", message: `You've moved to the interview stage for ${where}. Watch for interview details.` };
    case "Selected": return { title: "You've been selected 🎉", message: `Congratulations! You've been selected for ${where}.` };
    case "Offered": return { title: "Offer on the way 🎉", message: `You've reached the offer stage for ${where}.` };
    case "Hired": return { title: "Hired 🎉", message: `Congratulations! You've been hired for ${where}.` };
    case "Rejected": return { title: "Application update", message: `Thank you for applying for ${where}. The employer has decided not to move forward with your application this time.` };
    case "PositionFilled": return { title: "Position closed", message: `The ${where} position has been filled or closed. Keep exploring new opportunities on CareerConnect.` };
    default: return { title: "Application update", message: `Your application for ${where} is now: ${status}.` };
  }
};

const appUrl = () => (process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/$/, "");

const emailHtml = (name, items) => `
  <p>Hi ${escapeHtml(name || "there")},</p>
  ${items.map((i) => `<p><strong>${escapeHtml(i.title)}</strong><br>${escapeHtml(i.message)}</p>`).join("")}
  <p><a href="${appUrl()}/applications">View your applications on CareerConnect</a></p>
  <p style="color:#64748b;font-size:12px">CareerConnect never asks candidates for money. Report anyone who does.</p>`;

const sendGoodNewsEmails = async (items) => {
  for (const item of items) {
    if (!item.email) continue;
    if (!(await reserveNotificationEmail())) {
      // Budget used for today: the in-app notification still reaches the candidate.
      await Notification.updateOne({ _id: item.notificationId }, { $set: { "metadata.emailDigest": true, "metadata.digestSent": false } });
      continue;
    }
    try {
      const result = await sendEmail({ to: item.email, subject: item.title, html: emailHtml(item.name, [item]) });
      if (result?.error) throw new Error(String(result.error));
    } catch (err) {
      await releaseNotificationEmail();
      console.warn(`Application email failed for ${item.notificationId}: ${err.message}`);
    }
  }
};

/**
 * applications: plain objects with _id, candidateId, opportunityTitle, companyName.
 * status: an application status, or "PositionFilled" when a listing closes.
 * stageName (optional): the pipeline stage reached, used in the message for stage moves.
 * Returns the created notifications. Emails are sent in the background.
 */
const notifyApplicationUpdates = async (applications, status, { senderId = null, stageName = null } = {}) => {
  const targets = applications.filter((a) => a?.candidateId);
  if (targets.length === 0) return [];

  const users = await User.find({ _id: { $in: targets.map((a) => a.candidateId) } }).select("email fullName").lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const digest = DIGEST.has(status);

  const docs = targets
    .filter((a) => userById.has(String(a.candidateId)))
    .map((a) => {
      const described = describe(status, a.opportunityTitle || "this role", a.companyName);
      const { title, message } = stageName && !GOOD_NEWS.has(status) && !DIGEST.has(status)
        ? { title: "Application moved forward 🚀", message: `You've advanced to the "${stageName}" stage for ${a.opportunityTitle || "this role"}${a.companyName ? ` at ${a.companyName}` : ""}.` }
        : described;
      return {
        recipient: a.candidateId,
        recipientId: a.candidateId,
        senderId,
        sender: "CareerConnect",
        senderRole: "system",
        title,
        preview: message,
        message,
        content: message,
        notificationType: "APPLICATION_STATUS",
        category: "system",
        relatedApplicationId: a._id,
        actionUrl: "/applications",
        metadata: { status, ...(digest ? { emailDigest: true, digestSent: false } : {}) },
      };
    });
  if (docs.length === 0) return [];

  const created = await Notification.insertMany(docs, { ordered: false });
  created.forEach((n) => broadcastRealtimeNotification(n, n.recipient));

  if (GOOD_NEWS.has(status)) {
    const items = created.map((n) => {
      const user = userById.get(String(n.recipient));
      return { notificationId: n._id, email: user?.email, name: user?.fullName, title: n.title, message: n.message };
    });
    // Background work, tracked so tests can wait for it (flushNotificationEmails).
    track(new Promise(setImmediate).then(() => sendGoodNewsEmails(items))
      .catch((err) => console.warn("Application emails failed:", err.message)));
  }
  return created;
};

module.exports = { notifyApplicationUpdates, emailHtml, describe };
