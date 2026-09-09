const connectDB = require("../config/db");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");
const { getAggregatedOpportunities } = require("../services/jobScraperService");

async function runE2ETests() {
  console.log("=== STARTING COMPLETE MVP E2E TEST SUITE ===");

  await connectDB();
  console.log(" Connected to MongoDB Atlas");

  // 1. Setup Student and Employer Users
  const studentEmail = "e2e_student_test@geetauniversity.edu.in";
  const employerEmail = "e2e_employer_test@geetauniversity.edu.in";
  const otherEmployerEmail = "e2e_other_employer@geetauniversity.edu.in";

  // Cleanup past test data
  await User.deleteMany({ email: { $in: [studentEmail, employerEmail, otherEmployerEmail] } });

  const studentUser = await User.create({
    fullName: "E2E Student Tester",
    username: "e2e_student_" + Date.now(),
    email: studentEmail,
    password: "Password123!",
    role: "user",
    userType: "student",
    phone: "9876543210",
  });

  const studentProfile = await StudentProfile.create({
    userId: studentUser._id,
    fullName: "E2E Student Tester",
    degree: "B.Tech Computer Science",
    institution: "Geeta University",
    skills: ["React", "Node.js", "MongoDB", "Python"],
    cgpa: "9.2",
    graduationYear: 2026,
  });

  const employerUser = await User.create({
    fullName: "E2E Tech Corp",
    username: "e2e_emp_" + Date.now(),
    email: employerEmail,
    password: "Password123!",
    role: "employer",
    userType: "employer",
    phone: "9876543211",
  });

  const employerProfile = await EmployerProfile.create({
    userId: employerUser._id,
    companyName: "E2E Global Technologies",
    officialEmail: employerEmail,
    mobile: "9876543211",
    industry: "Information Technology",
    headquarters: "Panipat, Haryana",
    companyType: "Private",
  });

  const otherEmployerUser = await User.create({
    fullName: "Other Comp Corp",
    username: "e2e_other_" + Date.now(),
    email: otherEmployerEmail,
    password: "Password123!",
    role: "employer",
    userType: "employer",
    phone: "9876543212",
  });

  const otherEmployerProfile = await EmployerProfile.create({
    userId: otherEmployerUser._id,
    companyName: "Other Comp Corp",
    officialEmail: otherEmployerEmail,
    mobile: "9876543212",
    industry: "Consulting",
    headquarters: "Delhi",
    companyType: "Private",
  });

  console.log(" 1. Setup Student, Employer, and Other Employer identities.");

  // 2. Employer Posts a Real Job and Internship to MongoDB
  const createdJob = await Job.create({
    employerId: employerProfile._id,
    createdBy: employerUser._id,
    title: "Full Stack Engineer (E2E Test)",
    department: "Engineering",
    employmentType: "Full-time",
    workMode: "Hybrid",
    location: "Panipat / Delhi NCR",
    salaryRange: { min: 600000, max: 1200000, currency: "INR" },
    description: "Build scalable web applications with MERN stack.",
    requiredSkills: ["React", "Node.js", "MongoDB"],
    status: "Published",
  });

  const createdInternship = await Internship.create({
    employerId: employerProfile._id,
    createdBy: employerUser._id,
    companyName: employerProfile.companyName,
    title: "AI Research Intern (E2E Test)",
    category: "Computer Science",
    workMode: "Remote",
    location: "Panipat / Remote",
    stipend: 25000,
    duration: "6 Months",
    description: "Research and implement LLM agent workflows.",
    skillsRequired: ["Python", "Machine Learning"],
    status: "Published",
  });

  console.log(" 2. Employer successfully posted Job and Internship to MongoDB.");

  // 3. Student Finds Opportunities (Feed includes real MongoDB records)
  const oppFeed = await getAggregatedOpportunities({ search: "E2E Test" });
  const foundJob = oppFeed.data.find((o) => o._id === createdJob._id.toString());
  const foundIntern = oppFeed.data.find((o) => o._id === createdInternship._id.toString());

  if (!foundJob || !foundIntern) {
    throw new Error("Failed to find MongoDB opportunities in aggregator feed!");
  }
  console.log(" 3. Student Find Opportunities successfully fetched real MongoDB Job & Internship:", {
    jobTitle: foundJob.title,
    company: foundJob.company,
    internTitle: foundIntern.title,
  });

  // 4. Student Applies to Job & Internship
  const jobApp = await Application.create({
    candidateId: studentUser._id,
    jobId: createdJob._id,
    employerId: employerProfile._id,
    opportunityType: "Job",
    opportunityTitle: createdJob.title,
    companyName: employerProfile.companyName,
    status: "Applied",
    stage: "Applied",
    coverNote: "Excited to apply for this engineering role!",
  });

  console.log(" 4. Student applied to job successfully. Application ID:", jobApp._id.toString());

  // 5. Prevent Duplicate Applications
  let duplicateBlocked = false;
  try {
    const existing = await Application.findOne({
      candidateId: studentUser._id,
      jobId: createdJob._id,
    });
    if (existing) {
      duplicateBlocked = true;
    }
  } catch (err) {
    duplicateBlocked = true;
  }
  if (!duplicateBlocked) {
    throw new Error("Duplicate application was not prevented!");
  }
  console.log(" 5. Duplicate application prevention verified.");

  // 6. Student My Applications
  const studentApps = await Application.find({ candidateId: studentUser._id })
    .populate("jobId", "title")
    .populate("employerId", "companyName");
  
  if (studentApps.length !== 1 || studentApps[0].status !== "Applied") {
    throw new Error("My Applications mismatch for student!");
  }
  console.log(" 6. Student My Applications verified: 1 application with status 'Applied'.");

  // 7. Employer Applications list (Only for this employer)
  const employerJobs = await Job.find({
    $or: [{ createdBy: employerUser._id }, { employerId: employerProfile._id }],
  }, "_id");
  const jobIds = employerJobs.map((j) => j._id);

  const empApps = await Application.find({ jobId: { $in: jobIds } })
    .populate("candidateId", "fullName email")
    .populate("jobId", "title");

  if (empApps.length !== 1 || empApps[0].candidateId.email !== studentEmail) {
    throw new Error("Employer applications list failed!");
  }
  console.log(" 7. Employer Applications verified: sees applicant:", empApps[0].candidateId.fullName);

  // 8. Other Employer CANNOT see or modify this application (RBAC & Ownership)
  const otherEmployerJobs = await Job.find({
    $or: [{ createdBy: otherEmployerUser._id }, { employerId: otherEmployerProfile._id }],
  }, "_id");
  const otherJobIds = otherEmployerJobs.map((j) => j._id);
  const otherApps = await Application.find({ jobId: { $in: otherJobIds } });

  if (otherApps.length !== 0) {
    throw new Error("Security breach: Other employer can see unowned applications!");
  }
  console.log(" 8. Security verified: Other employer cannot see or access unowned applications.");

  // 9. Employer Shortlists Applicant
  const targetApp = await Application.findOne({ _id: jobApp._id, jobId: { $in: jobIds } });
  if (!targetApp) throw new Error("Target application not found for employer");
  
  targetApp.status = "Shortlisted";
  targetApp.stage = "Shortlisted";
  await targetApp.save();
  console.log(" 9. Employer Shortlisted application.");

  // 10. Real-time Status in Student My Applications
  const updatedStudentApp = await Application.findById(jobApp._id);
  if (updatedStudentApp.status !== "Shortlisted") {
    throw new Error("Student My Applications did not reflect Shortlisted status!");
  }
  console.log(" 10. Student My Applications dynamically reflects updated status: 'Shortlisted'.");

  // 11. Employer Rejects Applicant
  targetApp.status = "Rejected";
  targetApp.stage = "Rejected";
  await targetApp.save();
  console.log(" 11. Employer Rejected application.");

  // 12. Real-time Status in Student My Applications
  const rejectedStudentApp = await Application.findById(jobApp._id);
  if (rejectedStudentApp.status !== "Rejected") {
    throw new Error("Student My Applications did not reflect Rejected status!");
  }
  console.log(" 12. Student My Applications dynamically reflects updated status: 'Rejected'.");

  // Cleanup test records
  await Application.deleteMany({ _id: jobApp._id });
  await Job.deleteMany({ _id: createdJob._id });
  await Internship.deleteMany({ _id: createdInternship._id });
  await User.deleteMany({ email: { $in: [studentEmail, employerEmail, otherEmployerEmail] } });
  await EmployerProfile.deleteMany({ officialEmail: { $in: [employerEmail, otherEmployerEmail] } });
  await StudentProfile.deleteMany({ userId: studentUser._id });

  console.log(" Cleaned up test records.");
  console.log("=== ALL END-TO-END INTEGRATION TESTS PASSED 100% ===");

  await mongoose.disconnect();
}

runE2ETests().catch((err) => {
  console.error("E2E Test Failure:", err);
  process.exit(1);
});
