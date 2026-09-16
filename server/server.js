const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
// Startup validation for JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be set and at least 32 characters long in production.");
  process.exit(1);
} else if (JWT_SECRET.length < 32) {
  console.warn("WARNING: JWT_SECRET is shorter than 32 characters. Ensure a secret of at least 32 characters is used in production.");
}

// Startup validation for SESSION_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET environment variable is not set. A secure secret is required for sessions.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && SESSION_SECRET.length < 32) {
  console.error("FATAL: SESSION_SECRET must be set and at least 32 characters long in production.");
  process.exit(1);
} else if (SESSION_SECRET.length < 32) {
  console.warn("WARNING: SESSION_SECRET is shorter than 32 characters. Ensure a secret of at least 32 characters is used in production.");
}
const http = require("http");
const app = require("./app.js");
const connectDB = require("./config/db");
const socketService = require("./services/socketService");
const { getInterviewTimeDetails } = require("./utils/interviewTimeUtils");

const PORT = process.env.PORT || 5000;

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

server.listen(PORT || 5000, () => {
  console.log(`CareerConnect server running on port ${PORT} 🔥 (with Socket.IO enabled)`);
});

