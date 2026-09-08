const Redis = require("ioredis");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const rawHost = process.env.REDIS_HOST || "127.0.0.1";
const host = rawHost.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim();
const isUpstashOrTls = host.includes("upstash.io") || process.env.REDIS_TLS === "true";

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 5000,
  });
} else {
  redis = new Redis({
    host,
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD.trim() : undefined,
    db: Number(process.env.REDIS_DB) || 0,
    tls: isUpstashOrTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 5000,
  });
}

redis.on("error", () => {});

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
