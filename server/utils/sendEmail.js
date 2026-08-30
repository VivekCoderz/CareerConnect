// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

/**
 * Send email utility
 * Supports Gmail auth, custom SMTP, or fallback log simulation
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    let transporter = null;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    if (transporter) {
      const from =
        process.env.EMAIL_USER
          ? `"CareerConnect" <${process.env.EMAIL_USER}>`
          : process.env.SMTP_FROM ||
            '"Geeta University - CareerConnect" <no-reply@geetauniversity.edu.in>';

      return await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });
    } else {
      console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
      return { messageId: "simulated-email" };
    }
  } catch (error) {
    console.error("sendEmail Error:", error);
    return { error };
  }
};

module.exports = sendEmail;
