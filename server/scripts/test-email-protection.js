const assert = require("assert");
const {
  validateEmail,
  isDomainBlacklisted,
  checkMxRecords,
  maskEmail,
  addDisposableDomain,
  WHITELISTED_DOMAINS,
} = require("../services/emailValidationService");

/**
 * Test Runner for Disposable Email Protection
 */

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

let passedCount = 0;
let failedCount = 0;

const runTest = async (testName, fn) => {
  try {
    process.stdout.write(`  ⏳ Running: ${testName}... `);
    await fn();
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    passedCount++;
  } catch (err) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.error(`    ${colors.red}Error: ${err.message}${colors.reset}`);
    failedCount++;
  }
};

const runAllTests = async () => {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🛡️ CareerConnect Disposable Email Protection Test Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  // ─── 1. Valid Standard & Institutional Emails ─────────────────────────────────
  console.log(`${colors.bold}1. Legitimate Email Providers & Whitelist Fast-Path${colors.reset}`);

  await runTest("Accept standard Gmail address", async () => {
    const res = await validateEmail("student.test@gmail.com");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
    assert.strictEqual(res.normalizedEmail, "student.test@gmail.com");
  });

  await runTest("Accept standard Outlook address", async () => {
    const res = await validateEmail("recruiter@outlook.com");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  await runTest("Accept standard Yahoo address", async () => {
    const res = await validateEmail("candidate@yahoo.com");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  await runTest("Accept ProtonMail address", async () => {
    const res = await validateEmail("user@proton.me");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  await runTest("Accept Apple iCloud address", async () => {
    const res = await validateEmail("user@icloud.com");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  await runTest("Accept Geeta University institutional domain", async () => {
    const res = await validateEmail("student@geetauniversity.edu.in");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  await runTest("Accept general .edu and .ac.in institutional domains", async () => {
    const res = await validateEmail("scholar@iitd.ac.in");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isDisposable, false);
  });

  // ─── 2. Disposable Email Domains Detection ────────────────────────────────────
  console.log(`\n${colors.bold}2. Temporary & Disposable Domain Detection${colors.reset}`);

  await runTest("Block Mailinator domain", async () => {
    const res = await validateEmail("attacker@mailinator.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block 10MinuteMail domain", async () => {
    const res = await validateEmail("fakeuser@10minutemail.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block TempMail domain", async () => {
    const res = await validateEmail("bot@tempmail.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block GuerrillaMail domain", async () => {
    const res = await validateEmail("spammer@guerrillamail.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block Yopmail domain", async () => {
    const res = await validateEmail("temp@yopmail.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block Sharklasers domain", async () => {
    const res = await validateEmail("temp@sharklasers.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block TrashMail domain", async () => {
    const res = await validateEmail("user@trashmail.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  await runTest("Block sub-domains of disposable providers (e.g. sub.mailinator.com)", async () => {
    const res = await validateEmail("test@sub.mailinator.com");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  // ─── 3. Invalid Syntax & Normalization ─────────────────────────────────────────
  console.log(`\n${colors.bold}3. Email Normalization & Syntax Validation${colors.reset}`);

  await runTest("Handle whitespace and mixed-case normalization", async () => {
    const res = await validateEmail("   Student.Candidate@GMAIL.COM   ");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalizedEmail, "student.candidate@gmail.com");
  });

  await runTest("Reject missing '@' symbol", async () => {
    const res = await validateEmail("invalidusergmail.com");
    assert.strictEqual(res.isValid, false);
  });

  await runTest("Reject missing domain", async () => {
    const res = await validateEmail("invaliduser@");
    assert.strictEqual(res.isValid, false);
  });

  await runTest("Reject double '@' symbols", async () => {
    const res = await validateEmail("invalid@@gmail.com");
    assert.strictEqual(res.isValid, false);
  });

  await runTest("Reject spaces within email address", async () => {
    const res = await validateEmail("user name@gmail.com");
    assert.strictEqual(res.isValid, false);
  });

  // ─── 4. DNS & MX Records Validation ──────────────────────────────────────────
  console.log(`\n${colors.bold}4. DNS / MX Records & Non-Existent Domains${colors.reset}`);

  await runTest("Reject non-existent domain without MX records", async () => {
    const fakeDomainEmail = "user@thisdomaindefinitelydoesnotexist99881122.xyz";
    const res = await validateEmail(fakeDomainEmail, { checkDns: true });
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, false);
  });

  // ─── 5. Privacy & Security Utilities ──────────────────────────────────────────
  console.log(`\n${colors.bold}5. Privacy Masking & Security Caching${colors.reset}`);

  await runTest("Mask email for privacy logs correctly", async () => {
    const masked1 = maskEmail("imran@gmail.com");
    assert.strictEqual(masked1, "i***n@gmail.com");

    const masked2 = maskEmail("ab@yahoo.com");
    assert.strictEqual(masked2, "a***@yahoo.com");

    const masked3 = maskEmail("test.student@outlook.com");
    assert.strictEqual(masked3, "t***t@outlook.com");
  });

  await runTest("Verify high-performance caching (sub-millisecond second query)", async () => {
    const email = "performance.test@gmail.com";
    const t0 = Date.now();
    const res1 = await validateEmail(email);
    const t1 = Date.now();

    const t2 = Date.now();
    const res2 = await validateEmail(email);
    const t3 = Date.now();

    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res2.isValid, true);
    assert.strictEqual(res2.cached, true);
    assert.ok(t3 - t2 <= 5, "Cached response should resolve in <= 5ms");
  });

  await runTest("Dynamic runtime disposable domain registration", async () => {
    const newDomain = "fresh-temp-mail-provider.xyz";
    addDisposableDomain(newDomain);
    const res = await validateEmail(`user@${newDomain}`);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.isDisposable, true);
  });

  // ─── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}Test Results Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset} ${passedCount}`);
  console.log(`  ${failedCount > 0 ? colors.red : colors.green}✗ Failed:${colors.reset} ${failedCount}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
};

runAllTests().catch((err) => {
  console.error("Test runner encountered critical error:", err);
  process.exit(1);
});
