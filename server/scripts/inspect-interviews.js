require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const Interview = require("../models/Interview");
const Application = require("../models/Application");
const User = require("../models/User");

async function inspect() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  const interviews = await Interview.find().populate("candidateId", "fullName email role userType");
  console.log(`Total interviews in DB: ${interviews.length}`);
  for (const int of interviews) {
    console.log({
      id: int._id,
      title: int.title,
      roundName: int.roundName,
      status: int.status,
      candidateId: int.candidateId?._id || int.candidateId,
      candidateName: int.candidateId?.fullName,
      candidateEmail: int.candidateId?.email,
      candidateRole: int.candidateId?.role,
      candidateUserType: int.candidateId?.userType,
      applicationId: int.applicationId,
      employerId: int.employerId,
      createdAt: int.createdAt,
    });
  }

  const students = await User.find({ userType: "student" }).select("_id fullName email role userType");
  console.log(`Total students in DB: ${students.length}`);
  for (const s of students) {
    console.log({ id: s._id, name: s.fullName, email: s.email, role: s.role, userType: s.userType });
  }

  const applications = await Application.find().select("_id candidateId student fullName email status opportunityTitle opportunityType");
  console.log(`Total applications in DB: ${applications.length}`);
  for (const a of applications) {
    console.log({
      id: a._id,
      candidateId: a.candidateId,
      student: a.student,
      fullName: a.fullName,
      email: a.email,
      status: a.status,
      oppTitle: a.opportunityTitle,
    });
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
