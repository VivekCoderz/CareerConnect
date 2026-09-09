require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const User = require("../models/User");
const Interview = require("../models/Interview");
const Application = require("../models/Application");

async function checkRecent() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);

  console.log("--- RECENT USERS (updatedAt / lastLogin) ---");
  const users = await User.find().sort({ updatedAt: -1 }).limit(10);
  for (const u of users) {
    console.log({
      id: u._id,
      name: u.fullName,
      email: u.email,
      role: u.role,
      userType: u.userType,
      updatedAt: u.updatedAt,
      lastLogin: u.lastLogin,
    });
  }

  console.log("\n--- RECENT APPLICATIONS ---");
  const apps = await Application.find().sort({ updatedAt: -1 }).limit(5);
  for (const a of apps) {
    console.log({
      id: a._id,
      candidateId: a.candidateId,
      student: a.student,
      fullName: a.fullName,
      email: a.email,
      status: a.status,
      opportunityTitle: a.opportunityTitle,
      updatedAt: a.updatedAt,
    });
  }

  console.log("\n--- RECENT INTERVIEWS ---");
  const ints = await Interview.find().sort({ createdAt: -1 }).limit(5);
  for (const i of ints) {
    console.log({
      id: i._id,
      title: i.title,
      roundName: i.roundName,
      status: i.status,
      candidateId: i.candidateId,
      applicationId: i.applicationId,
      employerId: i.employerId,
      scheduledDate: i.scheduledDate,
      createdAt: i.createdAt,
    });
  }

  await mongoose.disconnect();
}

checkRecent().catch(console.error);
