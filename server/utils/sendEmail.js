const nodemailer = require("nodemailer");

/**
 * Send email utility
 * Supports Gmail auth, custom SMTP, or fallback log simulation
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    let transporter = null;
    console.log("Coming......... To:", to);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log("Match......... EMAIL_USER Found");
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,               // 465 ko badal kar 587 karein
        secure: false,            // 587 port ke liye false hona chahiye
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Cloud deployment SSL handshake fix
        },
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      console.log("Not Match......... Using Custom SMTP");
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    if (transporter) {
      const from = process.env.EMAIL_USER
        ? `"CareerConnect" <${process.env.EMAIL_USER}>`
        : process.env.SMTP_FROM ||
          '"Geeta University - CareerConnect" <no-reply@geetauniversity.edu.in>';

      // Timeout safety for Nodemailer call
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });

      console.log("--> Email Sent Successfully! MessageId:", info.messageId);
      return info;
    } else {
      console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
      return { messageId: "simulated-email" };
    }
  } catch (error) {
    console.error("sendEmail Error Catch Block:", error);
    return { error };
  }
};

module.exports = sendEmail;