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
    }
  } catch (idxErr) {}
}

const connectDB = async (retryCount = 0) => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/careerconnect";
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected successfully 🎉 (${conn.connection.host})`);
    await cleanupLegacyIndexes(conn);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    
    // Local fallback is opt-in to avoid silently using an empty database.
    if (uri.startsWith("mongodb+srv://") && process.env.ALLOW_LOCAL_DB_FALLBACK === "true") {
      console.log("🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/careerconnect)...");
      try {
        const localConn = await mongoose.connect("mongodb://127.0.0.1:27017/careerconnect", {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ Local MongoDB Connected successfully 🎉 (${localConn.connection.host})`);
        await cleanupLegacyIndexes(localConn);
        return;
      } catch (localErr) {
        console.error("Local MongoDB fallback also failed:", localErr.message);
      }
    }

    if (retryCount < 3) {
      console.log(`🔄 Retrying MongoDB connection in 5 seconds (Attempt ${retryCount + 1}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return connectDB(retryCount + 1);
    }

    console.error("❌ Max connection retries reached. Please check your internet connection or MongoDB Atlas IP Whitelist (https://cloud.mongodb.com -> Network Access).");
    throw error;
  }
};

module.exports = connectDB;
