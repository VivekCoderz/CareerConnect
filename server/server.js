const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
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

const app = require("./app.js");
const connectDB = require("./config/db");
const socketService = require("./services/socketService");
const { getInterviewTimeDetails } = require("./utils/interviewTimeUtils");

const PORT = process.env.PORT || 5001;

// Connect Database
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO
socketService.init(server);

// Background job: Automatically sync expired interviews every 60s
setInterval(async () => {
  try {
    const Interview = require("./models/Interview");
    const activeInterviews = await Interview.find({
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
    });

    const now = new Date();
    for (const interview of activeInterviews) {
      const timeDetails = getInterviewTimeDetails(interview, now);
      if (timeDetails.isTimePast) {
        interview.status = "completed";
        interview.completedAt = timeDetails.endDateTime || now;
        await interview.save();
        socketService.emitInterviewStatusUpdated(interview.candidateId, interview);
      }
    }
  } catch (err) {
    // Silent catch for background job
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`CareerConnect server running on port ${PORT} 🔥 (with Socket.IO enabled)`);
});
