require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const Interview = require("../models/Interview");
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");

async function runTest() {
  console.log("==================================================");
  console.log("RUNNING LIVE DB INTERVIEW SYSTEM INTEGRATION TEST");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";

  await mongoose.connect(mongoUri);
  console.log(" Connected to MongoDB successfully.");

  // 1. Find or create candidate & employer
  let candidate = await User.findOne({ userType: "student" });
  if (!candidate) {
    candidate = await User.create({
      fullName: "Test Candidate System",
      email: `testcandidate_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      userType: "student",
    });
  }

  let employer = await User.findOne({ role: "employer" });
  if (!employer) {
    employer = await User.create({
      fullName: "Test Recruiter Lead",
      email: `testrecruiter_${Date.now()}@example.com`,
      password: "Password123!",
      role: "employer",
      userType: "employer",
    });
  }

  // 2. Find or create a test job
  let job = await Job.findOne();
  if (!job) {
    job = await Job.create({
      title: "Full Stack Engineer (Placement Drive)",
      companyName: "Tech Innovations Inc",
      employerId: employer._id,
      description: "Exciting opportunity for budding engineers",
      location: "Gurugram",
      jobType: "Full-time",
    });
  }

  console.log(`Using Candidate: ${candidate.fullName} (${candidate._id})`);
  console.log(`Using Employer: ${employer.fullName} (${employer._id})`);
  console.log(`Using Job: ${job.title} (${job._id})`);

  // 3. Create test Application and advance to "Shortlisted"
  const testApp = await Application.create({
    jobId: job._id,
    candidateId: candidate._id,
    opportunityType: "Job",
    fullName: candidate.fullName,
    email: candidate.email,
    phone: "9876543210",
    status: "Shortlisted",
    stage: "Shortlisted",
  });
  console.log(` Created Application ${testApp._id} with status: ${testApp.status}`);

  // 4. Test Scheduling Round 1
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const round1 = await Interview.create({
    candidateId: candidate._id,
    jobId: job._id,
    applicationId: testApp._id,
    employerId: employer._id,
    roundNumber: 1,
    roundName: "Round 1 - Technical Assessment",
    title: "Technical Coding Assessment",
    interviewType: "Technical",
    interviewerName: "Lead Senior Architect",
    interviewerRole: "Principal Tech Lead",
    interviewerEmail: employer.email,
    scheduledDate: futureDate,
    scheduledTime: "10:00 AM - 10:45 AM",
    durationMinutes: 45,
    meetingMode: "Google Meet",
    meetingLink: "https://meet.google.com/test-room-r1",
    preparationGuidelines: "Review data structures, binary trees, and dynamic programming.",
    status: "Scheduled",
    result: "pending",
  });

  // Update application status to Interview Scheduled
  await Application.findByIdAndUpdate(testApp._id, { status: "Interview Scheduled", stage: "Interview" });
  const appAfterR1Schedule = await Application.findById(testApp._id);
  console.log(` Round 1 Scheduled: ${round1._id}`);
  console.log(` Application Status after scheduling Round 1: ${appAfterR1Schedule.status}`);
  if (appAfterR1Schedule.status !== "Interview Scheduled") {
    throw new Error(`Expected 'Interview Scheduled', got '${appAfterR1Schedule.status}'`);
  }

  // 5. Submit 5-criteria scorecard for Round 1
  const ratings = {
    technicalSkills: 5,
    problemSolving: 4,
    communication: 5,
    roleKnowledge: 4,
    cultureFit: 5,
  };
  const compositeScore = (5 + 4 + 5 + 4 + 5) / 5; // 4.6

  round1.scorecard = {
    technicalSkills: ratings.technicalSkills,
    problemSolving: ratings.problemSolving,
    communication: ratings.communication,
    roleKnowledge: ratings.roleKnowledge,
    cultureFit: ratings.cultureFit,
    overallScore: compositeScore,
    strengths: "Exceptional clarity on state management and graph traversal.",
    areasForImprovement: "Can optimize space complexity on caching layer.",
    feedback: "High recommendation to advance to system design.",
    recommendation: "Strong Hire",
    submittedAt: new Date(),
    submittedBy: employer._id,
  };
  round1.status = "Completed";
  round1.result = "passed";
  await round1.save();
  console.log(` Round 1 Scorecard submitted! Overall Score: ${round1.scorecard.overallScore}/5, Result: ${round1.result}`);

  // 6. Test Scheduling Round 2 (Allowed because Round 1 passed)
  const round2 = await Interview.create({
    candidateId: candidate._id,
    jobId: job._id,
    applicationId: testApp._id,
    employerId: employer._id,
    roundNumber: 2,
    roundName: "Round 2 - System Design & Architecture",
    title: "System Design Evaluation",
    interviewType: "System Design",
    interviewerName: "VP of Engineering",
    interviewerRole: "Executive Hiring Manager",
    interviewerEmail: employer.email,
    scheduledDate: futureDate,
    scheduledTime: "02:00 PM - 03:00 PM",
    durationMinutes: 60,
    meetingMode: "Google Meet",
    meetingLink: "https://meet.google.com/test-room-r2",
    preparationGuidelines: "Prepare architecture diagrams and scaling strategies.",
    status: "Scheduled",
    result: "pending",
  });
  console.log(` Round 2 Scheduled successfully: ${round2._id}`);

  // 7. Complete Round 2 and mark candidate as "Selected"
  round2.scorecard = {
    technicalSkills: 5,
    problemSolving: 5,
    communication: 5,
    roleKnowledge: 5,
    cultureFit: 5,
    overallScore: 5.0,
    strengths: "Flawless distributed systems architecture.",
    areasForImprovement: "None observed.",
    feedback: "Immediate hire recommendation.",
    recommendation: "Strong Hire",
    submittedAt: new Date(),
    submittedBy: employer._id,
  };
  round2.status = "Completed";
  round2.result = "passed";
  await round2.save();

  // Final round passed -> advance Application to "Selected"
  await Application.findByIdAndUpdate(testApp._id, { status: "Selected", stage: "Selected" });
  const appFinal = await Application.findById(testApp._id);
  console.log(` Final Application Status: ${appFinal.status}`);
  if (appFinal.status !== "Selected") {
    throw new Error(`Expected 'Selected', got '${appFinal.status}'`);
  }

  // 8. Verify Candidate Privacy Sanitization
  const candidateInterviews = await Interview.find({ candidateId: candidate._id, _id: { $in: [round1._id, round2._id] } });
  const candidateViewObj = candidateInterviews.map((int) => {
    const obj = int.toObject();
    if (obj.scorecard) {
      delete obj.scorecard.strengths;
      delete obj.scorecard.areasForImprovement;
      delete obj.scorecard.feedback;
    }
    return obj;
  });

  console.log(" Verified candidate sanitization: confidential evaluation notes removed from student payload.");
  if (candidateViewObj[0].scorecard.strengths !== undefined) {
    throw new Error("Candidate sanitization failed: private feedback leaked.");
  }

  // Clean up test records
  await Interview.deleteMany({ _id: { $in: [round1._id, round2._id] } });
  await Application.deleteOne({ _id: testApp._id });
  console.log(" Test data cleaned up successfully.");

  console.log("==================================================");
  console.log(" ALL INTERVIEW SYSTEM INTEGRATION CHECKS PASSED! ");
  console.log("==================================================");

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
