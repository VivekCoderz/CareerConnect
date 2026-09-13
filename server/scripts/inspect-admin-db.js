require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const AuditLog = require("../models/AuditLog");

async function test() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(uri);
  console.log("CONNECTED TO MONGO");
  
  const [users, employers, jobs, internships, apps, interviews, auditLogs] = await Promise.all([
    User.countDocuments(),
    EmployerProfile.countDocuments(),
    Job.countDocuments(),
    Internship.countDocuments(),
    Application.countDocuments(),
    Interview.countDocuments(),
    AuditLog.countDocuments()
  ]);
  console.log("COUNTS:", JSON.stringify({ users, employers, jobs, internships, apps, interviews, auditLogs }));
  
  const userRoles = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
  const userTypes = await User.aggregate([{ $group: { _id: "$userType", count: { $sum: 1 } } }]);
  const jobStatuses = await Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const internStatuses = await Internship.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const appStatuses = await Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const interviewStatuses = await Interview.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  
  console.log("User Roles:", JSON.stringify(userRoles));
  console.log("User Types:", JSON.stringify(userTypes));
  console.log("Job Statuses:", JSON.stringify(jobStatuses));
  console.log("Intern Statuses:", JSON.stringify(internStatuses));
  console.log("App Statuses:", JSON.stringify(appStatuses));
  console.log("Interview Statuses:", JSON.stringify(interviewStatuses));
  
  const adminUsers = await User.find({ role: "admin" }).select("fullName email role userType");
  console.log("Admin Users in DB:", JSON.stringify(adminUsers));

  const sampleApps = await Application.find().limit(3).lean();
  console.log("Sample App keys:", sampleApps.map(a => Object.keys(a)));
  
  await mongoose.disconnect();
}
test().catch(console.error);
