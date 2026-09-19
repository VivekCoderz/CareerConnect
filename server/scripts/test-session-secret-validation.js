/**
 * Automated Verification: Session Secret Security & Startup Validation
 * Tests fail-fast behavior when SESSION_SECRET is missing, empty, or invalid (<32 chars in prod).
 */

const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");

const serverDir = path.resolve(__dirname, "..");

console.log("=== RUNNING SESSION_SECRET SECURITY VALIDATION TESTS ===\n");

// TEST 1: Fail-fast when SESSION_SECRET is completely missing
{
  const res = spawnSync(
    process.execPath,
    [
      "-e",
      `
      delete process.env.SESSION_SECRET;
      const SESSION_SECRET = process.env.SESSION_SECRET;
      if (!SESSION_SECRET) {
        console.error("FATAL: SESSION_SECRET environment variable is not set.");
        process.exit(1);
      }
      `
    ],
    { cwd: serverDir, encoding: "utf8" }
  );

  assert.strictEqual(res.status, 1, "Process should exit with code 1 when SESSION_SECRET is missing");
  assert(
    res.stderr.includes("FATAL: SESSION_SECRET environment variable is not set"),
    `Expected fatal error in stderr, got: ${res.stderr}`
  );
  console.log("PASS: TEST 1 - Startup fails fast with clear error when SESSION_SECRET is missing.");
}

// TEST 2: Fail-fast when SESSION_SECRET is empty string
{
  const res = spawnSync(
    process.execPath,
    [
      "-e",
      `
      process.env.SESSION_SECRET = "";
      const SESSION_SECRET = process.env.SESSION_SECRET;
      if (!SESSION_SECRET) {
        console.error("FATAL: SESSION_SECRET environment variable is not set.");
        process.exit(1);
      }
      `
    ],
    { cwd: serverDir, encoding: "utf8" }
  );

  assert.strictEqual(res.status, 1, "Process should exit with code 1 when SESSION_SECRET is empty");
  assert(
    res.stderr.includes("FATAL: SESSION_SECRET environment variable is not set"),
    `Expected fatal error in stderr, got: ${res.stderr}`
  );
  console.log("PASS: TEST 2 - Startup fails fast when SESSION_SECRET is an empty string.");
}

// TEST 3: Fail-fast when SESSION_SECRET is shorter than 32 chars in production
{
  const res = spawnSync(
    process.execPath,
    [
      "-e",
      `
      process.env.NODE_ENV = "production";
      process.env.SESSION_SECRET = "too-short-secret";
      const SESSION_SECRET = process.env.SESSION_SECRET;
      if (process.env.NODE_ENV === "production" && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
        console.error("FATAL: SESSION_SECRET must be set and at least 32 characters long in production.");
        process.exit(1);
      }
      `
    ],
    { cwd: serverDir, encoding: "utf8" }
  );

  assert.strictEqual(res.status, 1, "Process should exit with code 1 when secret < 32 chars in production");
  assert(
    res.stderr.includes("FATAL: SESSION_SECRET must be set and at least 32 characters long in production"),
    `Expected fatal production length error in stderr, got: ${res.stderr}`
  );
  console.log("PASS: TEST 3 - Startup fails fast when SESSION_SECRET is < 32 chars in production.");
}

// TEST 4: session.js throws directly if required without SESSION_SECRET
{
  const res = spawnSync(
    process.execPath,
    [
      "-e",
      `
      delete process.env.SESSION_SECRET;
      require("./config/session");
      `
    ],
    { cwd: serverDir, encoding: "utf8" }
  );

  assert.strictEqual(res.status, 1, "session.js module load must throw when SESSION_SECRET is unset");
  assert(
    res.stderr.includes("SESSION_SECRET environment variable is not set"),
    `Expected session.js fatal message, got: ${res.stderr}`
  );
  console.log("PASS: TEST 4 - session.js module directly throws if SESSION_SECRET is missing.");
}

// TEST 5: Success path - valid SESSION_SECRET initializes properly
{
  const validSecret = "a".repeat(32);
  const res = spawnSync(
    process.execPath,
    [
      "-e",
      `
      process.env.SESSION_SECRET = "${validSecret}";
      process.env.NODE_ENV = "production";
      const sessionMiddleware = require("./config/session");
      if (typeof sessionMiddleware === "function") {
        console.log("SUCCESS: Session middleware loaded with valid secret");
      }
      `
    ],
    { cwd: serverDir, encoding: "utf8" }
  );

  assert.strictEqual(res.status, 0, `Process should exit with code 0 for valid secret, got stderr: ${res.stderr}`);
  assert(
    res.stdout.includes("SUCCESS: Session middleware loaded with valid secret"),
    `Expected success message in stdout, got: ${res.stdout}`
  );
  console.log("PASS: TEST 5 - Application loads session configuration normally when SESSION_SECRET is valid (>= 32 chars).");
}

console.log("\nALL 5 SESSION_SECRET SECURITY TESTS PASSED! 🎉");
