const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function testCandidateQuery() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = require("../models/User");
  const Job = require("../models/Job");
  const Internship = require("../models/Internship");
  const EmployerProfile = require("../models/EmployerProfile");
  const Application = require("../models/Application");
  const Interview = require("../models/Interview");

  const imran = await User.findOne({ email: "imrannazir123sh@gmail.com" });
  console.log("Imran User:", imran._id, imran.fullName, imran.email);

  // Exact query logic from interviewController.js
  const userEmails = [imran.email].filter(Boolean);
  const userApps = await Application.find({
    $or: [
      { candidateId: imran._id },
      { email: { $in: userEmails } },
      { studentEmail: { $in: userEmails } },
    ],
  }).select("_id");
  const appIds = userApps.map((a) => a._id);

  const sameEmailUsers = await User.find({ email: { $in: userEmails } }).select("_id");
  const candidateUserIds = sameEmailUsers.map((u) => u._id);
  if (!candidateUserIds.some((id) => id.toString() === imran._id.toString())) {
    candidateUserIds.push(imran._id);
  }

  const query = {
    $or: [
      { candidateId: { $in: candidateUserIds } },
      { applicationId: { $in: appIds } },
    ],
  };

  const interviews = await Interview.find(query)
    .populate("candidateId", "fullName email phone profileImage userType location")
    .populate("jobId", "title department location type")
    .populate("internshipId", "title department location type companyName")
    .populate(
      "applicationId",
      "studentName studentEmail studentPhone education skills experience portfolioUrl resumeUrl status stage appliedAt opportunityType opportunityTitle"
    )
    .populate("employerId", "companyName logo officialEmail mobile location")
    .sort({ scheduledDate: 1, startTime: 1, scheduledTime: 1 });

  console.log("Imran interview count:", interviews.length);
  interviews.forEach((i) => {
    console.log({
      id: i._id,
      title: i.title,
      date: i.scheduledDate,
      time: i.scheduledTime,
      meetLink: i.meetingLink,
      status: i.status,
      internship: i.internshipId?.title,
    });
  });

  await mongoose.disconnect();
}

testCandidateQuery().catch((err) => {
  console.error(err);
  process.exit(1);
});
