const nodemailer = require("nodemailer");

/**
 * Send email utility with strict timeout & error handling for Render
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
      secure: false, // Port 587 needs false
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s+/g, ""), // spaces remove
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000, // 10 sec timeout
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
    console.error("🔥 sendEmail Fatal Catch Error:", error.message || error);
    return { error: error.message || error };
  }
};

module.exports = sendEmail;