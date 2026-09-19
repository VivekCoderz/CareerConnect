const mongoose = require("mongoose");
const dns = require("dns");

// Prioritize IPv4 first to prevent Windows getaddrinfo ENOTFOUND with MongoDB Atlas SRV / shard addresses
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const connectDB = async (retryCount = 0) => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/careerconnect";
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected successfully 🎉 (${conn.connection.host})`);

    // Clean up any legacy indexes without partialFilterExpression
    try {
      const collections = await conn.connection.db.listCollections().toArray();
      const collNames = collections.map((c) => c.name.toLowerCase());
      
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
    } catch (idxErr) {}
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    
    // Fallback to local MongoDB if Atlas SRV fails
    if (uri.startsWith("mongodb+srv://")) {
      console.log("🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/careerconnect)...");
      try {
        const localConn = await mongoose.connect("mongodb://127.0.0.1:27017/careerconnect", {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ Local MongoDB Connected successfully 🎉 (${localConn.connection.host})`);
        return;
      } catch (localErr) {
        console.error("Local MongoDB fallback also failed:", localErr.message);
      }
    }

    if (retryCount < 3) {
      console.log(`🔄 Retrying MongoDB connection in 5 seconds (Attempt ${retryCount + 1}/3)...`);
      setTimeout(() => connectDB(retryCount + 1), 5000);
      return;
    }

    console.error("❌ Max connection retries reached. Please check your internet connection or MongoDB Atlas IP Whitelist (https://cloud.mongodb.com -> Network Access).");
  }
};

module.exports = connectDB;
