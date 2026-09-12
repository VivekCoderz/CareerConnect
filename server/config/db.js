const mongoose = require("mongoose");
const dns = require("dns");

// Set reliable public DNS servers to resolve MongoDB Atlas SRV records on Windows/local networks
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/careerconnect";
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`MongoDB Connected successfully 🎉 (${conn.connection.host})`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    
    // Fallback to local MongoDB if Atlas SRV fails
    if (uri.startsWith("mongodb+srv://")) {
      console.log("🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/careerconnect)...");
      try {
        const localConn = await mongoose.connect("mongodb://127.0.0.1:27017/careerconnect", {
          serverSelectionTimeoutMS: 4000,
        });
        console.log(`✅ Local MongoDB Connected successfully 🎉 (${localConn.connection.host})`);
        return;
      } catch (localErr) {
        console.error("Local MongoDB fallback also failed:", localErr.message);
      }
    }

    process.exit(1);
  }
};

module.exports = connectDB;
