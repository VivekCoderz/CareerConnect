const nodemailer = require("nodemailer");

/**
 * Send email utility - Production Fix for Render IPv6 ENETUNREACH
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    console.log("Coming......... To:", to);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ EMAIL_USER or EMAIL_PASS missing!");
      return { error: "Missing Email Credentials" };
    }

    console.log("Match......... EMAIL_USER Found:", process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // 587 port requires false
      requireTLS: true,
      family: 4, // 👈 CRITICAL FIX: Directs Node.js to use IPv4 instead of IPv6 on Render
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s+/g, ""), // clean accidental spaces
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    const from = `"CareerConnect" <${process.env.EMAIL_USER}>`;

    console.log("Attempting transporter.sendMail()...");
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("--> Email Sent Successfully! MessageId:", info.messageId);
    return info;
  } catch (error) {
    console.error("sendEmail Error Catch Block:", error);
    return { error };
  }
};

module.exports = sendEmail;