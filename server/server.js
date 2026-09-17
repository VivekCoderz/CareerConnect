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

const app = require("./app.js");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5001;

// Connect Database
connectDB();

const server = app.listen(PORT, () => {
    console.log(`CareerConnect server running on port ${PORT} 🔥`);
});

