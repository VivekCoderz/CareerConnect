require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const Interview = require("../models/Interview");
const User = require("../models/User");

async function testQuery() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);

  const vivekUser = await User.findById("6a9db0a6f6614290e3d53e95");
  const imranUser = await User.findById("6aa0069a4063cbe212c6238a");

  console.log("Vivek query ({ candidateId: vivekUser._id }):");
  const vivekInterviews = await Interview.find({ candidateId: vivekUser._id })
    .populate("candidateId", "fullName email")
    .populate("jobId", "title");
  console.log(`Found for Vivek: ${vivekInterviews.length}`);

  console.log("Imran query ({ candidateId: imranUser._id }):");
  const imranInterviews = await Interview.find({ candidateId: imranUser._id })
    .populate("candidateId", "fullName email")
    .populate("jobId", "title");
  console.log(`Found for Imran: ${imranInterviews.length}`);

  await mongoose.disconnect();
}

testQuery().catch(console.error);
