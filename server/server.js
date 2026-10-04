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
const { closeExpiredListings } = require("./utils/listingExpiry");
const { clearSearchCache } = require("./services/jobScraperService");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO
socketService.init(server);

// Background job: mark interviews whose end time has passed as completed (every 5 min + on startup)
const { sweepPastInterviews } = require("./services/interviewSweep");
sweepPastInterviews();
setInterval(sweepPastInterviews, 5 * 60 * 1000);

// Background job: close Published jobs/internships whose deadline (end of day IST) has passed.
// Runs once on startup and every 15 minutes; public lists already hide expired listings
// in between, so this only makes the stored status match.
const LISTING_EXPIRY_INTERVAL_MS = 15 * 60 * 1000;
const runListingExpirySweep = async () => {
  try {
    const result = await closeExpiredListings({ onChange: () => clearSearchCache() });
    if (result.jobs || result.internships) {
      console.log(`Closed expired listings: ${result.jobs} job(s), ${result.internships} internship(s)`);
    }
  } catch (err) {
    console.warn("Listing expiry sweep failed:", err.message);
  }
};
runListingExpirySweep();
setInterval(runListingExpirySweep, LISTING_EXPIRY_INTERVAL_MS);

// Background job: sync approved external job feeds (Remotive, Arbeitnow) into MongoDB.
// Job lists only read the stored listings; requests never call the feeds.
require("./services/externalJobSync").startExternalJobSyncSchedule();

server.listen(PORT, () => {
  console.log(`CareerConnect server running on port ${PORT} 🔥 (with Socket.IO enabled)`);
  // Daily summary email of rejections / closed positions (6 PM IST)
  require("./services/emailDigest").startEmailDigestScheduler();
});
