require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const Application = require("../models/Application");
const User = require("../models/User");
const Interview = require("../models/Interview");

async function checkApps() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);

  const apps = await Application.find({ _id: "6aa05a72811f03c7e086c4af" }).populate("candidateId");
  console.log("Application 6aa05a72811f03c7e086c4af:", JSON.stringify(apps, null, 2));

  const interview = await Interview.findById("6aa05ed0d3564bf7edbce61a").populate("candidateId").populate("applicationId");
  console.log("Interview 6aa05ed0d3564bf7edbce61a:", JSON.stringify(interview, null, 2));

  await mongoose.disconnect();
}

checkApps().catch(console.error);
