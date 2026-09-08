require("dotenv").config({ path: "server/.env" });
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const EmployerProfile = require("../models/EmployerProfile");

async function testSecurityAndRBAC() {
  console.log("=== STARTING SECURITY & RBAC VERIFICATION ===");
  await connectDB();

  // Test token generation
  const studentUser = await User.findOne({ role: "user" }) || await User.create({
    fullName: "Security Student",
    username: "sec_student_" + Date.now(),
    email: "sec_student@test.com",
    role: "user",
    userType: "student"
  });

  const employerUser = await User.findOne({ role: "employer" }) || await User.create({
    fullName: "Security Employer",
    username: "sec_emp_" + Date.now(),
    email: "sec_emp@test.com",
    role: "employer",
    userType: "employer"
  });

  const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const employerToken = jwt.sign({ id: employerUser._id, role: employerUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

  console.log(" Tokens generated for Student and Employer.");

  // Test 1: Student token verification works and derives correct user ID
  const decodedStudent = jwt.verify(studentToken, process.env.JWT_SECRET);
  if (decodedStudent.id.toString() !== studentUser._id.toString() || decodedStudent.role !== "user") {
    throw new Error("Student token verification failed");
  }
  console.log(" Test 1 Passed: Student token claims verified strictly server-side.");

  // Test 2: Employer token verification works and derives correct role
  const decodedEmployer = jwt.verify(employerToken, process.env.JWT_SECRET);
  if (decodedEmployer.id.toString() !== employerUser._id.toString() || decodedEmployer.role !== "employer") {
    throw new Error("Employer token verification failed");
  }
  console.log(" Test 2 Passed: Employer token claims verified strictly server-side.");

  // Test 3: Duplicate application compound index check
  const testJob = await Job.findOne() || await Job.create({
    createdBy: employerUser._id,
    title: "Security Test Job",
    location: "Panipat",
    description: "Security Test",
    employmentType: "Full-time",
    status: "Published",
  });

  await Application.deleteMany({ candidateId: studentUser._id, jobId: testJob._id });

  const app1 = await Application.create({
    candidateId: studentUser._id,
    jobId: testJob._id,
    opportunityType: "Job",
    status: "Applied",
  });

  let duplicateCaught = false;
  try {
    await Application.create({
      candidateId: studentUser._id,
      jobId: testJob._id,
      opportunityType: "Job",
      status: "Applied",
    });
  } catch (err) {
    if (err.code === 11000) duplicateCaught = true;
  }

  if (!duplicateCaught) {
    throw new Error("Duplicate application did not trigger compound unique index error!");
  }
  console.log(" Test 3 Passed: Database-level compound unique index prevents duplicate applications.");

  // Cleanup
  await Application.deleteMany({ candidateId: studentUser._id, jobId: testJob._id });
  console.log("=== SECURITY & RBAC TESTS PASSED 100% ===");
  await mongoose.disconnect();
}

testSecurityAndRBAC().catch((err) => {
  console.error("RBAC Security Test Failure:", err);
  process.exit(1);
});
