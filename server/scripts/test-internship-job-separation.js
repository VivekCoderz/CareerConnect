require("dotenv").config({ path: "server/.env" });
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");
const { getAggregatedOpportunities } = require("../services/jobScraperService");
const studentController = require("../controllers/studentController");

async function testCategorySeparation() {
  console.log("=== STARTING INTERNSHIP VS JOB CATEGORY SEPARATION TEST ===");
  await connectDB();

  const timestamp = Date.now();
  const employerUser = await User.create({
    fullName: "Separation Test Employer",
    username: "sep_emp_" + timestamp,
    email: `sep_emp_${timestamp}@test.com`,
    role: "employer",
    userType: "employer",
  });

  const employerProfile = await EmployerProfile.create({
    userId: employerUser._id,
    companyName: "Separation Tech Solutions",
    officialEmail: `sep_emp_${timestamp}@test.com`,
    mobile: "9988776655",
    industry: "Information Technology",
  });

  const studentUser = await User.create({
    fullName: "Separation Test Student",
    username: "sep_stud_" + timestamp,
    email: `sep_stud_${timestamp}@test.com`,
    role: "user",
    userType: "student",
  });

  const studentProfile = await StudentProfile.create({
    userId: studentUser._id,
    fullName: "Separation Test Student",
    degree: "B.Tech Computer Science",
    institution: "Geeta University",
    technicalSkills: ["JavaScript", "React"],
  });

  // 1. Post an Internship
  const postedInternship = await Internship.create({
    employerId: employerProfile._id,
    createdBy: employerUser._id,
    companyName: employerProfile.companyName,
    title: "Backend Node.js Intern (Sep Test)",
    category: "Web Development",
    location: "Panipat / Remote",
    workMode: "Remote",
    stipend: "₹18,000/month",
    duration: "3 Months",
    requiredSkills: ["Node.js", "Express", "MongoDB"],
    description: "Work on backend API microservices.",
    status: "Published",
  });

  // 2. Post a Job
  const postedJob = await Job.create({
    employerId: employerProfile._id,
    createdBy: employerUser._id,
    title: "Senior React Engineer (Sep Test)",
    department: "Frontend",
    employmentType: "Full-time",
    workMode: "Hybrid",
    location: "Panipat / Delhi NCR",
    salaryRange: { min: 800000, max: 1400000, currency: "INR" },
    requiredSkills: ["React", "Redux", "TypeScript"],
    description: "Lead frontend architecture for web portals.",
    status: "Published",
  });

  console.log(" Created 1 Internship and 1 Full-time Job in MongoDB.");

  // 3. Test Opportunities Matrix Feed with Filters
  const internFeed = await getAggregatedOpportunities({ opportunityType: "internship", search: "Sep Test" });
  const hasInternInInternFeed = internFeed.data.some((o) => o._id === postedInternship._id.toString());
  const hasJobInInternFeed = internFeed.data.some((o) => o._id === postedJob._id.toString());

  if (!hasInternInInternFeed) throw new Error("Internship feed did NOT include posted internship!");
  if (hasJobInInternFeed) throw new Error("Internship feed incorrectly included a full-time job!");
  console.log(" Test 1 Passed: Opportunities filter (opportunityType=internship) shows only internships.");

  const jobFeed = await getAggregatedOpportunities({ opportunityType: "fulltime", search: "Sep Test" });
  const hasJobInJobFeed = jobFeed.data.some((o) => o._id === postedJob._id.toString());
  const hasInternInJobFeed = jobFeed.data.some((o) => o._id === postedInternship._id.toString());

  if (!hasJobInJobFeed) throw new Error("Job feed did NOT include posted full-time job!");
  if (hasInternInJobFeed) throw new Error("Job feed incorrectly included an internship!");
  console.log(" Test 2 Passed: Opportunities filter (opportunityType=fulltime) shows only jobs.");

  // 4. Test Student Dashboard Recommendations
  const req = { user: studentUser };
  let dashboardDataResult = null;
  const res = {
    status: () => ({ json: (data) => { dashboardDataResult = data; } }),
    json: (data) => { dashboardDataResult = data; },
  };

  await studentController.getStudentDashboard(req, res, () => {});

  if (!dashboardDataResult?.success || !dashboardDataResult?.data) {
    throw new Error("Failed to get student dashboard data!");
  }

  const { recommendedInternships, recommendedJobs } = dashboardDataResult.data;

  const foundInternInDash = recommendedInternships.some((i) => i.id === postedInternship._id.toString());
  const foundJobInDashInterns = recommendedInternships.some((i) => i.id === postedJob._id.toString());
  const foundJobInDashJobs = recommendedJobs.some((j) => j.id === postedJob._id.toString());
  const foundInternInDashJobs = recommendedJobs.some((j) => j.id === postedInternship._id.toString());

  if (!foundInternInDash) throw new Error("Student Dashboard recommendedInternships did NOT include posted internship!");
  if (foundJobInDashInterns) throw new Error("Student Dashboard recommendedInternships incorrectly contained a job!");
  if (!foundJobInDashJobs) throw new Error("Student Dashboard recommendedJobs did NOT include posted job!");
  if (foundInternInDashJobs) throw new Error("Student Dashboard recommendedJobs incorrectly contained an internship!");

  console.log(" Test 3 Passed: Student Dashboard properly separates Internships and Jobs.");

  // Cleanup
  await Internship.deleteMany({ _id: postedInternship._id });
  await Job.deleteMany({ _id: postedJob._id });
  await User.deleteMany({ _id: { $in: [employerUser._id, studentUser._id] } });
  await EmployerProfile.deleteMany({ _id: employerProfile._id });
  await StudentProfile.deleteMany({ _id: studentProfile._id });

  console.log(" Cleaned up test data.");
  console.log("=== ALL CATEGORIZATION AND SEPARATION TESTS PASSED 100% ===");

  await mongoose.disconnect();
}

testCategorySeparation().catch((err) => {
  console.error("Test Failure:", err);
  process.exit(1);
});
