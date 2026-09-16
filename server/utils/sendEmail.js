// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

/**
 * Creates and returns an active Nodemailer transporter for Google SMTP (Gmail).
 * Reads credentials from EMAIL_USER / EMAIL_PASS (or SMTP_USER / SMTP_PASS).
 */
const getTransporter = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER)?.trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS)?.trim();

  if (!user || !pass) {
    const error = new Error(
      "Google SMTP credentials missing: EMAIL_USER (or SMTP_USER) and EMAIL_PASS (or SMTP_PASS) must be configured in server/.env."
    );
    console.error(`[sendEmail Error]: ${error.message}`);
    throw error;
  }

  // Google SMTP Transporter
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      // Automatically strip spaces if user copied Google App Password with spaces
      pass: pass.replace(/\s+/g, ""),
    },
  });
};

/**
 * Send email utility using Google SMTP (Nodemailer).
 * Throws on failure so callers like sendOTP can handle errors directly.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - HTML email body
 * @param {string} [options.text] - Plain text email body
 * @returns {Promise<Object>} info
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = getTransporter();

    const senderEmail = (process.env.EMAIL_USER || process.env.SMTP_USER)?.trim();
    const from =
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      `"CareerConnect" <${senderEmail}>`;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log(`[Email Sent] To: ${to} | Subject: "${subject}" | Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[sendEmail Error]: ${error.message || error}`);
    throw error;
  }
};

/**
 * Verify the current Google SMTP transporter connection
 * @returns {Promise<{connected: boolean, message?: string, error?: string}>}
 */
const verifyConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return {
      connected: true,
      message: "Google SMTP connection verified successfully.",
    };
  } catch (error) {
    console.error(`[sendEmail Error]: ${error.message || error}`);
    return {
      connected: false,
      error: error.message || error,
    };
  }
};

sendEmail.getTransporter = getTransporter;
sendEmail.verifyConnection = verifyConnection;

module.exports = sendEmail;