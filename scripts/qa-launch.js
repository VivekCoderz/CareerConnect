#!/usr/bin/env node
// Launch QA: isolated API journeys, frontend build, and optional read-only live probes.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 1) {
  const flag = args[i];
  if (flag === "--help") {
    console.log("Usage: npm run qa:launch --prefix server -- [--api-url ORIGIN] [--web-url ORIGIN] [--report FILE]");
    console.log("Default checks use an isolated in-memory database. Live probes make GET requests only.");
    process.exit(0);
  }
  if (!["--api-url", "--web-url", "--report"].includes(flag) || !args[i + 1]) {
    console.error(`Unknown or incomplete option: ${flag}`);
    process.exit(2);
  }
  options[flag] = args[++i];
}

function origin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("Live URL must be an HTTP(S) origin without a path, credentials, or query");
  }
  return url.origin;
}

let apiOrigin;
let webOrigin;
try {
  apiOrigin = origin(options["--api-url"]);
  webOrigin = origin(options["--web-url"]);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const report = {
  createdAt: new Date().toISOString(),
  mode: "isolated tests and build; optional read-only GET probes",
  apiOrigin,
  webOrigin,
  checks: [],
};

function runCommand(name, command, commandArgs, environment) {
  console.log(`\n▶ ${name}`);
  const started = Date.now();
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024,
  });
  const passed = result.status === 0 && !result.error;
  if (!passed) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const testSummary = output.match(/Tests:\s+([^\n]+)/)?.[1]?.trim();
  const buildSummary = output.match(/✓ built in ([^\n]+)/)?.[1]?.trim();
  const detail = result.error?.message || testSummary ||
    (buildSummary ? `built in ${buildSummary}` : `exit ${result.status}`);
  report.checks.push({ name, passed, durationMs: Date.now() - started,
    detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function probe(name, base, route, verify) {
  const started = Date.now();
  try {
    const response = await fetch(new URL(route, base), {
      method: "GET",
      headers: { Accept: "application/json, text/html" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") || "";
    let body = null;
    if (contentType.includes("application/json")) body = await response.json();
    const passed = verify(response, body, contentType);
    report.checks.push({ name, passed, durationMs: Date.now() - started,
      detail: `HTTP ${response.status}; ${contentType.split(";")[0]}` });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}: HTTP ${response.status}`);
  } catch (error) {
    report.checks.push({ name, passed: false, durationMs: Date.now() - started,
      detail: error.cause?.code || error.name || "request failed" });
    console.log(`FAIL ${name}: request failed`);
  }
}

async function main() {
  // Override the real URI even if server/.env exists. Jest connects only to MongoMemoryServer.
  runCommand("isolated candidate and resume API tests", "npm", [
    "test", "--prefix", "server", "--", "--runTestsByPath",
    "__tests__/integration/launchJourney.test.js",
    "__tests__/integration/resumeAccess.test.js",
    "__tests__/integration/security.test.js",
  ], {
    ...process.env,
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:1/qa-must-not-connect",
    SESSION_SECRET: "local-qa-only-session-secret",
    JWT_SECRET: "local-qa-only-jwt-secret",
  });
  runCommand("frontend production build", "npm", ["run", "build", "--prefix", "client"], process.env);

  if (apiOrigin) {
    console.log(`\nRead-only API probes: ${apiOrigin}`);
    await probe("API health", apiOrigin, "/health", (res, body) => res.status === 200 && body?.status === "active");
    await probe("public jobs", apiOrigin, "/api/jobs?source=campus&limit=1",
      (res, body) => res.status === 200 && Array.isArray(body?.jobs));
    await probe("public internships", apiOrigin, "/api/internships?source=campus&limit=1",
      (res, body) => res.status === 200 && Array.isArray(body?.internships));
    await probe("private account rejects anonymous user", apiOrigin, "/api/auth/me",
      (res) => res.status === 401);
    await probe("private resume rejects anonymous user", apiOrigin, "/api/resume/download",
      (res) => res.status === 401);
  }
  if (webOrigin) {
    console.log(`\nRead-only web probe: ${webOrigin}`);
    await probe("login page serves HTML", webOrigin, "/login",
      (res, _body, type) => res.status === 200 && type.includes("text/html"));
  }

  report.passed = report.checks.every((check) => check.passed);
  const reportFile = path.resolve(options["--report"] || path.join(root, "qa-reports",
    `launch-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  const markdownFile = reportFile.endsWith(".json")
    ? reportFile.slice(0, -5) + ".md" : `${reportFile}.md`;
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
  const rows = report.checks.map((check) =>
    `| ${check.name} | ${check.passed ? "PASS" : "FAIL"} | ${check.detail.replace(/\|/g, "\\|")} | ${check.durationMs} ms |`);
  const markdown = [
    "# CareerConnect launch QA report", "",
    `Generated: ${report.createdAt}`,
    `Overall: **${report.passed ? "PASS" : "FAIL"}**`, "",
    "| Check | Result | Detail | Duration |",
    "| --- | --- | --- | ---: |", ...rows, "",
    "Automated checks use an isolated database. Any live probes above are read-only GET requests.",
    "Complete the manual pilot checklist in `docs/qa-launch.md` before launch.", "",
  ].join("\n");
  fs.writeFileSync(markdownFile, markdown, { mode: 0o600 });
  fs.chmodSync(reportFile, 0o600);
  fs.chmodSync(markdownFile, 0o600);
  console.log(`\n${report.passed ? "QA PASS" : "QA FAIL"} — ${report.checks.filter((item) => item.passed).length}/${report.checks.length} checks`);
  console.log(`Reports: ${markdownFile} and ${reportFile}`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`QA runner failed: ${error.message}`);
  process.exitCode = 1;
});
