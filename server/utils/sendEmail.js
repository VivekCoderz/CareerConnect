const SibApiV3Sdk = require("sib-api-v3-sdk");
const nodemailer = require("nodemailer");

const sendWithSmtp = async ({ to, subject, html, text, senderEmail }) => {
  const password = process.env.EMAIL_PASS;
  if (!senderEmail || !password) {
    return { error: "Missing BREVO_API_KEY or EMAIL_USER/EMAIL_PASS configuration" };
  }

  const smtpHost = process.env.SMTP_HOST;
  const transporter = nodemailer.createTransport(
    smtpHost
      ? {
          host: smtpHost,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || "false") === "true",
          auth: { user: senderEmail, pass: password },
        }
      : {
          service: process.env.EMAIL_SERVICE || "gmail",
          auth: { user: senderEmail, pass: password },
        }
  );

  const info = await transporter.sendMail({
    from: { name: "CareerConnect", address: senderEmail.trim() },
    to,
    subject,
    html,
    text,
  });
  console.log("--> [SMTP sendEmail] Email sent successfully:", info.messageId);
  return { messageId: info.messageId || "smtp-sent" };
};

/**
 * Send email utility via Brevo (Sendinblue) HTTP API
 * Bypasses Render SMTP port blocking (587/465) by communicating over HTTPS (port 443).
 *
 * @param {Object} options
 * @param {string|string[]|Array<{email: string, name?: string}>} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML email content
 * @param {string} [options.text] - Plain text email fallback
 * @returns {Promise<{messageId?: string, error?: any}>}
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    console.log("[Brevo sendEmail] Initiating email send to:", to);

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_USER;

    if (!senderEmail) {
      console.error("⚠️ [sendEmail] Missing EMAIL_USER in environment variables!");
      return { error: "Missing Sender Email (EMAIL_USER)" };
    }

    // Local/dev deployments may use an app-password SMTP account. Production
    // should prefer Brevo because many hosts block outbound SMTP ports.
    if (!apiKey) {
      console.warn("[sendEmail] BREVO_API_KEY is absent; using SMTP fallback.");
      return await sendWithSmtp({ to, subject, html, text, senderEmail });
    }

    // Configure Brevo API Client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications["api-key"];
    apiKeyAuth.apiKey = apiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Sender configuration (matches verified email in Brevo)
    sendSmtpEmail.sender = {
      name: "CareerConnect",
      email: senderEmail.trim(),
    };

    // Normalize 'to' to Brevo recipient format: [{ email: "..." }]
    let recipients = [];
    if (typeof to === "string") {
      recipients = [{ email: to.trim() }];
    } else if (Array.isArray(to)) {
      recipients = to.map((item) => {
        if (typeof item === "string") return { email: item.trim() };
        if (item && item.email) return item;
        return item;
      });
    } else if (to && typeof to === "object" && to.email) {
      recipients = [to];
    }

    if (!recipients.length) {
      console.error("⚠️ [Brevo sendEmail] Invalid or missing recipient 'to'");
      return { error: "Invalid recipient email" };
    }

    sendSmtpEmail.to = recipients;
    sendSmtpEmail.subject = subject;

    if (html) {
      sendSmtpEmail.htmlContent = html;
    }
    if (text) {
      sendSmtpEmail.textContent = text;
    }

    console.log(
      `[Brevo sendEmail] Sending transactional email with subject: "${subject}" to ${recipients
        .map((r) => r.email)
        .join(", ")}...`
    );

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("--> [Brevo sendEmail] Email Sent Successfully! MessageId:", data?.messageId || data);
    return {
      messageId: data?.messageId || "brevo-sent",
      ...data,
    };
  } catch (error) {
    const errorDetails = error?.response?.body || error?.message || error;
    console.error("--> [Brevo sendEmail] Error Catch Block:", errorDetails);
    return { error: errorDetails };
  }
};

module.exports = sendEmail;
