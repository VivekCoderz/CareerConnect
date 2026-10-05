const SibApiV3Sdk = require("sib-api-v3-sdk");
const axios = require("axios");
const { maskEmail } = require("../services/emailValidationService");
const { recordOtpEmail, isBrevoQuotaUsed } = require("../services/emailBudget");

// Logs never contain full recipient addresses (personal data); only masked ones.
const maskedRecipients = (recipients) => recipients.map((r) => maskEmail(r?.email)).join(", ");

// Provider error text can echo addresses back; mask them before logging or returning.
const EMAIL_PATTERN = /[^\s"'<>@,;:]+@[^\s"'<>@,;:]+\.[a-z]{2,}/gi;
const redact = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return text.replace(EMAIL_PATTERN, (match) => maskEmail(match)).slice(0, 500);
};

// Brevo answers 402 / "not_enough_credits" when the plan's credits or daily limit are used
// up (switch to the fallback), and 429 for a short rate limit (wait and retry Brevo).
// Returns "credits", "rate" or null.
const brevoLimitKind = (error) => {
  const status = error?.status || error?.response?.status;
  const body = error?.response?.body || {};
  const text = `${body.code || ""} ${body.message || ""}`;
  if (status === 402 || /not_enough_credits|credits?\b|daily (sending )?limit|quota/i.test(text)) return "credits";
  if (status === 429) return "rate";
  return null;
};

// Wait before retrying Brevo after a 429 (BREVO_RATE_LIMIT_RETRY_MS, default 1.5 s).
const rateLimitRetryDelay = () => {
  const parsed = parseInt(process.env.BREVO_RATE_LIMIT_RETRY_MS, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 1500;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeRecipients = (to) => {
  if (typeof to === "string") return [{ email: to.trim() }];
  if (Array.isArray(to)) {
    return to.map((item) => (typeof item === "string" ? { email: item.trim() } : item)).filter((item) => item?.email);
  }
  if (to && typeof to === "object" && to.email) return [to];
  return [];
};

const sendViaBrevo = async ({ recipients, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER;

  if (!apiKey) {
    console.error("⚠️ [Brevo sendEmail] Missing BREVO_API_KEY in environment variables!");
    return { error: "Missing Brevo API Key" };
  }

  if (!senderEmail) {
    console.error("⚠️ [Brevo sendEmail] Missing EMAIL_USER in environment variables!");
    return { error: "Missing Sender Email (EMAIL_USER)" };
  }

  try {
    // Configure Brevo API Client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications["api-key"].apiKey = apiKey;
    // The SDK waits 60 s by default; fail fast so the fallback can run and requests don't hang.
    defaultClient.timeout = 10000;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Sender configuration (matches verified email in Brevo)
    sendSmtpEmail.sender = { name: "E2Job", email: senderEmail.trim() };
    sendSmtpEmail.to = recipients;
    sendSmtpEmail.subject = subject;
    if (html) sendSmtpEmail.htmlContent = html;
    if (text) sendSmtpEmail.textContent = text;

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("--> [Brevo sendEmail] Email Sent Successfully! MessageId:", data?.messageId || "brevo-sent");
    return { ...data, messageId: data?.messageId || "brevo-sent" };
  } catch (error) {
    // Never log the raw error: it carries the request, including the api-key header.
    const errorDetails = redact(error?.response?.body || error?.message || "Unknown Brevo error");
    console.error(`--> [Brevo sendEmail] Failed (status ${error?.status || error?.response?.status || "n/a"}):`, errorDetails);
    return { error: errorDetails, limit: brevoLimitKind(error) };
  }
};

// ─── Fallback provider (HTTPS only; Render blocks SMTP) ──────────────────────
// FALLBACK_EMAIL_PROVIDER: "resend" or "mailjet"
// FALLBACK_EMAIL_API_KEY:  Resend API key, or "apiKey:secretKey" for Mailjet
// FALLBACK_EMAIL_FROM:     sender address verified with that provider (defaults to EMAIL_USER)
// Only OTP emails use it, so the fallback's small free quota is kept for signups.

const FALLBACK_SENDERS = {
  resend: async ({ apiKey, from, recipients, subject, html, text }) => {
    const { data } = await axios.post(
      "https://api.resend.com/emails",
      { from: `E2Job <${from}>`, to: recipients.map((r) => r.email), subject, html, text },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 }
    );
    return data?.id;
  },
  mailjet: async ({ apiKey, from, recipients, subject, html, text }) => {
    const [username, password] = apiKey.split(":");
    const { data } = await axios.post(
      "https://api.mailjet.com/v3.1/send",
      {
        Messages: [{
          From: { Email: from, Name: "E2Job" },
          To: recipients.map((r) => ({ Email: r.email })),
          Subject: subject,
          HTMLPart: html,
          TextPart: text,
        }],
      },
      { auth: { username, password }, timeout: 10000 }
    );
    return data?.Messages?.[0]?.To?.[0]?.MessageID;
  },
};

const fallbackConfig = () => {
  const provider = process.env.FALLBACK_EMAIL_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.FALLBACK_EMAIL_API_KEY?.trim();
  const from = (process.env.FALLBACK_EMAIL_FROM || process.env.EMAIL_USER)?.trim();
  if (!FALLBACK_SENDERS[provider] || !apiKey || !from) return null;
  return { provider, apiKey, from };
};

const FALLBACK_ENV = ["FALLBACK_EMAIL_PROVIDER", "FALLBACK_EMAIL_API_KEY", "FALLBACK_EMAIL_FROM"];

/**
 * Called once at server startup. Logs one warning when the fallback email settings are
 * half set (some but not all of the three) or name an unknown provider, so the fallback
 * isn't silently off. Never logs values (the key is secret) and never throws.
 * Returns the warning text, or null when the settings are fine or all unset.
 */
const warnOnFallbackEmailConfig = () => {
  const set = FALLBACK_ENV.filter((name) => process.env[name]?.trim());
  if (set.length === 0) return null;

  const problems = [];
  const missing = FALLBACK_ENV.filter((name) => !set.includes(name));
  if (missing.length) problems.push(`missing ${missing.join(", ")}`);
  const provider = process.env.FALLBACK_EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider && !FALLBACK_SENDERS[provider]) {
    problems.push(`FALLBACK_EMAIL_PROVIDER must be one of: ${Object.keys(FALLBACK_SENDERS).join(", ")}`);
  }
  if (!problems.length) return null;

  const warning = `[sendEmail] Fallback email provider is not configured correctly (${problems.join("; ")}). ` +
    "OTP emails will use Brevo only.";
  console.warn(warning);
  return warning;
};

const sendViaFallback = async ({ provider, apiKey, from }, message) => {
  try {
    const messageId = await FALLBACK_SENDERS[provider]({ apiKey, from, ...message });
    console.log(`--> [${provider} sendEmail] Email Sent Successfully! MessageId:`, messageId || `${provider}-sent`);
    return { messageId: messageId || `${provider}-sent` };
  } catch (error) {
    // Only status and the provider's error text: the axios error holds the auth header.
    const errorDetails = redact(error?.response?.data?.message || error?.response?.data || error?.message || "Unknown error");
    console.error(`--> [${provider} sendEmail] Failed (status ${error?.response?.status || "n/a"}):`, errorDetails);
    return { error: errorDetails };
  }
};

/** Brevo, retried once after a short wait if it answers 429 (rate limit). */
const sendViaBrevoWithRetry = async (message) => {
  const first = await sendViaBrevo(message);
  if (first.limit !== "rate") return first;
  console.warn("[sendEmail] Brevo rate limit (429), retrying once");
  await wait(rateLimitRetryDelay());
  return sendViaBrevo(message);
};

/**
 * Send email over HTTPS APIs (Render blocks SMTP ports 587/465).
 * Brevo first; a 429 rate limit is retried on Brevo once. For OTP emails (kind: "otp")
 * the fallback provider is used when Brevo is out of credits / at its daily limit (402,
 * or today's counted quota is used). If the fallback fails too, Brevo gets one last try.
 * The provider that sent an OTP is counted in EmailUsage.
 *
 * @param {Object} options
 * @param {string|string[]|Array<{email: string, name?: string}>} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML email content
 * @param {string} [options.text] - Plain text email fallback
 * @param {"otp"} [options.kind] - "otp" enables the fallback provider and OTP usage counts
 * @returns {Promise<{messageId?: string, provider?: string, error?: any}>}
 */
const sendEmail = async ({ to, subject, html, text, kind }) => {
  const recipients = normalizeRecipients(to);
  if (!recipients.length) {
    console.error("⚠️ [sendEmail] Invalid or missing recipient 'to'");
    return { error: "Invalid recipient email" };
  }

  const message = { recipients, subject, html, text };
  const isOtp = kind === "otp";
  const fallback = isOtp ? fallbackConfig() : null;

  console.log(`[sendEmail] Sending "${subject}" to ${maskedRecipients(recipients)}`);

  const sentBy = async (provider, result) => {
    if (isOtp) await recordOtpEmail(provider);
    return { ...result, provider };
  };

  // Fallback first when Brevo is known to be out of quota; if it fails, Brevo gets one try.
  const viaFallbackThenBrevo = async () => {
    const result = await sendViaFallback(fallback, message);
    if (!result.error) return sentBy(fallback.provider, result);
    console.warn(`[sendEmail] ${fallback.provider} failed, trying Brevo once more`);
    const lastTry = await sendViaBrevo(message);
    if (!lastTry.error) return sentBy("brevo", lastTry);
    return { error: result.error, provider: null };
  };

  // Today's counted Brevo quota is already used: go straight to the fallback.
  if (fallback && await isBrevoQuotaUsed()) {
    console.warn(`[sendEmail] Brevo daily quota used, sending OTP via ${fallback.provider}`);
    return viaFallbackThenBrevo();
  }

  const brevo = await sendViaBrevoWithRetry(message);
  if (!brevo.error) return sentBy("brevo", brevo);

  if (fallback && brevo.limit === "credits") {
    console.warn(`[sendEmail] Brevo out of credits / daily limit, sending OTP via ${fallback.provider}`);
    return viaFallbackThenBrevo();
  }

  return { error: brevo.error, provider: null };
};

module.exports = sendEmail;
module.exports.warnOnFallbackEmailConfig = warnOnFallbackEmailConfig;
