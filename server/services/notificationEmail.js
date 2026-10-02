// Transactional notification emails (application, interview, offer, employer verification,
// listing moderation). OTP and password-reset emails call utils/sendEmail directly and are
// never limited by the cap here.
//
// - Daily cap: at most NOTIFICATION_EMAIL_DAILY_CAP notification emails per IST day, counted
//   in the database. Brevo's free plan allows 300/day; the rest is kept for OTP/password mail.
// - Fire and forget: queueEmail() never throws and is never awaited by request handlers.
// - Content: short plain messages with a dashboard link; user text is HTML-escaped. Callers
//   pass only what the recipient may see (no feedback, scores, notes or internal comments).

const EmailDailyCount = require("../models/EmailDailyCount");
const sendEmail = require("../utils/sendEmail");
const { parseClientUrls } = require("../utils/clientOrigins");

const NOTIFICATION_EMAIL_DAILY_CAP = 200;
const CATEGORY = "notification";
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const istDay = (now = new Date()) => new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clientUrl = () => parseClientUrls()[0] || "https://careerconnect-v1.vercel.app";

/**
 * Takes one slot from today's notification-email allowance.
 * Returns { allowed, count } where count is today's total after this send.
 */
async function reserveDailySlot(now = new Date()) {
  const day = istDay(now);
  await EmailDailyCount.init(); // the unique index makes the cap atomic
  try {
    const doc = await EmailDailyCount.findOneAndUpdate(
      { day, category: CATEGORY, count: { $lt: NOTIFICATION_EMAIL_DAILY_CAP } },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return { allowed: true, count: doc.count, day };
  } catch (err) {
    // At the cap the filter matches nothing, so the upsert hits the unique index.
    if (err.code === 11000) return { allowed: false, count: NOTIFICATION_EMAIL_DAILY_CAP, day };
    throw err;
  }
}

const releaseDailySlot = (day) =>
  EmailDailyCount.updateOne({ day, category: CATEGORY, count: { $gt: 0 } }, { $inc: { count: -1 } });

/**
 * Builds the shared layout. `lines` are plain strings (escaped here); `link` is a
 * dashboard path such as "/student/dashboard?tab=applications".
 */
function renderEmail({ heading, greetingName, lines = [], linkPath, linkText = "Open your dashboard", extraLink }) {
  const url = `${clientUrl()}${linkPath || ""}`;
  const greeting = greetingName ? `Hi ${greetingName},` : "Hi,";
  const extra = extraLink
    ? `<p style="margin:0 0 12px"><a href="${escapeHtml(extraLink.url)}">${escapeHtml(extraLink.text)}</a></p>`
    : "";
  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(heading)}</h2>
<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
${lines.map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join("\n")}
${extra}<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#f59e0b;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(linkText)}</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#64748b">CareerConnect · You are receiving this because of activity on your account.</p>
</body></html>`;
  const text = [heading, "", greeting, ...lines, ...(extraLink ? [`${extraLink.text}: ${extraLink.url}`] : []), "", `${linkText}: ${url}`]
    .join("\n");
  return { html, text };
}

const pending = new Set();

/** Tracks background work so tests can wait for it. Returns the same promise. */
const track = (promise) => {
  pending.add(promise);
  promise.finally(() => pending.delete(promise)).catch(() => {});
  return promise;
};

/**
 * Sends a notification email in the background. Never throws, never blocks the caller.
 * Returns the background promise (resolves to "sent" | "capped" | "failed" | "skipped")
 * for tests; request handlers must not await it.
 */
function queueEmail({ to, subject, ...content }) {
  if (!to) return Promise.resolve("skipped");
  const job = (async () => {
    let slot;
    try {
      slot = await reserveDailySlot();
      if (!slot.allowed) {
        console.warn(`[notification email] Daily cap of ${NOTIFICATION_EMAIL_DAILY_CAP} reached for ${slot.day}; skipped "${subject}"`);
        return "capped";
      }
      const result = await sendEmail({ to, subject, ...renderEmail(content) });
      if (result?.error) {
        await releaseDailySlot(slot.day).catch(() => {});
        console.warn(`[notification email] "${subject}" failed:`, result.error);
        return "failed";
      }
      console.log(`[notification email] ${slot.count}/${NOTIFICATION_EMAIL_DAILY_CAP} sent today (${slot.day})`);
      return "sent";
    } catch (err) {
      if (slot?.allowed) await releaseDailySlot(slot.day).catch(() => {});
      console.warn(`[notification email] "${subject}" failed:`, err.message);
      return "failed";
    }
  })();
  return track(job);
}

/** Test helper: wait until all queued notifications and emails have finished. */
const flushNotificationEmails = async () => {
  while (pending.size > 0) await Promise.allSettled([...pending]);
};

module.exports = {
  NOTIFICATION_EMAIL_DAILY_CAP,
  escapeHtml,
  istDay,
  renderEmail,
  reserveDailySlot,
  queueEmail,
  track,
  flushNotificationEmails,
};
