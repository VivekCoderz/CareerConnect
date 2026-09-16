const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const sendEmail = require("../utils/sendEmail");

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

async function testGoogleSmtp() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 📧 CareerConnect Google SMTP (Gmail) Test Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  const user = (process.env.EMAIL_USER || process.env.SMTP_USER)?.trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS)?.trim();

  console.log("Configuration detected:");
  console.log(`  Provider: Gmail (Google SMTP)`);
  console.log(`  User: ${user ? user : `${colors.yellow}<Not Configured in .env>${colors.reset}`}`);
  console.log(`  Password: ${pass ? "******** (Configured)" : `${colors.yellow}<Not Configured in .env>${colors.reset}`}\n`);

  if (!user || !pass) {
    console.log(`${colors.red}✗ Google SMTP credentials missing in server/.env.${colors.reset}`);
    console.log(`Please add your Gmail and 16-character Google App Password in server/.env:`);
    console.log(`  EMAIL_USER=your-email@gmail.com`);
    console.log(`  EMAIL_PASS=xxxx xxxx xxxx xxxx\n`);
    process.exit(1);
  }

  // 1. Test SMTP Transporter Verification
  process.stdout.write(`  ⏳ Verifying Google SMTP connection... `);
  const verifyRes = await sendEmail.verifyConnection();
  if (!verifyRes.connected) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.error(`    ${colors.red}Connection error: ${verifyRes.error}${colors.reset}\n`);
    process.exit(1);
  }
  console.log(`${colors.green}✓ CONNECTED${colors.reset}`);
  console.log(`    ${colors.green}${verifyRes.message}${colors.reset}\n`);

  // 2. Dispatch a Test Email
  const recipient = process.argv[2] || process.env.TEST_EMAIL_TO || user;
  process.stdout.write(`  ⏳ Sending test email to ${recipient}... `);
  try {
    const sendRes = await sendEmail({
      to: recipient,
      subject: "CareerConnect - Google SMTP Test Verification",
      text: "Success! Your CareerConnect backend is successfully configured with Google SMTP.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-bottom: 12px;">Google SMTP Connected!</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            This is a confirmation email from <strong>CareerConnect</strong> testing Google SMTP integration.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1e293b; font-weight: 600;">Status: Verified & Operational</p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Provider: Gmail / Google SMTP</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log(`${colors.green}✓ SENT${colors.reset}`);
    console.log(`    ${colors.green}Message ID: ${sendRes.messageId}${colors.reset}\n`);
    console.log(`${colors.bold}${colors.green}🎉 Google SMTP tests passed successfully!${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.error(`    ${colors.red}Send error: ${error.message || error}${colors.reset}\n`);
    process.exit(1);
  }
}

testGoogleSmtp().catch((err) => {
  console.error("Test execution failed:", err.message || err);
  process.exit(1);
});
