// Checks that scheduled jobs run exactly once when two workers share one database.
// `npm run test:scheduler` (plain Node: Agenda 6 is ESM-only, which Jest can't load here).
//
// 1. Starts an in-memory MongoDB and two worker processes at the same moment, each
//    scheduling the same fast test jobs, and records every run.
// 2. Fails if a job ever ran twice in one interval, or ran in both workers at once.
// 3. Schedules the real jobs and checks the 6 PM digest is set for 18:00 IST and not run now.

const { fork } = require("child_process");
const mongoose = require("mongoose");

const TEST_JOBS = [
  { name: "check-every-2s", interval: "2 seconds", ms: 2000 },
  { name: "check-every-3s", interval: "3 seconds", ms: 3000 },
];
const RUN_FOR_MS = 14000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Worker process: schedule the test jobs and record each run as { job, pid, start, end }.
const runChild = async () => {
  const { startScheduler } = require("../jobs/scheduler");
  await mongoose.connect(process.env.CHECK_MONGO_URI);
  const runs = mongoose.connection.db.collection("check_runs");
  const jobs = TEST_JOBS.map(({ name, interval }) => ({
    name,
    interval,
    run: async () => {
      const start = new Date();
      await sleep(300); // long enough that a second worker would overlap if it also ran it
      await runs.insertOne({ job: name, pid: process.pid, start, end: new Date() });
    },
  }));
  const agenda = await startScheduler(mongoose.connection.db, { jobs, processEvery: 200 });
  process.send("started");
  process.on("message", async (msg) => {
    if (msg !== "stop") return;
    await agenda.drain(10000);
    await mongoose.disconnect();
    process.exit(0);
  });
};

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const checkRuns = (runs) => {
  for (const { name, ms } of TEST_JOBS) {
    const list = runs.filter((r) => r.job === name).sort((a, b) => a.start - b.start);
    const expected = Math.floor(RUN_FOR_MS / ms);
    console.log(`${name}: ${list.length} runs (about ${expected} expected), workers ${[...new Set(list.map((r) => r.pid))].join(", ")}`);
    if (list.length < expected - 2 || list.length > expected + 1) fail(`${name} ran ${list.length} times`);
    for (let i = 1; i < list.length; i += 1) {
      if (list[i].start < list[i - 1].end) fail(`${name} ran in two places at once at ${list[i].start.toISOString()}`);
      if (list[i].start - list[i - 1].start < ms * 0.75) fail(`${name} ran twice within one interval at ${list[i].start.toISOString()}`);
    }
  }
};

// The real schedule: one document per job, and the digest due at the next 18:00 IST.
const checkRealSchedule = async (uri) => {
  process.env.ENABLE_EXTERNAL_JOB_SYNC = "false"; // don't call the real feeds
  const { startScheduler } = require("../jobs/scheduler");
  const { enabledJobs } = require("../jobs/scheduledJobs");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const agenda = await startScheduler(db, { processEvery: "1 hour" });
  await agenda.drain(10000);
  // A second start (a restart, or another worker) must not add documents or move the digest.
  const before = await db.collection("agendaJobs").findOne({ name: "email-digest" });
  const again = await startScheduler(db, { processEvery: "1 hour" });
  await again.drain(10000);

  const docs = await db.collection("agendaJobs").find({ type: "single" }).toArray();
  const names = docs.map((d) => d.name).sort();
  const wanted = enabledJobs().map((j) => j.name).sort();
  if (JSON.stringify(names) !== JSON.stringify(wanted)) fail(`scheduled ${names.join(", ")}, expected ${wanted.join(", ")}`);
  const digest = docs.find((d) => d.name === "email-digest");
  const ist = new Date(digest.nextRunAt.getTime() + 5.5 * 60 * 60 * 1000);
  console.log(`email-digest next run: ${digest.nextRunAt.toISOString()} (${ist.getUTCHours()}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST)`);
  if (ist.getUTCHours() !== 18 || ist.getUTCMinutes() !== 0) fail("email-digest is not set for 18:00 IST");
  if (digest.nextRunAt <= new Date()) fail("email-digest would run now instead of at 6 PM");
  if (before.nextRunAt.getTime() !== digest.nextRunAt.getTime()) fail("a restart moved the email-digest schedule");
  if (digest.lastRunAt) fail("email-digest ran at startup");
  await mongoose.disconnect();
};

const main = async () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("jobs_check");
  try {
    const children = [0, 1].map(() => fork(__filename, ["child"], { env: { ...process.env, CHECK_MONGO_URI: uri } }));
    await Promise.all(children.map((child) => new Promise((resolve, reject) => {
      child.once("message", resolve);
      child.once("exit", (code) => reject(new Error(`worker exited early (${code})`)));
    })));
    console.log("two workers started");
    await sleep(RUN_FOR_MS);
    await Promise.all(children.map((child) => new Promise((resolve) => {
      child.removeAllListeners("exit");
      child.once("exit", resolve);
      child.send("stop");
    })));

    await mongoose.connect(uri);
    const runs = await mongoose.connection.db.collection("check_runs").find().toArray();
    const single = await mongoose.connection.db.collection("agendaJobs").countDocuments({ type: "single" });
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
    if (single !== TEST_JOBS.length) fail(`${single} schedule documents for ${TEST_JOBS.length} jobs`);
    checkRuns(runs);

    await checkRealSchedule(uri);
  } finally {
    await mongod.stop();
  }
  console.log(process.exitCode ? "Scheduler check failed." : "Scheduler check passed: each job ran once per interval.");
};

if (process.argv[2] === "child") {
  runChild().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
