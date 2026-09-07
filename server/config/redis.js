const Redis = require("ioredis");
require("dotenv").config();

let hasLoggedError = false;

// Clean host in case protocol prefix was included
const rawHost = process.env.REDIS_HOST || "127.0.0.1";
const host = rawHost.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim();
const isUpstashOrTls = host.includes("upstash.io") || process.env.REDIS_TLS === "true";

// Dedicated Redis client for session storage only
let redisClient;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    retryStrategy: () => 5000,
    maxRetriesPerRequest: 3,
  });
} else {
  redisClient = new Redis({
    host,
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD.trim() : undefined,
    db: Number(process.env.REDIS_DB) || 0,
    tls: isUpstashOrTls ? { rejectUnauthorized: false } : undefined, // Upstash requires TLS
    retryStrategy(times) {
      return 5000;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}

redisClient.on("connect", () => {
  hasLoggedError = false;
  console.log("✅ Redis client connected successfully (Session Store)");
});

redisClient.on("ready", () => {
  console.log("⚡ Redis ready to handle session operations");
});

redisClient.on("error", (err) => {
  if (!hasLoggedError) {
    console.error("⚠️  Redis Connection Error:", err.message);
    hasLoggedError = true;
  }
});

module.exports = redisClient;
