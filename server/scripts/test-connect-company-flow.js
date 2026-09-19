require("dotenv").config();
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");
const Company = require("../models/Company");
const OrganizationRequest = require("../models/OrganizationRequest");
const EmployerProfile = require("../models/EmployerProfile");

const TEST_PORT = 5059;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function runTest() {
  console.log("\n========================================================");
  console.log("   TESTING CONNECT COMPANY WITH CAREERCONNECT FLOW");
  console.log("========================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    await connectDB();

    const testTimestamp = Date.now();
    const testEmployeeEmail = `employee_${testTimestamp}@acmeworks.com`;
    const testCompanyEmail = `contact_${testTimestamp}@acmeworks.com`;
    const jwtSecret = process.env.JWT_SECRET || "default_dev_secret_key_12345";

    // 1. Create a test employer user with profile
    const employerUser = await User.create({
      fullName: "Jordan Lee",
      email: testEmployeeEmail,
      password: "Password123!",
      role: "employer",
      isEmailVerified: true,
      companyId: null,
      companyRole: null,
    });

    await EmployerProfile.create({
      userId: employerUser._id,
      companyName: "Acme Corp Systems",
      companyWebsite: "https://acmesystems.example",
      designation: "Lead Technical Recruiter",
      industry: "Software & Technology",
      companySize: "51-200",
    });

    const employerToken = jwt.sign(
      { id: employerUser._id, role: employerUser.role, email: employerUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 2. Test pre-fill retrieval (GET /api/employer/organization-status)
    const prefillRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    assert(prefillRes.status === 200, "Organization status returns HTTP 200");
    assert(prefillRes.data.status === "NOT_REQUESTED", "Initial status is NOT_REQUESTED");
    assert(
      prefillRes.data.prefill?.companyName === "Acme Corp Systems",
      `Pre-fills companyName correctly (${prefillRes.data.prefill?.companyName})`
    );
    assert(
      prefillRes.data.prefill?.requestingEmployeeName === "Jordan Lee",
      `Pre-fills requestingEmployeeName correctly (${prefillRes.data.prefill?.requestingEmployeeName})`
    );
    assert(
      prefillRes.data.prefill?.employeeDesignation === "Lead Technical Recruiter",
      `Pre-fills employeeDesignation correctly (${prefillRes.data.prefill?.employeeDesignation})`
    );

    // 3. Test validation: Missing required verification document
    const invalidPayload = {
      companyName: "Acme Corp Systems",
      officialCompanyEmail: testCompanyEmail,
      companyWebsite: "https://acmesystems.example",
      industry: "Software & Technology",
      companySize: "51-200",
      verificationDocument: "", // Missing
      requestingEmployeeName: "Jordan Lee",
      employeeDesignation: "Lead Technical Recruiter",
      officialEmployeeEmail: testEmployeeEmail,
    };

    const failRes = await request("/employer/request-company-approval", {
      method: "POST",
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify(invalidPayload),
    });

    assert(
      failRes.status === 400 && failRes.data.message.includes("Company Registration"),
      `Validation properly requires verification document (status: ${failRes.status})`
    );

    // 4. Test submission of strictly 9 fields (NO REASON)
    const validPayload = {
      companyName: `Acme Corp Systems ${testTimestamp}`,
      officialCompanyEmail: testCompanyEmail,
      companyWebsite: "https://acmesystems.example",
      industry: "Software & Technology",
      companySize: "51-200",
      verificationDocument: "https://res.cloudinary.com/demo/image/upload/v1/certificates/acme_reg.pdf",
      requestingEmployeeName: "Jordan Lee",
      employeeDesignation: "Lead Technical Recruiter",
      officialEmployeeEmail: testEmployeeEmail,
    };

    const submitRes = await request("/employer/request-company-approval", {
      method: "POST",
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify(validPayload),
    });

    assert(
      submitRes.status === 201 && submitRes.data.success === true,
      `Connection request successfully submitted with 9 fields and no reason`
    );
    assert(
      submitRes.data.request?.reason === undefined || submitRes.data.request?.reason === "",
      `Response does not enforce or require reason field`
    );

    // 5. Test duplicate prevention
    const duplicateRes = await request("/employer/request-company-approval", {
      method: "POST",
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify(validPayload),
    });

    assert(
      duplicateRes.status === 409,
      `Duplicate request correctly rejected with 409 Conflict (got ${duplicateRes.status})`
    );

    // 6. Test status update on employee dashboard
    const pendingStatusRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    assert(
      pendingStatusRes.status === 200 && pendingStatusRes.data.status === "PENDING",
      `Employee dashboard reports status as PENDING (got ${pendingStatusRes.data.status})`
    );
    assert(
      pendingStatusRes.data.organizationRequest?.industry === "Software & Technology",
      `Saved request retains industry (${pendingStatusRes.data.organizationRequest?.industry})`
    );
    assert(
      pendingStatusRes.data.organizationRequest?.companySize === "51-200",
      `Saved request retains companySize (${pendingStatusRes.data.organizationRequest?.companySize})`
    );
    assert(
      pendingStatusRes.data.organizationRequest?.verificationDocument?.includes("acme_reg.pdf"),
      `Saved request retains verificationDocument`
    );

    // 7. Super Admin workflow
    let superAdmin = await User.findOne({ role: "admin", adminLevel: "SUPER_ADMIN" });
    if (!superAdmin) {
      superAdmin = await User.create({
        fullName: "Super Admin",
        email: `super_${testTimestamp}@careerconnect.io`,
        password: "SuperSecretPassword123!",
        role: "admin",
        adminLevel: "SUPER_ADMIN",
        isEmailVerified: true,
      });
    }

    const superAdminToken = jwt.sign(
      { id: superAdmin._id, role: superAdmin.role, adminLevel: superAdmin.adminLevel, email: superAdmin.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const adminRequestsRes = await request("/admin/organization-requests", {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const targetRequest = (adminRequestsRes.data.requests || []).find(
      (r) => r.officialEmail === testCompanyEmail
    );

    assert(!!targetRequest, `Super Admin sees request in pending requests list`);

    // Super Admin reviews
    const reviewRes = await request(`/admin/organization-requests/${targetRequest._id}/review`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(reviewRes.status === 200, `Super Admin moved status to UNDER_REVIEW`);

    // Super Admin approves
    const approveRes = await request(`/admin/organization-requests/${targetRequest._id}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ autoInviteAdmin: false }),
    });

    assert(
      approveRes.status === 200 && approveRes.data.success === true,
      `Super Admin approved company connection request`
    );

    // 8. Verify Employee status is now APPROVED and user is linked with companyId
    const postApproveStatusRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    assert(
      postApproveStatusRes.data.hasCompany === true &&
      postApproveStatusRes.data.status === "APPROVED",
      `Employee status transitioned to APPROVED / hasCompany: true`
    );

    const refreshedUser = await User.findById(employerUser._id);
    assert(
      refreshedUser.companyId && refreshedUser.companyId.toString() === approveRes.data.company._id.toString(),
      `Requesting user successfully linked to created Company ID (${refreshedUser.companyId})`
    );

    // Cleanup
    await User.deleteMany({ email: { $in: [testEmployeeEmail] } });
    await EmployerProfile.deleteMany({ userId: employerUser._id });
    await OrganizationRequest.deleteMany({ officialEmail: testCompanyEmail });
    if (approveRes.data.company?._id) {
      await Company.findByIdAndDelete(approveRes.data.company._id);
    }

    console.log(`\n========================================================`);
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================\n`);
  } catch (err) {
    console.error("Test error:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTest();
