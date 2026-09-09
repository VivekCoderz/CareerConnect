const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const connectDB = require("../config/db");

const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");

const API_BASE = "http://localhost:5000/api";

async function runE2ETests() {
  console.log("\n========================================================");
  console.log("   CAREERCONNECT STUDENT APPLICATION E2E VERIFICATION   ");
  console.log("========================================================\n");

  await connectDB();

  // 1. Setup Test Users
  console.log("--> Setting up test entities in database...");

  // Student A
  let studentA = await User.findOne({ email: "student_a_e2e@careerconnect.com" });
  if (!studentA) {
    studentA = await User.create({
      fullName: "Imran Khan Student",
      username: "student_a_e2e_" + Date.now(),
      email: "student_a_e2e@careerconnect.com",
      password: "TestPassword123!",
      role: "user",
      userType: "student",
      isEmailVerified: true,
    });
  }

  // Student B
  let studentB = await User.findOne({ email: "student_b_e2e@careerconnect.com" });
  if (!studentB) {
    studentB = await User.create({
      fullName: "Other Student",
      username: "student_b_e2e_" + Date.now(),
      email: "student_b_e2e@careerconnect.com",
      password: "TestPassword123!",
      role: "user",
      userType: "student",
      isEmailVerified: true,
    });
  }

  // Employer A
  let employerA = await User.findOne({ email: "employer_a_e2e@careerconnect.com" });
  if (!employerA) {
    employerA = await User.create({
      fullName: "TechCorp Recruiter",
      username: "emp_a_e2e_" + Date.now(),
      email: "employer_a_e2e@careerconnect.com",
      password: "TestPassword123!",
      role: "employer",
      userType: "employer",
      isEmailVerified: true,
    });
  }

  let employerAProfile = await EmployerProfile.findOne({ userId: employerA._id });
  if (!employerAProfile) {
    employerAProfile = await EmployerProfile.create({
      userId: employerA._id,
      companyName: "TechCorp Global",
      industry: "Technology",
      website: "https://techcorp.example.com",
      description: "Leading enterprise tech solutions.",
      isVerified: true,
    });
  }

  // Employer B
  let employerB = await User.findOne({ email: "employer_b_e2e@careerconnect.com" });
  if (!employerB) {
    employerB = await User.create({
      fullName: "InnovateLabs Recruiter",
      username: "emp_b_e2e_" + Date.now(),
      email: "employer_b_e2e@careerconnect.com",
      password: "TestPassword123!",
      role: "employer",
      userType: "employer",
      isEmailVerified: true,
    });
  }

  let employerBProfile = await EmployerProfile.findOne({ userId: employerB._id });
  if (!employerBProfile) {
    employerBProfile = await EmployerProfile.create({
      userId: employerB._id,
      companyName: "InnovateLabs Inc",
      industry: "Research",
      isVerified: true,
    });
  }

  // Generate Tokens
  const tokenStudentA = jwt.sign({ id: studentA._id, role: studentA.role, userType: studentA.userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const tokenStudentB = jwt.sign({ id: studentB._id, role: studentB.role, userType: studentB.userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const tokenEmployerA = jwt.sign({ id: employerA._id, role: employerA.role, userType: employerA.userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const tokenEmployerB = jwt.sign({ id: employerB._id, role: employerB.role, userType: employerB.userType }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const headersStudentA = { Authorization: `Bearer ${tokenStudentA}` };
  const headersStudentB = { Authorization: `Bearer ${tokenStudentB}` };
  const headersEmployerA = { Authorization: `Bearer ${tokenEmployerA}` };
  const headersEmployerB = { Authorization: `Bearer ${tokenEmployerB}` };

  // Opportunities posted by Employer A
  let testInternship = await Internship.findOne({ title: "Frontend Engineering Intern (E2E Test)" });
  if (!testInternship) {
    testInternship = await Internship.create({
      title: "Frontend Engineering Intern (E2E Test)",
      createdBy: employerA._id,
      employerId: employerAProfile._id,
      companyName: "TechCorp Global",
      description: "Work on cutting edge React and TypeScript user interfaces.",
      skillsRequired: ["React", "JavaScript", "Tailwind CSS"],
      duration: "3 months",
      stipend: "25000 INR",
      location: "Bangalore / Remote",
      workMode: "Hybrid",
      status: "Published",
    });
  }

  let testJob = await Job.findOne({ title: "Full Stack Developer (E2E Test)" });
  if (!testJob) {
    testJob = await Job.create({
      title: "Full Stack Developer (E2E Test)",
      createdBy: employerA._id,
      employerId: employerAProfile._id,
      companyName: "TechCorp Global",
      description: "Build robust Node.js and React enterprise systems.",
      requiredSkills: ["Node.js", "Express", "MongoDB", "React"],
      employmentType: "Full-time",
      location: "Bangalore",
      workMode: "Hybrid",
      status: "Published",
    });
  }

  // Clean any prior test applications for clean idempotent run
  await Application.deleteMany({
    candidateId: { $in: [studentA._id, studentB._id] },
    $or: [{ internshipId: testInternship._id }, { jobId: testJob._id }],
  });

  console.log("✓ Entities and test tokens ready.\n");

  let app1Id = null;
  let app2Id = null;

  // ====================================================================
  // TEST 1: Student A applies to an opportunity -> exact fields saved in MongoDB
  // ====================================================================
  console.log("--- TEST 1: Student A applies to Internship Opportunity ---");
  const submissionData1 = {
    fullName: "Imran Khan Student",
    email: "student_a_e2e@careerconnect.com",
    phone: "+91 9876543210",
    address: "123 Tech Park, Bangalore",
    education: "B.Tech Computer Science - Geeta University (2025)",
    degree: "B.Tech Computer Science",
    college: "Geeta University",
    graduationYear: "2025",
    skills: ["React", "JavaScript", "Tailwind CSS", "Node.js"],
    experience: "Frontend Intern at WebCorp (6 months)",
    portfolioUrl: "https://portfolio.imran.dev",
    resumeUrl: "https://cloudinary.com/resumes/imran_resume.pdf",
    coverLetter: "I am deeply passionate about front-end architecture and excited to apply to TechCorp Global.",
  };

  const applyRes1 = await axios.post(
    `${API_BASE}/applications/internship/${testInternship._id}`,
    submissionData1,
    { headers: headersStudentA }
  );

  if (applyRes1.status !== 201 || !applyRes1.data.application) {
    throw new Error(`TEST 1 Failed: HTTP status ${applyRes1.status}`);
  }

  app1Id = applyRes1.data.application._id;
  const savedApp1 = await Application.findById(app1Id);

  if (!savedApp1) throw new Error("TEST 1 Failed: Application document not found in MongoDB!");
  if (savedApp1.status !== "Applied") throw new Error(`TEST 1 Failed: Status is ${savedApp1.status}, expected "Applied"`);
  if (savedApp1.studentName !== submissionData1.fullName) throw new Error(`TEST 1 Failed: studentName mismatch! Got: ${savedApp1.studentName}`);
  if (savedApp1.studentEmail !== submissionData1.email) throw new Error(`TEST 1 Failed: studentEmail mismatch!`);
  if (savedApp1.studentPhone !== submissionData1.phone) throw new Error(`TEST 1 Failed: studentPhone mismatch!`);
  if (savedApp1.portfolioUrl !== submissionData1.portfolioUrl) throw new Error(`TEST 1 Failed: portfolioUrl mismatch!`);
  if (savedApp1.resumeUrl !== submissionData1.resumeUrl) throw new Error(`TEST 1 Failed: resumeUrl mismatch!`);
  if (savedApp1.coverLetter !== submissionData1.coverLetter) throw new Error(`TEST 1 Failed: coverLetter mismatch!`);
  if (!savedApp1.applicationData || savedApp1.applicationData.fullName !== submissionData1.fullName) {
    throw new Error("TEST 1 Failed: applicationData does not preserve exact submitted form!");
  }

  console.log("✓ TEST 1 PASSED: Application submitted with exact fields, saved to MongoDB, status: 'Applied'.\n");

  // ====================================================================
  // TEST 2: Employer A logs in and views their dashboard -> sees exact application
  // ====================================================================
  console.log("--- TEST 2: Employer A views Dashboard & verifies submitted application ---");
  const empAppsRes = await axios.get(`${API_BASE}/applications/employer/list`, {
    headers: headersEmployerA,
  });

  if (empAppsRes.status !== 200 || !Array.isArray(empAppsRes.data.applications)) {
    throw new Error(`TEST 2 Failed: Could not fetch employer applications: ${empAppsRes.status}`);
  }

  const foundApp1 = empAppsRes.data.applications.find((a) => a._id.toString() === app1Id.toString());
  if (!foundApp1) {
    throw new Error("TEST 2 Failed: Submitted application not visible to Employer A!");
  }

  if (foundApp1.studentName !== submissionData1.fullName || foundApp1.studentEmail !== submissionData1.email) {
    throw new Error("TEST 2 Failed: Employer sees incorrect student information!");
  }
  if (!foundApp1.skills || foundApp1.skills.length === 0) {
    throw new Error("TEST 2 Failed: Skills not populated on employer application object!");
  }

  console.log("✓ TEST 2 PASSED: Employer A successfully retrieves application with full matching details.\n");

  // ====================================================================
  // TEST 3: Employer A approves application -> status "Approved", Student sees updated status
  // ====================================================================
  console.log("--- TEST 3: Employer A Approves Application -> Status updates to 'Approved' ---");
  const approveRes = await axios.patch(
    `${API_BASE}/applications/${app1Id}/status`,
    { status: "Approved" },
    { headers: headersEmployerA }
  );

  if (approveRes.status !== 200) {
    throw new Error(`TEST 3 Failed: Approve status code ${approveRes.status}`);
  }

  const updatedDoc1 = await Application.findById(app1Id);
  if (updatedDoc1.status !== "Approved") {
    throw new Error(`TEST 3 Failed: Status in DB is "${updatedDoc1.status}", expected "Approved"`);
  }

  // Student checks /api/applications/me
  const studentAppsRes1 = await axios.get(`${API_BASE}/applications/me`, {
    headers: headersStudentA,
  });
  const studentFoundApp1 = studentAppsRes1.data.applications.find((a) => a._id.toString() === app1Id.toString());
  if (!studentFoundApp1 || studentFoundApp1.status !== "Approved") {
    throw new Error(`TEST 3 Failed: Student sees status "${studentFoundApp1?.status}", expected "Approved"`);
  }

  console.log("✓ TEST 3 PASSED: Application approved in MongoDB, Student dynamically receives 'Approved' status.\n");

  // ====================================================================
  // TEST 4: Student applies to Job, Employer Rejects -> status "Rejected"
  // ====================================================================
  console.log("--- TEST 4: Student applies to Job, Employer Rejects -> Status updates to 'Rejected' ---");
  const submissionData2 = {
    fullName: "Imran Khan Student",
    email: "student_a_e2e@careerconnect.com",
    phone: "+91 9876543210",
    education: "B.Tech Computer Science - Geeta University",
    skills: ["Node.js", "Express", "MongoDB"],
    experience: "Backend Contributor",
    portfolioUrl: "https://portfolio.imran.dev",
    resumeUrl: "https://cloudinary.com/resumes/imran_backend_resume.pdf",
    coverLetter: "Excited to apply for the Full Stack Developer position.",
  };

  const applyRes2 = await axios.post(
    `${API_BASE}/applications/job/${testJob._id}`,
    submissionData2,
    { headers: headersStudentA }
  );

  if (applyRes2.status !== 201) throw new Error(`TEST 4 Failed: Job application failed with ${applyRes2.status}`);
  app2Id = applyRes2.data.application._id;

  const rejectRes = await axios.patch(
    `${API_BASE}/applications/${app2Id}/status`,
    { status: "Rejected" },
    { headers: headersEmployerA }
  );

  if (rejectRes.status !== 200) throw new Error(`TEST 4 Failed: Reject call failed with ${rejectRes.status}`);

  const updatedDoc2 = await Application.findById(app2Id);
  if (updatedDoc2.status !== "Rejected") {
    throw new Error(`TEST 4 Failed: Status in DB is "${updatedDoc2.status}", expected "Rejected"`);
  }

  const studentAppsRes2 = await axios.get(`${API_BASE}/applications/me`, {
    headers: headersStudentA,
  });
  const studentFoundApp2 = studentAppsRes2.data.applications.find((a) => a._id.toString() === app2Id.toString());
  if (!studentFoundApp2 || studentFoundApp2.status !== "Rejected") {
    throw new Error(`TEST 4 Failed: Student sees status "${studentFoundApp2?.status}", expected "Rejected"`);
  }

  console.log("✓ TEST 4 PASSED: Second application rejected in MongoDB, Student dynamically receives 'Rejected' status.\n");

  // ====================================================================
  // TEST 5: Student A tries applying twice to same posting -> 409 Conflict
  // ====================================================================
  console.log("--- TEST 5: Prevent Duplicate Applications (409 Conflict) ---");
  try {
    await axios.post(
      `${API_BASE}/applications/internship/${testInternship._id}`,
      submissionData1,
      { headers: headersStudentA }
    );
    throw new Error("TEST 5 Failed: Duplicate application was unexpectedly allowed!");
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log(`✓ TEST 5 PASSED: Duplicate application returned 409 with message: "${err.response.data.message}"\n`);
    } else {
      throw new Error(`TEST 5 Failed: Expected 409 Conflict, received: ${err.response?.status || err.message}`);
    }
  }

  // ====================================================================
  // TEST 6: Employer B cannot see or modify Employer A's applications
  // ====================================================================
  console.log("--- TEST 6: Employer Cross-Tenant Data Isolation ---");
  const empBAppsRes = await axios.get(`${API_BASE}/applications/employer/list`, {
    headers: headersEmployerB,
  });

  const empBFoundApp = empBAppsRes.data.applications.find(
    (a) => a._id.toString() === app1Id.toString() || a._id.toString() === app2Id.toString()
  );
  if (empBFoundApp) {
    throw new Error("TEST 6 Failed: Employer B can see Employer A's applications!");
  }

  try {
    await axios.patch(
      `${API_BASE}/applications/${app1Id}/status`,
      { status: "Rejected" },
      { headers: headersEmployerB }
    );
    throw new Error("TEST 6 Failed: Employer B was able to modify Employer A's application!");
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
      console.log(`✓ TEST 6 PASSED: Employer B blocked from modifying Employer A's application (${err.response.status}).\n`);
    } else {
      throw new Error(`TEST 6 Failed: Unexpected error response: ${err.response?.status}`);
    }
  }

  // ====================================================================
  // TEST 7: Student B cannot view Student A's application
  // ====================================================================
  console.log("--- TEST 7: Student Authorization Check ---");
  try {
    await axios.get(`${API_BASE}/applications/${app1Id}`, {
      headers: headersStudentB,
    });
    throw new Error("TEST 7 Failed: Student B was able to view Student A's private application!");
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log(`✓ TEST 7 PASSED: Student B unauthorized to view Student A's application (403 Forbidden).\n`);
    } else {
      throw new Error(`TEST 7 Failed: Expected 403 Forbidden, received: ${err.response?.status || err.message}`);
    }
  }

  console.log("========================================================");
  console.log("    ALL 7 END-TO-END APPLICATION TESTS PASSED (100%)    ");
  console.log("========================================================\n");

  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error("\n❌ TEST SUITE RUNTIME ERROR:", err.message);
  if (err.response) {
    console.error("HTTP Response Data:", err.response.data);
  }
  process.exit(1);
});
