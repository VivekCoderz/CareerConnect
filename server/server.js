const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });

// Environment check
const isRenderProd = process.env.NODE_ENV === "production" && (process.env.RENDER === "true" || process.env.RENDER);

// Startup validation for JWT_SECRET
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === "your_jwt_secret_key_here") {
  if (isRenderProd) {
    console.error("FATAL: JWT_SECRET environment variable is not set.");
    process.exit(1);
  } else {
    JWT_SECRET = "careerconnect_super_secure_jwt_secret_key_2026_local";
    process.env.JWT_SECRET = JWT_SECRET;
    console.warn("⚠️  [Security] JWT_SECRET was placeholder or empty. Using local development key.");
  }
} else if (JWT_SECRET.length < 32) {
  if (isRenderProd) {
    console.error("FATAL: JWT_SECRET must be set and at least 32 characters long in production.");
    process.exit(1);
  } else {
    console.warn("⚠️  [Security] JWT_SECRET is shorter than 32 characters. Use a 32+ char key in production.");
  }
}

// Startup validation for SESSION_SECRET
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (isRenderProd) {
    console.error("FATAL: SESSION_SECRET environment variable is not set. A secure secret is required for sessions.");
    process.exit(1);
  } else {
    SESSION_SECRET = "careerconnect_session_secure_key_2026_local_dev";
    process.env.SESSION_SECRET = SESSION_SECRET;
  }
} else if (SESSION_SECRET.length < 32) {
  if (isRenderProd) {
    console.error("FATAL: SESSION_SECRET must be set and at least 32 characters long in production.");
    process.exit(1);
  } else {
    console.warn("⚠️  [Security] SESSION_SECRET is shorter than 32 characters. Use a 32+ char key in production.");
  }
}

const app = require("./app.js");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = app.listen(PORT || 5000, () => {
    console.log(`CareerConnect server running on port ${PORT} 🔥`);
});

