const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const Session = require("../models/Session");

async function inspectSessions() {
  try {
    console.log("==================================================");
    console.log("🔍 MONGOOSE / MONGODB ACTIVE SESSION INSPECTOR");
    console.log("==================================================");

    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const sessions = await Session.find().lean();

    if (sessions.length === 0) {
      console.log("⚠️  No active sessions found in MongoDB (sessions collection).");
      console.log("👉 Log into the application in your browser to create a session.");
      process.exit(0);
    }

    console.log(`Found ${sessions.length} active session(s):\n`);

    const now = Date.now();
    for (const s of sessions) {
      const remainingMs = s.expiresAt ? new Date(s.expiresAt).getTime() - now : 0;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      console.log(`🔑 Session ID: ${s._id}`);
      console.log(
        `⏳ Remaining TTL: ${remainingSeconds} seconds (~${Math.floor(
          remainingSeconds / 60
        )}m ${remainingSeconds % 60}s)`
      );
      console.log(`📅 Expires At: ${s.expiresAt ? new Date(s.expiresAt).toISOString() : "N/A"}`);
      console.log("📦 Payload:", JSON.stringify(s.session, null, 2));
      console.log("--------------------------------------------------");
    }
  } catch (error) {
    console.error("❌ Error inspecting MongoDB sessions:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

inspectSessions();