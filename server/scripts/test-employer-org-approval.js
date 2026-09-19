require("dotenv").config();
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch (e) {}

const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const Company = require("../models/Company");
const OrganizationRequest = require("../models/OrganizationRequest");

const TEST_PORT = 5057;
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
  console.log("   TESTING EMPLOYER ORGANIZATION APPROVAL WORKFLOW");
  console.log("========================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB.");

    const testEmail = `orgtest_${Date.now()}@nexustech.io`;
    const jwtSecret = process.env.JWT_SECRET || "default_dev_secret_key_12345";

    // 1. Create a fresh test employer
    let employerUser = await User.create({
      fullName: "Alex Vance",
      email: testEmail,
      password: "Password123!",
      role: "employer",
      isEmailVerified: true,
      companyId: null,
      companyRole: null,
    });

    const employerToken = jwt.sign(
      { id: employerUser._id, role: employerUser.role, email: employerUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 2. Check initial organization status (should be NOT_REQUESTED)
    const initialStatusRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    assert(
      initialStatusRes.status === 200 && initialStatusRes.data.status === "NOT_REQUESTED",
      `Initial status is NOT_REQUESTED (got ${initialStatusRes.data.status})`
    );

    // 3. Submit request to Super Admin
    const approvalPayload = {
      organizationName: `Nexus Innovations ${Date.now()}`,
      organizationType: "COMPANY",
      officialEmail: testEmail,
      website: "https://nexusinnovations.tech",
      contactPerson: "Alex Vance",
      designation: "Head of Talent Acquisition",
      phone: "+91 99887 76655",
      address: "DLF Cyber City, Phase 2",
      city: "Gurugram",
      state: "Haryana",
      country: "India",
      description: "AI-powered enterprise workflow automation company.",
    };

    const submitRes = await request("/employer/request-company-approval", {
      method: "POST",
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify(approvalPayload),
    });

    assert(
      submitRes.status === 201 && submitRes.data.success === true,
      `Company approval submitted successfully (message: ${submitRes.data.message})`
    );

    // 4. Verify organization status is now PENDING
    const pendingStatusRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    assert(
      pendingStatusRes.status === 200 && pendingStatusRes.data.status === "PENDING",
      `Status is now PENDING (got ${pendingStatusRes.data.status})`
    );
    assert(
      pendingStatusRes.data.organizationRequest?.organizationName === approvalPayload.organizationName,
      `Submitted organization name matches (${pendingStatusRes.data.organizationRequest?.organizationName})`
    );

    // 5. Super Admin checks pending organization requests
    let superAdmin = await User.findOne({ role: "admin", adminLevel: "SUPER_ADMIN" });
    if (!superAdmin) {
      superAdmin = await User.create({
        fullName: "Master Super Admin",
        email: `super_${Date.now()}@careerconnect.io`,
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

    const foundInAdminList = (adminRequestsRes.data.requests || []).find(
      (r) => r.officialEmail === testEmail
    );

    assert(
      !!foundInAdminList,
      `Employer request is visible in Super Admin organization requests list (ID: ${foundInAdminList?._id})`
    );

    // 6. Super Admin approves the request
    const approveRes = await request(`/admin/organization-requests/${foundInAdminList._id}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ autoInviteAdmin: false }),
    });

    assert(
      approveRes.status === 200 && approveRes.data.success === true,
      `Super Admin approved the organization request (status: ${approveRes.status})`
    );

    // 7. Employer verifies status is now APPROVED / active company
    const approvedStatusRes = await request("/employer/organization-status", {
      headers: { Authorization: `Bearer ${employerToken}` },
    });

    console.log("approvedStatusRes.data:", JSON.stringify(approvedStatusRes.data));

    assert(
      approvedStatusRes.status === 200 &&
        (approvedStatusRes.data.status === "APPROVED" || approvedStatusRes.data.hasCompany === true),
      `Employer organization status is now APPROVED / hasCompany: true`
    );

    // Cleanup test data
    await User.deleteMany({ email: { $in: [testEmail] } });
    await OrganizationRequest.deleteMany({ officialEmail: testEmail });
    if (approveRes.data.company?._id) {
      await Company.findByIdAndDelete(approveRes.data.company._id);
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
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
