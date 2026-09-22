// server/scripts/test-job-visibility-eligibility.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const JobVisibility = require("../models/JobVisibility");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");
const jobEligibilityService = require("../services/jobEligibilityService");
const request = require("supertest");
const app = require("../app");

async function runTests() {
  console.log("\n=======================================================");
  console.log("   AUTOMATIC JOB VISIBILITY & ELIGIBILITY TEST SUITE   ");
  console.log("=======================================================\n");

  await connectDB();

  const timestamp = Date.now();
  const createdIds = {
    users: [],
    profiles: [],
    jobs: [],
    visibilityConfigs: [],
  };

  try {
    // -------------------------------------------------------------
    // Setup Mock Employer
    // -------------------------------------------------------------
    const employerUser = await User.create({
      fullName: "Campus Recruiter Employer",
      username: `recruiter_${timestamp}`,
      email: `recruiter_${timestamp}@company.com`,
      role: "employer",
      userType: "employer",
    });
    createdIds.users.push(employerUser._id);

    const employerProfile = await EmployerProfile.create({
      userId: employerUser._id,
      companyName: "Acme Tech Solutions",
      officialEmail: `recruiter_${timestamp}@company.com`,
      mobile: "9876543210",
      industry: "Information Technology",
    });
    createdIds.profiles.push(employerProfile._id);

    // -------------------------------------------------------------
    // Setup Student 1: Geeta University Student with React, JavaScript, HTML, CSS
    // -------------------------------------------------------------
    const studentGeetaSkilled = await User.create({
      fullName: "Aarav Sharma",
      username: `aarav_${timestamp}`,
      email: `aarav_${timestamp}@geetauniversity.edu.in`,
      role: "user",
      userType: "student",
      college: "Geeta University",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      endYear: 2025,
    });
    createdIds.users.push(studentGeetaSkilled._id);

    const profileGeetaSkilled = await StudentProfile.create({
      userId: studentGeetaSkilled._id,
      education: [
        {
          institution: "Geeta University",
          degree: "B.Tech",
          fieldOfStudy: "Computer Science & Engineering",
          endYear: 2025,
        },
      ],
      technicalSkills: ["React", "JavaScript", "HTML", "CSS", "Git"],
    });
    createdIds.profiles.push(profileGeetaSkilled._id);

    // -------------------------------------------------------------
    // Setup Student 2: Geeta University Student without required skills (Only Python, SQL)
    // -------------------------------------------------------------
    const studentGeetaUnskilled = await User.create({
      fullName: "Neha Verma",
      username: `neha_${timestamp}`,
      email: `neha_${timestamp}@geetauniversity.edu.in`,
      role: "user",
      userType: "student",
      college: "Geeta University",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      endYear: 2025,
    });
    createdIds.users.push(studentGeetaUnskilled._id);

    const profileGeetaUnskilled = await StudentProfile.create({
      userId: studentGeetaUnskilled._id,
      education: [
        {
          institution: "Geeta University",
          degree: "B.Tech",
          fieldOfStudy: "Computer Science & Engineering",
          endYear: 2025,
        },
      ],
      technicalSkills: ["Python", "SQL"], // Missing React, JavaScript, HTML, CSS
    });
    createdIds.profiles.push(profileGeetaUnskilled._id);

    // -------------------------------------------------------------
    // Setup Student 3: Student from another university (Delhi University) with React, JavaScript
    // -------------------------------------------------------------
    const studentOtherUni = await User.create({
      fullName: "Rohan Kapoor",
      username: `rohan_${timestamp}`,
      email: `rohan_${timestamp}@du.ac.in`,
      role: "user",
      userType: "student",
      college: "Delhi University",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      endYear: 2025,
    });
    createdIds.users.push(studentOtherUni._id);

    const profileOtherUni = await StudentProfile.create({
      userId: studentOtherUni._id,
      education: [
        {
          institution: "Delhi University",
          degree: "B.Tech",
          fieldOfStudy: "Computer Science & Engineering",
          endYear: 2025,
        },
      ],
      technicalSkills: ["React", "JavaScript", "HTML", "CSS", "Python"],
    });
    createdIds.profiles.push(profileOtherUni._id);

    // -------------------------------------------------------------
    // Setup Job 1: Geeta University On-Campus Job
    // -------------------------------------------------------------
    const onCampusJob = await Job.create({
      employerId: employerProfile._id,
      createdBy: employerUser._id,
      companyName: "Acme Tech Solutions",
      title: "Frontend Developer Intern (Campus Drive)",
      department: "Engineering",
      employmentType: "Internship",
      workMode: "Hybrid",
      location: "Panipat Campus",
      requiredSkills: ["React", "JavaScript", "HTML", "CSS"],
      description: "On-campus internship drive for frontend engineering.",
      status: "Published",
    });
    createdIds.jobs.push(onCampusJob._id);

    const onCampusVisibility = await JobVisibility.create({
      jobId: onCampusJob._id,
      employerId: employerProfile._id,
      createdBy: employerUser._id,
      hiringScope: "On-Campus",
      targetInstitution: "Geeta University",
      allowedInstitutions: ["Geeta University"],
      requiredSkills: ["React", "JavaScript", "HTML", "CSS"],
      eligibilityCriteria: {
        degrees: ["B.Tech", "BCA"],
        branches: ["Computer Science & Engineering", "Information Technology"],
        graduationYears: [2025, 2026],
        experienceLevel: "Fresher / Entry-Level",
      },
      isActive: true,
    });
    createdIds.visibilityConfigs.push(onCampusVisibility._id);

    // -------------------------------------------------------------
    // Setup Job 2: Open / Off-Campus Job
    // -------------------------------------------------------------
    const openJob = await Job.create({
      employerId: employerProfile._id,
      createdBy: employerUser._id,
      companyName: "Acme Tech Solutions",
      title: "Software Engineer Trainee (Open Drive)",
      department: "Engineering",
      employmentType: "Full-time",
      workMode: "Remote",
      location: "All India / Remote",
      requiredSkills: ["React", "JavaScript"],
      description: "Open off-campus drive for graduating software engineers.",
      status: "Published",
    });
    createdIds.jobs.push(openJob._id);

    const openVisibility = await JobVisibility.create({
      jobId: openJob._id,
      employerId: employerProfile._id,
      createdBy: employerUser._id,
      hiringScope: "Open / Off-Campus",
      targetInstitution: "Open",
      allowedInstitutions: [],
      requiredSkills: ["React", "JavaScript"],
      eligibilityCriteria: {
        degrees: ["B.Tech", "BCA", "MCA"],
        branches: ["Computer Science & Engineering", "Information Technology"],
        graduationYears: [2025, 2026],
        experienceLevel: "Fresher / Entry-Level",
      },
      isActive: true,
    });
    createdIds.visibilityConfigs.push(openVisibility._id);

    console.log("✔ Test data created successfully.");

    // =========================================================================
    // SCENARIO 1: Geeta University student + Geeta University On-Campus job + matching skills
    // EXPECTED: Visible & Eligible
    // =========================================================================
    console.log("\n--- Running Scenario 1 ---");
    const res1 = await jobEligibilityService.getEligibleJobsForStudent(studentGeetaSkilled._id);
    const foundJob1 = res1.jobs.find((j) => j._id.toString() === onCampusJob._id.toString());

    if (!foundJob1) {
      throw new Error("FAIL: Geeta University student could not see the Geeta University On-Campus job!");
    }
    if (!foundJob1.evaluation.isVisible) {
      throw new Error("FAIL: On-Campus job was marked as not visible for Geeta University student!");
    }
    if (!foundJob1.evaluation.isEligible) {
      throw new Error(`FAIL: Skilled Geeta student was marked as not eligible: ${foundJob1.evaluation.reasons.join("; ")}`);
    }
    if (foundJob1.evaluation.matchScore !== 100) {
      throw new Error(`FAIL: Expected 100% match score, got ${foundJob1.evaluation.matchScore}%`);
    }
    console.log("✔ PASS Scenario 1: Geeta University student sees Geeta University On-Campus job and is 100% eligible.");

    // =========================================================================
    // SCENARIO 2: Geeta University student + Geeta University On-Campus job + non-matching skills
    // EXPECTED: Visible (since On-Campus for Geeta) BUT Not eligible due to missing skills
    // =========================================================================
    console.log("\n--- Running Scenario 2 ---");
    const res2 = await jobEligibilityService.getEligibleJobsForStudent(studentGeetaUnskilled._id);
    const foundJob2 = res2.jobs.find((j) => j._id.toString() === onCampusJob._id.toString());

    if (!foundJob2) {
      throw new Error("FAIL: Geeta University student should see the campus job listed with missing skill requirements!");
    }
    if (foundJob2.evaluation.isEligible) {
      throw new Error("FAIL: Student without React/JavaScript/HTML/CSS was incorrectly marked eligible!");
    }
    if (!foundJob2.evaluation.missingSkills.includes("React")) {
      throw new Error("FAIL: Missing skills did not include React!");
    }
    console.log("✔ PASS Scenario 2: Geeta student with non-matching skills is marked NOT eligible with missing skills: " +
      foundJob2.evaluation.missingSkills.join(", "));

    // =========================================================================
    // SCENARIO 3: Student from another university (Delhi University) + Geeta University On-Campus job
    // EXPECTED: NOT Visible (filtered out on backend) AND 403 Forbidden on direct fetch
    // =========================================================================
    console.log("\n--- Running Scenario 3 ---");
    const res3 = await jobEligibilityService.getEligibleJobsForStudent(studentOtherUni._id);
    const foundJob3 = res3.jobs.find((j) => j._id.toString() === onCampusJob._id.toString());

    if (foundJob3) {
      throw new Error("SECURITY FAILURE: Student from Delhi University was able to see Geeta University's On-Campus job in listings!");
    }

    // Direct backend access verification check:
    let directAccessBlocked = false;
    try {
      await jobEligibilityService.verifyStudentCanAccessJob(studentOtherUni._id, onCampusJob._id);
    } catch (err) {
      if (err.statusCode === 403) {
        directAccessBlocked = true;
      }
    }

    if (!directAccessBlocked) {
      throw new Error("SECURITY FAILURE: Student from another university was NOT blocked with 403 on direct access to On-Campus job!");
    }
    console.log("✔ PASS Scenario 3: Student from another university cannot see Geeta University On-Campus job, and direct backend access is blocked with 403 Forbidden.");

    // =========================================================================
    // SCENARIO 4: Student from another university + Open job + matching requirements
    // EXPECTED: Visible & Eligible
    // =========================================================================
    console.log("\n--- Running Scenario 4 ---");
    const foundJob4 = res3.jobs.find((j) => j._id.toString() === openJob._id.toString());

    if (!foundJob4) {
      throw new Error("FAIL: Student from another university could not see the Open / Off-Campus job!");
    }
    if (!foundJob4.evaluation.isEligible) {
      throw new Error(`FAIL: Student meeting Open job criteria was marked not eligible: ${foundJob4.evaluation.reasons.join("; ")}`);
    }
    console.log("✔ PASS Scenario 4: Student from another university can see and apply for Open / Off-Campus job.");

    // =========================================================================
    // SCENARIO 5: Student without required skills for Open job
    // EXPECTED: Not eligible
    // =========================================================================
    console.log("\n--- Running Scenario 5 ---");
    const res5 = await jobEligibilityService.getEligibleJobsForStudent(studentGeetaUnskilled._id);
    const foundJob5 = res5.jobs.find((j) => j._id.toString() === openJob._id.toString());

    if (!foundJob5) {
      throw new Error("FAIL: Open job should be visible in student listings!");
    }
    if (foundJob5.evaluation.isEligible) {
      throw new Error("FAIL: Student without React/JavaScript was marked eligible for Open job!");
    }
    console.log("✔ PASS Scenario 5: Student without required skills is marked NOT eligible for the Open job.");

    // =========================================================================
    // SCENARIO 6: Unauthenticated user accessing protected job eligibility APIs
    // EXPECTED: 401 Unauthorized
    // =========================================================================
    console.log("\n--- Running Scenario 6 ---");
    const unauthRes = await request(app)
      .get("/api/job-visibility/student/eligible-jobs")
      .expect(401);

    if (unauthRes.status !== 401) {
      throw new Error(`FAIL: Expected 401 Unauthorized for unauthenticated request, got ${unauthRes.status}`);
    }
    console.log("✔ PASS Scenario 6: Unauthenticated user receives 401 Unauthorized when trying to access eligibility APIs.");

    console.log("\n=======================================================");
    console.log("   ALL 6 SCENARIOS PASSED WITH ZERO DISRUPTIONS! 🎉   ");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:\n", error);
    process.exitCode = 1;
  } finally {
    // Cleanup test records
    console.log("Cleaning up temporary test records...");
    await JobVisibility.deleteMany({ _id: { $in: createdIds.visibilityConfigs } });
    await Job.deleteMany({ _id: { $in: createdIds.jobs } });
    await StudentProfile.deleteMany({ _id: { $in: createdIds.profiles } });
    await EmployerProfile.deleteMany({ _id: { $in: createdIds.profiles } });
    await User.deleteMany({ _id: { $in: createdIds.users } });
    console.log("Cleanup complete.");
    await mongoose.connection.close();
  }
}

runTests();
