const mongoose = require("mongoose");
const dns = require("dns");

// Prioritize IPv4 first to prevent Windows getaddrinfo ENOTFOUND with MongoDB Atlas SRV / shard addresses
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}

async function cleanupLegacyIndexes(conn) {
  try {
    const collections = await conn.connection.db.listCollections().toArray();
    for (const name of ["jobs", "internships"]) {
      const actualName = collections.find((c) => c.name.toLowerCase() === name)?.name;
      if (actualName) {
        const indexes = await conn.connection.db.collection(actualName).indexes();
        const legacyIdx = indexes.find((i) => i.name === "source_1_externalId_1" && !i.partialFilterExpression);
        if (legacyIdx) {
          await conn.connection.db.collection(actualName).dropIndex("source_1_externalId_1");
          console.log(` Cleaned legacy ${actualName} index without partialFilterExpression`);
        }
      }
    }

    const usersCollName = collections.find((c) => c.name.toLowerCase() === "users")?.name;
    if (usersCollName) {
      const userIndexes = await conn.connection.db.collection(usersCollName).indexes();
      const legacyUserIdx = userIndexes.find((i) => i.name === "username_1" && !i.sparse);
      if (legacyUserIdx) {
        await conn.connection.db.collection(usersCollName).dropIndex("username_1");
        await conn.connection.db.collection(usersCollName).createIndex({ username: 1 }, { unique: true, sparse: true });
        console.log(` Replaced legacy users username_1 index with unique sparse index`);
      }

      // Phone numbers used to be unique across every account; now only among candidates.
      const legacyPhoneIdx = userIndexes.find((i) => i.name === "phone_1_countryCode_1" && !i.partialFilterExpression?.role);
      if (legacyPhoneIdx) {
        await conn.connection.db.collection(usersCollName).dropIndex("phone_1_countryCode_1");
        await conn.connection.db.collection(usersCollName).createIndex(
          { phone: 1, countryCode: 1 },
          { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" }, role: "user" } }
        );
        console.log(` Replaced users phone index: phone numbers are now unique among candidates only`);
      }
    }
  } catch (idxErr) {}
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Connects to MONGODB_URI only (no local fallback). If every attempt fails the
// process exits, so the host restarts it and UptimeRobot sees the outage.
const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    if (isProduction) {
      console.error("FATAL: MONGODB_URI environment variable is not set.");
      process.exit(1);
    }
    uri = "mongodb://localhost:27017/careerconnect";
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      console.log(`MongoDB Connected successfully 🎉 (${conn.connection.host})`);
      await cleanupLegacyIndexes(conn);
      return conn;
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 Retrying MongoDB connection in 5 seconds (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  console.error("FATAL: Max MongoDB connection retries reached. Check MONGODB_URI and the Atlas IP allowlist (https://cloud.mongodb.com -> Network Access).");
  process.exit(1);
};

module.exports = connectDB;
module.exports.cleanupLegacyIndexes = cleanupLegacyIndexes;
