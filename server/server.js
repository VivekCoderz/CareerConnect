const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
// Sentry must load before Express and the routes (I08).
require("./instrument");
const http = require("http");

// Startup validation for JWT_SECRET
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error("FATAL: JWT_SECRET environment variable is not set.");
    process.exit(1);
  } else {
    JWT_SECRET = "dev_jwt_secret_key_career_connect_local_32chars_long";
    process.env.JWT_SECRET = JWT_SECRET;
  }
} else if (isProduction && JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be set and at least 32 characters long in production.");
  process.exit(1);
}

// Startup validation for SESSION_SECRET
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (isProduction) {
    console.error("FATAL: SESSION_SECRET environment variable is not set. A secure secret is required for sessions.");
    process.exit(1);
  } else {
    SESSION_SECRET = "dev_session_secret_key_career_connect_local_32chars_long";
    process.env.SESSION_SECRET = SESSION_SECRET;
  }
} else if (isProduction && SESSION_SECRET.length < 32) {
  console.error("FATAL: SESSION_SECRET must be set and at least 32 characters long in production.");
  process.exit(1);
}

// Warn (once, without values) if the fallback email provider is only partly configured.
require("./utils/sendEmail").warnOnFallbackEmailConfig();

const app = require("./app.js");
const connectDB = require("./config/db");
const socketService = require("./services/socketService");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO
socketService.init(server);

// Scheduled jobs (interview sweep, listing expiry, external job sync, 6 PM email digest)
// run in the worker service, not here, so each runs once however many web instances
// are up. See worker.js and jobs/scheduledJobs.js.

server.listen(PORT, () => {
  console.log(`E2Job server running on port ${PORT} 🔥 (with Socket.IO enabled)`);
});
