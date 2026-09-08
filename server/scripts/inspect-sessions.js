console.log("==================================================");
console.log("ℹ️  REDIS HAS BEEN REMOVED FROM CAREERCONNECT");
console.log("CareerConnect now uses standard in-memory session management.");
console.log("==================================================");
process.exit(0);

async function inspectSessions() {
  try {
    console.log("==================================================");
    console.log("🔍 REDIS ACTIVE SESSION INSPECTOR");
    console.log("==================================================");

    const keys = await redis.keys("sess:*");

    if (keys.length === 0) {
      console.log("⚠️  No active sessions found in Redis (sess:*).");
      console.log("👉 Log into the application in your browser to create a session.");
      process.exit(0);
    }

    console.log(`Found ${keys.length} active session(s):\n`);

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      const rawData = await redis.get(key);
      let parsed = null;

      try {
        parsed = JSON.parse(rawData);
      } catch (e) {
        parsed = rawData;
      }

      console.log(`🔑 Key: ${key}`);
      console.log(`⏳ Remaining TTL: ${ttl} seconds (~${Math.floor(ttl / 60)}m ${ttl % 60}s)`);
      console.log("📦 Payload:", JSON.stringify(parsed, null, 2));
      console.log("--------------------------------------------------");
    }
  } catch (error) {
    console.error("❌ Could not connect to Redis:", error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

inspectSessions();
