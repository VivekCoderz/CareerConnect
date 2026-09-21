const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const User = require("../../models/User");
const Company = require("../../models/Company");
const Job = require("../../models/Job");
const Application = require("../../models/Application");
const Interview = require("../../models/Interview");
const { createUserWithToken, generateToken } = require("../helpers/createTestUser");

describe("🛡️ Employer Hub Dashboard — Multi-Tenant Security & Isolation", () => {
  let companyA, companyB;
  let employerUserA, tokenA;
  let employerUserB, tokenB;
  let candidateUser, tokenCandidate;

  beforeEach(async () => {
    // 1. Create Company A and Company B
    companyA = await Company.create({
      name: `Acme Corp ${Date.now()}_A`,
      email: `acme_${Date.now()}@corp.com`,
      status: "active",
    });

    companyB = await Company.create({
      name: `Stark Industries ${Date.now()}_B`,
      email: `stark_${Date.now()}@industries.com`,
      status: "active",
    });

    // 2. Create Employer A bound to Company A
    const tsA = Date.now();
    employerUserA = await User.create({
      fullName: "Alice Acme",
      email: `alice_${tsA}@acme.com`,
      phone: `91${String(tsA).slice(-8)}`,
      role: "employer",
      userType: "employer",
      companyId: companyA._id,
      isEmailVerified: true,
      isProfileComplete: true,
    });
    tokenA = generateToken(employerUserA._id);

    // 3. Create Employer B bound to Company B
    const tsB = Date.now() + 1;
    employerUserB = await User.create({
      fullName: "Bob Stark",
      email: `bob_${tsB}@stark.com`,
      phone: `92${String(tsB).slice(-8)}`,
      role: "employer",
      userType: "employer",
      companyId: companyB._id,
      isEmailVerified: true,
      isProfileComplete: true,
    });
    tokenB = generateToken(employerUserB._id);

    // 4. Create Candidate
    const { user: cand, token: cToken } = await createUserWithToken({
      fullName: "Charlie Candidate",
      email: `cand_${Date.now()}@gmail.com`,
    });
    candidateUser = cand;
    tokenCandidate = cToken;
  });

  it("🔒 employer of Company A sees zero rows from Company B", async () => {
    // Populate Company A data: 1 active job, 1 application, 1 future interview
    const jobA = await Job.create({
      companyId: companyA._id,
      createdBy: employerUserA._id,
      title: "Full Stack Engineer (Company A)",
      location: "Bangalore",
      status: "Published",
      employmentType: "Full-time",
      description: "Company A role description",
    });

    const appA = await Application.create({
      companyId: companyA._id,
      jobId: jobA._id,
      candidateId: candidateUser._id,
      studentName: candidateUser.fullName,
      studentEmail: candidateUser.email,
      opportunityType: "Job",
      opportunityTitle: jobA.title,
      status: "Applied",
    });

    const futureDateA = new Date(Date.now() + 86400000 * 2); // 2 days ahead
    await Interview.create({
      companyId: companyA._id,
      jobId: jobA._id,
      applicationId: appA._id,
      candidateId: candidateUser._id,
      employerId: new mongoose.Types.ObjectId(),
      scheduledDate: futureDateA.toISOString().split("T")[0],
      startTime: "11:00 AM",
      scheduledAt: futureDateA,
      status: "scheduled",
    });

    // Populate Company B data: 2 active jobs, 2 applications, 1 interview
    const jobB = await Job.create({
      companyId: companyB._id,
      createdBy: employerUserB._id,
      title: "DevOps Engineer (Company B)",
      location: "Pune",
      status: "Published",
      employmentType: "Full-time",
      description: "Company B role description",
    });

    const appB = await Application.create({
      companyId: companyB._id,
      jobId: jobB._id,
      candidateId: candidateUser._id,
      studentName: candidateUser.fullName,
      studentEmail: candidateUser.email,
      opportunityType: "Job",
      opportunityTitle: jobB.title,
      status: "Shortlisted",
    });

    const futureDateB = new Date(Date.now() + 86400000 * 3);
    await Interview.create({
      companyId: companyB._id,
      jobId: jobB._id,
      applicationId: appB._id,
      candidateId: candidateUser._id,
      employerId: new mongoose.Types.ObjectId(),
      scheduledDate: futureDateB.toISOString().split("T")[0],
      startTime: "02:00 PM",
      scheduledAt: futureDateB,
      status: "scheduled",
    });

    // Request dashboard as Employer A
    const resA = await request(app)
      .get("/api/employer/dashboard")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.statusCode).toBe(200);
    expect(resA.body.success).toBe(true);

    // Employer A must see ONLY Company A data
    expect(resA.body.kpis.activeJobs).toBe(1);
    expect(resA.body.kpis.newApplications).toBe(1);
    expect(resA.body.kpis.upcomingInterviews).toBe(1);

    expect(resA.body.activeJobs.length).toBe(1);
    expect(resA.body.activeJobs[0].title).toBe("Full Stack Engineer (Company A)");

    expect(resA.body.recentApplications.length).toBe(1);
    expect(resA.body.recentApplications[0].jobTitle).toBe("Full Stack Engineer (Company A)");

    expect(resA.body.upcomingInterviews.length).toBe(1);
    expect(resA.body.upcomingInterviews[0].jobTitle).toBe("Full Stack Engineer (Company A)");

    // Ensure zero references to Company B jobs or applications
    const hasCompanyBJob = resA.body.activeJobs.some((j) => j.title.includes("Company B"));
    const hasCompanyBApp = resA.body.recentApplications.some((a) => a.jobTitle.includes("Company B"));
    const hasCompanyBInterview = resA.body.upcomingInterviews.some((i) => i.jobTitle.includes("Company B"));

    expect(hasCompanyBJob).toBe(false);
    expect(hasCompanyBApp).toBe(false);
    expect(hasCompanyBInterview).toBe(false);
  });

  it("⛔ spoofed companyId parameter yields 403 Forbidden", async () => {
    // Employer A attempts to spoof Company B's ID via query param
    const res = await request(app)
      .get(`/api/employer/dashboard?companyId=${companyB._id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("FORBIDDEN_COMPANY_ACCESS");
  });

  it("✨ fresh company (0 data) renders clean empty states, no crash", async () => {
    // Request dashboard as Employer B with zero rows created
    const res = await request(app)
      .get("/api/employer/dashboard")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.kpis.activeJobs).toBe(0);
    expect(res.body.kpis.newApplications).toBe(0);
    expect(res.body.kpis.upcomingInterviews).toBe(0);
    expect(res.body.kpis.offersPending).toBe(0);

    expect(res.body.activeJobs).toEqual([]);
    expect(res.body.recentApplications).toEqual([]);
    expect(res.body.upcomingInterviews).toEqual([]);
    expect(res.body.activity).toEqual([]);

    // Pipeline has 0 for all stages
    expect(res.body.pipeline.every((p) => p.count === 0)).toBe(true);
  });
});
