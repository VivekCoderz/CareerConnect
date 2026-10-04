// Transactional notification emails (application, interview, offer, employer verification,
// listing moderation). OTP and password-reset emails call utils/sendEmail directly and are
// never limited by the cap here.
//
// - Daily cap: shares the one non-OTP budget in services/emailBudget.js with application
//   updates and the daily digest (NOTIFICATION_EMAIL_DAILY_BUDGET, default 150), so OTP and
//   password mail always keep the rest of Brevo's 300/day.
// - Fire and forget: queueEmail() never throws and is never awaited by request handlers.
// - Content: short plain messages with a dashboard link; user text is HTML-escaped. Callers
//   pass only what the recipient may see (no feedback, scores, notes or internal comments).

const { reserveNotificationEmail, releaseNotificationEmail, istDay, notificationBudget } = require("./emailBudget");
const sendEmail = require("../utils/sendEmail");
const { parseClientUrls } = require("../utils/clientOrigins");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clientUrl = () => parseClientUrls()[0] || "https://www.e2job.com";

/** Takes one slot from today's shared non-OTP email budget. */
async function reserveDailySlot() {
  return { allowed: await reserveNotificationEmail(), day: istDay() };
}

const releaseDailySlot = () => releaseNotificationEmail();

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
        console.warn(`[notification email] Daily budget of ${notificationBudget()} reached for ${slot.day}; skipped "${subject}"`);
        return "capped";
      }
      const result = await sendEmail({ to, subject, ...renderEmail(content) });
      if (result?.error) {
        await releaseDailySlot().catch(() => {});
        console.warn(`[notification email] "${subject}" failed:`, result.error);
        return "failed";
      }
      console.log(`[notification email] sent (${slot.day})`);
      return "sent";
    } catch (err) {
      if (slot?.allowed) await releaseDailySlot().catch(() => {});
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
  escapeHtml,
  renderEmail,
  reserveDailySlot,
  queueEmail,
  track,
  flushNotificationEmails,
};
