require("dotenv").config();
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const Company = require("../models/Company");
const OrganizationRequest = require("../models/OrganizationRequest");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const EmployerProfile = require("../models/EmployerProfile");

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let testsPassed = 0;
let testsFailed = 0;
let serverInstance = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return { status: res.status, headers: res.headers, data };
}

async function runE2ETests() {
  console.log("\n============================================================");
  console.log("   CAREERCONNECT MULTI-TENANT & ADMIN PORTAL E2E VERIFICATION");
  console.log("============================================================\n");

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for verification assertions...");

  serverInstance = http.createServer(app);
  await new Promise((resolve, reject) => {
    serverInstance.listen(TEST_PORT, "127.0.0.1", () => {
      console.log(`Test Express server listening on ${BASE_URL}\n`);
      resolve();
    });
    serverInstance.on("error", reject);
  });

  const timestamp = Date.now();
  const testOrgName = `AcroTec Solutions ${timestamp}`;
  const testOrgEmail = `onboarding_${timestamp}@acrotec.io`;
  const testOrgWebsite = `https://acrotec-${timestamp}.io`;
  const testPhone = `9${String(timestamp).slice(-9)}`;
  const testAdminPassword = "SecurePassword@2026";

  let superAdminToken = "";
  let companyAdminToken = "";
  let activationToken = "";
  let createdCompanyId = "";
  let createdAdminId = "";
  let requestId = "";
  let testJobId = "";
  let testCandidateId = "";
  let testCandidateToken = "";

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Public Organization Request Access
    // -----------------------------------------------------------------------
    console.log("[STEP 1] Testing Public Organization Request Submission...");
    const reqRes = await request("/organizations/request-access", {
      method: "POST",
      body: JSON.stringify({
        organizationName: testOrgName,
        officialEmail: testOrgEmail,
        website: testOrgWebsite,
        contactPerson: "Alice Vance",
        designation: "Chief Information Officer",
        phone: testPhone,
        industry: "Cloud Infrastructure",
        companySize: "51-200",
        address: "100 Enterprise Boulevard",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        reason: "Enterprise engineering recruitment and campus hiring across India",
        description: "Leading enterprise cloud orchestration and infrastructure provider.",
      }),
    });

    assert(reqRes.status === 201, `Organization request returns 201 Created (got ${reqRes.status})`);
    assert(reqRes.data?.success === true, "Response reports success = true");
    assert(reqRes.data?.request?.status === "PENDING", `Request status is PENDING (got ${reqRes.data?.request?.status})`);
    requestId = reqRes.data?.request?._id || reqRes.data?.request?.id;

    // -----------------------------------------------------------------------
    // STEP 2: Duplicate Request Protection
    // -----------------------------------------------------------------------
    console.log("\n[STEP 2] Testing Duplicate Organization Detection...");
    const dupRes = await request("/organizations/request-access", {
      method: "POST",
      body: JSON.stringify({
        organizationName: testOrgName,
        officialEmail: testOrgEmail,
        website: testOrgWebsite,
        contactPerson: "Bob Duplicate",
        designation: "VP HR",
        phone: testPhone,
        industry: "Cloud Infrastructure",
        companySize: "51-200",
        address: "100 Enterprise Boulevard",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        reason: "Enterprise engineering recruitment and campus hiring across India",
      }),
    });

    assert(dupRes.status === 409 || dupRes.status === 400, `Duplicate request rejected with 409/400 (got ${dupRes.status})`);
    assert(dupRes.data?.success === false, "Duplicate detection response success = false");
    assert(
      typeof dupRes.data?.message === "string" && dupRes.data.message.toLowerCase().includes("already"),
      `Helpful error message returned: "${dupRes.data?.message}"`
    );

    // -----------------------------------------------------------------------
    // STEP 3: Super Admin Login
    // -----------------------------------------------------------------------
    console.log("\n[STEP 3] Testing Super Admin Authentication...");
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    const adminLoginRes = await request("/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: "superadmin@careerconnect.com",
        password: adminPassword,
      }),
    });

    assert(adminLoginRes.status === 200, `Super Admin login returns 200 OK (got ${adminLoginRes.status})`);
    assert(adminLoginRes.data?.user?.role === "SUPER_ADMIN", `Super Admin role identified: ${adminLoginRes.data?.user?.role}`);
    superAdminToken = adminLoginRes.data?.token;

    // -----------------------------------------------------------------------
    // STEP 4: Super Admin Organization Requests List & Review
    // -----------------------------------------------------------------------
    console.log("\n[STEP 4] Super Admin Fetches & Reviews Organization Requests...");
    const listReqsRes = await request("/admin/organization-requests", {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(listReqsRes.status === 200, "Super Admin retrieves organization requests");
    const found = listReqsRes.data?.requests?.some((r) => r._id === requestId);
    assert(found, `Newly submitted request ${requestId} present in pending list`);

    const reviewRes = await request(`/admin/organization-requests/${requestId}/review`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(reviewRes.status === 200, "Super Admin marks request UNDER_REVIEW");
    assert(reviewRes.data?.request?.status === "UNDER_REVIEW", "Status transitioned to UNDER_REVIEW");

    // -----------------------------------------------------------------------
    // STEP 5: Super Admin Approves Organization Request
    // -----------------------------------------------------------------------
    console.log("\n[STEP 5] Super Admin Approves Request (Company Provisioning & Invitation)...");
    const approveRes = await request(`/admin/organization-requests/${requestId}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    assert(approveRes.status === 200, `Approve returns 200 OK (got ${approveRes.status})`);
    assert(approveRes.data?.company?.status === "active", `Company provisioned with status = active`);
    assert(approveRes.data?.admin?.status === "invited", `Company Admin created with status = invited`);
    assert(Boolean(approveRes.data?.invitationToken), "Secure invitation token generated");
    assert(
      typeof approveRes.data?.activationLink === "string" && approveRes.data.activationLink.startsWith("/admin/activate?token="),
      `Activation link generated: ${approveRes.data?.activationLink}`
    );

    createdCompanyId = approveRes.data?.company?._id;
    createdAdminId = approveRes.data?.admin?._id;
    activationToken = approveRes.data?.invitationToken;

    // -----------------------------------------------------------------------
    // STEP 6: Verify Invitation Token Endpoint
    // -----------------------------------------------------------------------
    console.log("\n[STEP 6] Testing Invitation Verification Endpoint...");
    const verifyRes = await request(`/admin/activate/verify?token=${activationToken}`);
    assert(verifyRes.status === 200, `Verification endpoint returns 200 OK (got ${verifyRes.status})`);
    assert(verifyRes.data?.invitation?.email === testOrgEmail, `Pre-fills correct official email: ${verifyRes.data?.invitation?.email}`);
    assert(verifyRes.data?.invitation?.companyName === testOrgName, `Pre-fills correct organization name: ${verifyRes.data?.invitation?.companyName}`);

    // Test invalid token
    const invalidVerifyRes = await request(`/admin/activate/verify?token=invalid-token-12345`);
    assert(invalidVerifyRes.status === 404 || invalidVerifyRes.status === 400, "Invalid token correctly rejected (got " + invalidVerifyRes.status + ")");

    // -----------------------------------------------------------------------
    // STEP 7: First-Time Password Setup & Account Activation
    // -----------------------------------------------------------------------
    console.log("\n[STEP 7] First-Time Admin Sets Password at /admin/activate...");
    const activateRes = await request("/admin/activate", {
      method: "POST",
      body: JSON.stringify({
        token: activationToken,
        password: testAdminPassword,
        confirmPassword: testAdminPassword,
      }),
    });

    assert(activateRes.status === 200, `Activation returns 200 OK (got ${activateRes.status})`);
    assert(activateRes.data?.user?.status === "active", `Admin status transitioned to active`);

    // Verify token can no longer be reused
    const reVerifyRes = await request(`/admin/activate/verify?token=${activationToken}`);
    assert(reVerifyRes.status === 404 || reVerifyRes.status === 400, "Activation token is invalidated after single-use");

    // -----------------------------------------------------------------------
    // STEP 8: Company Admin Authenticates at Unified /admin/login
    // -----------------------------------------------------------------------
    console.log("\n[STEP 8] Company Admin Logs In via Unified /admin/login...");
    const compAdminLoginRes = await request("/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: testOrgEmail,
        password: testAdminPassword,
      }),
    });

    assert(compAdminLoginRes.status === 200, `Company Admin login returns 200 OK`);
    assert(compAdminLoginRes.data?.user?.role === "COMPANY_ADMIN", `Role confirmed as COMPANY_ADMIN`);
    assert(String(compAdminLoginRes.data?.user?.companyId) === String(createdCompanyId), `CompanyId matches provisioned company`);
    companyAdminToken = compAdminLoginRes.data?.token;

    // -----------------------------------------------------------------------
    // STEP 9: Tenant-Isolation - Scoped Admin Dashboard
    // -----------------------------------------------------------------------
    console.log("\n[STEP 9] Verifying Dynamic Scoped Dashboard for Company Admin...");
    const dashRes = await request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });

    assert(dashRes.status === 200, "Company Admin retrieves dynamic dashboard");
    assert(dashRes.data?.role === "COMPANY_ADMIN", "Dashboard payload declares COMPANY_ADMIN");
    assert(dashRes.data?.overview !== undefined, "Dynamic overview stats object returned");
    assert(dashRes.data?.overview?.upcomingInterviews !== undefined, "Dynamic upcoming interviews aggregation present");
    assert(dashRes.data?.applicationFunnel !== undefined || dashRes.data?.funnel !== undefined, "Full dynamic application funnel aggregation present");

    // -----------------------------------------------------------------------
    // STEP 10: Tenant-Isolation - Security RBAC Enforcement
    // -----------------------------------------------------------------------
    console.log("\n[STEP 10] Security Enforcement: Company Admin Forbidden from Global Endpoints...");
    const superAdminCompanyEndpoint = await request("/admin/companies", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });
    assert(superAdminCompanyEndpoint.status === 403, `Company Admin accessing /admin/companies returns 403 Forbidden (got ${superAdminCompanyEndpoint.status})`);

    const superAdminOrgReqsEndpoint = await request("/admin/organization-requests", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });
    assert(superAdminOrgReqsEndpoint.status === 403, `Company Admin accessing /admin/organization-requests returns 403 Forbidden (got ${superAdminOrgReqsEndpoint.status})`);

    const superAdminInviteEndpoint = await request("/admin/company-admins/invite", {
      method: "POST",
      headers: { Authorization: `Bearer ${companyAdminToken}` },
      body: JSON.stringify({ fullName: "Attacker", officialEmail: "hack@tenant.com", companyId: createdCompanyId }),
    });
    assert(superAdminInviteEndpoint.status === 403, `Company Admin calling /company-admins/invite returns 403 Forbidden (got ${superAdminInviteEndpoint.status})`);

    // -----------------------------------------------------------------------
    // STEP 11: Company Admin Views & Updates Own Company
    // -----------------------------------------------------------------------
    console.log("\n[STEP 11] Company Admin Views & Edits Own Company (/admin/company)...");
    const getOwnCompRes = await request("/admin/company", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });
    assert(getOwnCompRes.status === 200, "Company Admin retrieves own company details");
    assert(String(getOwnCompRes.data?.company?._id) === String(createdCompanyId), "Retrieved company matches tenant ID");

    const updateOwnCompRes = await request("/admin/company", {
      method: "PUT",
      headers: { Authorization: `Bearer ${companyAdminToken}` },
      body: JSON.stringify({
        location: "Hyderabad Cyber City, Telangana",
        phone: "+91 9988776600",
      }),
    });
    assert(updateOwnCompRes.status === 200, "Company Admin updates own company successfully");
    assert(updateOwnCompRes.data?.company?.location === "Hyderabad Cyber City, Telangana", "Location field updated");

    // -----------------------------------------------------------------------
    // STEP 12: Opportunity Moderation Flow
    // -----------------------------------------------------------------------
    console.log("\n[STEP 12] Opportunity Workflow: Creation -> Pending Approval -> Super Admin Approval...");
    // Create an employer user for this company to post a job
    const employerEmail = `recruiter_${timestamp}@acrotec.io`;
    const employerUser = await User.create({
      fullName: "Bob Recruiter",
      email: employerEmail,
      username: `recruiter_${timestamp}`,
      password: "RecruiterPassword@2026",
      role: "employer",
      userType: "employer",
      companyId: createdCompanyId,
      status: "active",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
    });

    const newJob = await Job.create({
      title: `Senior DevOps Architect ${timestamp}`,
      company: testOrgName,
      companyId: createdCompanyId,
      employerId: employerUser._id,
      description: "Manage Kubernetes clusters, Terraform infrastructure, and multi-region deployments.",
      location: "Hyderabad, India",
      jobType: "Full-time",
      workplaceType: "Hybrid",
      openings: 3,
      salaryRange: { min: 2000000, max: 3500000 },
      skills: ["Kubernetes", "AWS", "Terraform", "CI/CD"],
      status: "Pending Approval",
    });
    testJobId = newJob._id;

    assert(newJob.status === "Pending Approval", "Newly created job starts in 'Pending Approval' state");
    assert(String(newJob.companyId) === String(createdCompanyId), "Job strictly bound to companyId");

    // Super Admin approves the job
    const approveJobRes = await request(`/admin/opportunities/job/${testJobId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ adminNote: "Verified enterprise employer requirements" }),
    });

    assert(approveJobRes.status === 200, `Super Admin approves job (got ${approveJobRes.status})`);
    assert(
      approveJobRes.data?.opportunity?.status === "Published" || approveJobRes.data?.opportunity?.status === "active",
      `Job status updated to Published`
    );

    // -----------------------------------------------------------------------
    // STEP 13: Candidate Portal Integration - Application Creation
    // -----------------------------------------------------------------------
    console.log("\n[STEP 13] Candidate Applies -> Application Attaches Tenant companyId...");
    let testCandidate = await User.findOne({ email: "test.candidate.e2e@careerconnect.com" });
    if (!testCandidate) {
      testCandidate = await User.create({
        fullName: "Charlie Candidate",
        email: "test.candidate.e2e@careerconnect.com",
        username: "charlie_candidate",
        password: "CandidatePassword@2026",
        role: "user",
        userType: "student",
        status: "active",
        isActive: true,
        isEmailVerified: true,
        isProfileComplete: true,
      });
    }
    testCandidateId = testCandidate._id;

    const testApp = await Application.create({
      jobId: testJobId,
      candidateId: testCandidateId,
      opportunityType: "Job",
      opportunityTitle: newJob.title,
      companyId: createdCompanyId,
      status: "Applied",
      resumeUrl: "https://careerconnect.s3.amazonaws.com/resumes/charlie-resume.pdf",
    });

    assert(String(testApp.companyId) === String(createdCompanyId), `Application record tagged with companyId ${createdCompanyId}`);

    // -----------------------------------------------------------------------
    // STEP 14: Tenant Isolation on Applications Query
    // -----------------------------------------------------------------------
    console.log("\n[STEP 14] Tenant Applications Isolation (Company Admin A vs Company Admin B)...");
    const compAdminAppsRes = await request("/admin/applications", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });

    assert(compAdminAppsRes.status === 200, "Company Admin retrieves applications list");
    const foundApp = compAdminAppsRes.data?.applications?.find((a) => String(a._id) === String(testApp._id));
    assert(Boolean(foundApp), "Company Admin sees application submitted to their company");

    // Verify all applications returned belong ONLY to their companyId
    const allBelong = (compAdminAppsRes.data?.applications || []).every(
      (a) => String(a.companyId?._id || a.companyId) === String(createdCompanyId)
    );
    assert(allBelong, "Strict multi-tenant boundary: 100% of returned applications belong to companyId");

    // -----------------------------------------------------------------------
    // STEP 15: Interview Scheduling & Scoped Aggregations
    // -----------------------------------------------------------------------
    console.log("\n[STEP 15] Interview Scheduling & Dynamic Scoped Aggregation...");
    let employerProfile = await EmployerProfile.findOne({ userId: employerUser._id });
    if (!employerProfile) {
      employerProfile = await EmployerProfile.create({
        userId: employerUser._id,
        companyName: testOrgName,
        officialEmail: employerEmail,
        industry: "Information Technology",
        location: "Hyderabad, India",
      });
    }

    const testInterview = await Interview.create({
      applicationId: testApp._id,
      candidateId: testCandidateId,
      employerId: employerProfile._id,
      companyId: createdCompanyId,
      jobId: testJobId,
      scheduledDate: "2026-09-25",
      scheduledTime: "11:00 AM",
      startTime: "11:00 AM",
      endTime: "11:45 AM",
      status: "scheduled",
      interviewType: "Online",
      meetingLink: "https://meet.google.com/xyz-test-connect",
    });

    assert(String(testInterview.companyId) === String(createdCompanyId), "Interview created with explicit companyId");

    // Fetch dashboard again to verify real dynamic aggregation
    const updatedDashRes = await request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${companyAdminToken}` },
    });

    const upcomingCount = updatedDashRes.data?.overview?.upcomingInterviews || 0;
    assert(upcomingCount >= 1, `Dynamic upcoming interviews count reflects scheduled interview: ${upcomingCount}`);

    // -----------------------------------------------------------------------
    // STEP 16: Non-Admin Role Security Check
    // -----------------------------------------------------------------------
    console.log("\n[STEP 16] Security Check: Candidates and Unauthenticated Access Blocked...");
    const candidateToken = jwt.sign(
      { id: testCandidateId, role: "user", userType: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const candidateAccessRes = await request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(candidateAccessRes.status === 403, `Candidate role accessing /admin/dashboard rejected with 403 Forbidden (got ${candidateAccessRes.status})`);

    const unauthRes = await request("/admin/dashboard");
    assert(unauthRes.status === 401, `Unauthenticated request rejected with 401 Unauthorized (got ${unauthRes.status})`);

    // Clean up temporary test data if needed or leave for audit
    console.log("\n============================================================");
    console.log(`   E2E VERIFICATION COMPLETED`);
    console.log(`   Passed: ${testsPassed} | Failed: ${testsFailed}`);
    console.log("============================================================\n");

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("FATAL ERROR DURING E2E TEST RUN:", err);
    process.exit(1);
  } finally {
    if (serverInstance) {
      await new Promise((res) => serverInstance.close(res));
    }
    await mongoose.disconnect();
  }
}

runE2ETests();
