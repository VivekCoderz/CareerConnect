const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function createImranInterview() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  require("../models/User");
  require("../models/Job");
  require("../models/Internship");
  const EmployerProfile = require("../models/EmployerProfile");
  const Application = require("../models/Application");
  const Interview = require("../models/Interview");

  const imranApp = await Application.findById("6aa044091e97759e1df39a68");
  if (!imranApp) {
    console.log("Imran app not found");
    process.exit(1);
  }
  console.log("Found Imran app:", imranApp._id, imranApp.studentName, imranApp.status);

  let employerProfile = null;
  if (imranApp.employerId) {
    employerProfile = await EmployerProfile.findOne({
      $or: [{ _id: imranApp.employerId }, { userId: imranApp.employerId }],
    });
  }
  if (!employerProfile) {
    employerProfile = await EmployerProfile.findOne();
  }

  // Create scheduled interview for Imran
  const interview = await Interview.create({
    employerId: employerProfile._id,
    candidateId: imranApp.candidateId,
    internshipId: imranApp.internshipId,
    applicationId: imranApp._id,
    title: "Technical Assessment & Project Discussion",
    roundNumber: 1,
    roundName: "Round 1 - Technical Assessment",
    interviewType: "Online",
    interviewerName: "Hiring Lead",
    interviewerEmail: "recruiter@careerconnect.com",
    interviewerRole: "Senior Engineering Manager",
    scheduledDate: "2026-09-12",
    startTime: "02:00 PM - 02:45 PM",
    scheduledTime: "02:00 PM - 02:45 PM",
    duration: 45,
    durationMinutes: 45,
    meetingMode: "Google Meet",
    meetingLink: "https://meet.google.com/xyz-careerconnect-imran",
    location: "Virtual Meeting Room",
    instructions: "Please be ready with your laptop, camera on, and prepare to discuss your web development projects.",
    notes: "Shortlisted based on application review.",
    status: "scheduled",
    result: "pending",
  });

  imranApp.status = "Interview Scheduled";
  imranApp.stage = "Interview Round 1";
  await imranApp.save();

  console.log("SUCCESSFULLY CREATED INTERVIEW FOR IMRAN:", {
    interviewId: interview._id,
    candidate: imranApp.studentName,
    date: interview.scheduledDate,
    time: interview.scheduledTime,
    meetingLink: interview.meetingLink,
    status: interview.status,
  });

  await mongoose.disconnect();
}

createImranInterview().catch((err) => {
  console.error(err);
  process.exit(1);
});
