const nodemailer = require("nodemailer");

/**
 * Send email utility
 * Supports Gmail auth, custom SMTP, or fallback log simulation
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    let transporter = null;
    console.log("Coming.........")
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log("Match.........")
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Port 465 ke liye true
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false // Cloud hosting network handshake issues avoid karne ke liye
        }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        console.log("Not Match.........")
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