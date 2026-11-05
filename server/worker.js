// Background worker: runs the scheduled jobs (jobs/scheduledJobs.js) with Agenda on the
// app's MongoDB. Deployed as its own service (`npm run worker`, docs/worker.md); the web
// server (server.js) serves requests only. Agenda locks each job in MongoDB, so even two
// workers never run the same job twice.
const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
// Sentry first, so failures in the jobs are reported (I08).
require("./instrument");

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { startScheduler } = require("./jobs/scheduler");

// The email digest sends mail; warn (once, without values) if the fallback provider is half set up.
require("./utils/sendEmail").warnOnFallbackEmailConfig();

const main = async () => {
  // connectDB exits the process if MongoDB can't be reached, so the host restarts the worker.
  const conn = await connectDB();
  const agenda = await startScheduler(conn.connection.db);

  // ── Campus portal workers ────────────────────────────────────────────────
  // The AI marking queue and test expiry sweep (docs/campus/architecture.md) start in
  // server.js on the campus branch. When that branch merges, move its line here and
  // delete it from server.js, so the web instances don't run them:
  //
  //   if (String(process.env.ENABLE_CAMPUS).toLowerCase() === "true") require("./campus").startWorkers();
  //
  // and stop them in shutdown() below with require("./campus").stopWorkers().
  // ─────────────────────────────────────────────────────────────────────────

  console.log("E2Job worker running");

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[worker] ${signal}: stopping`);
    try {
      // Let a running job finish (hosts allow about 30 s after SIGTERM). If one is still
      // running, unlock it so another worker can pick it up.
      const result = await agenda.drain(25000);
      if (result.timedOut) await agenda.stop();
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

main().catch((err) => {
  console.error("FATAL: worker failed to start:", err.message);
  process.exit(1);
});
