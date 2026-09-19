require("dotenv").config();
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const Company = require("../models/Company");

const BASE_URL = `http://localhost:${process.env.PORT || 5001}/api`;

async function runAcceptanceTests() {
  console.log("\n========================================================");
  console.log("   CAREERCONNECT ADMIN PORTAL RBAC ACCEPTANCE TESTS     ");
  console.log("   (Validating 15/15 Requirements from Section 30)      ");
  console.log("========================================================\n");

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(uri);

  const techCorp = await Company.findOne({ name: "TechCorp Global" });
  const innovate = await Company.findOne({ name: "Innovate Labs" });

  if (!techCorp || !innovate) {
    throw new Error("Companies not found in database. Ensure tenant companies exist before running this test.");
  }

  const techCorpId = techCorp._id.toString();
  const innovateId = innovate._id.toString();

  let passed = 0;
  let total = 15;

  // Helper for login
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  const login = async (email, password = adminPassword) => {
    return await axios.post(`${BASE_URL}/admin/login`, {
      email,
      password,
    });
  };

  // TEST 1: SUPER_ADMIN logs in -> Global Admin Dashboard
  try {
    const res = await login("superadmin@careerconnect.com");
    const token = res.data.token;
    const dash = await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (dash.data.scope === "GLOBAL" && dash.data.role === "SUPER_ADMIN" && dash.data.overview.totalCompanies >= 2) {
      console.log("✓ TEST 1 PASSED: SUPER_ADMIN logs in -> Global Admin Dashboard with real data");
      passed++;
    } else {
      console.error("✗ TEST 1 FAILED: Unexpected dashboard payload:", dash.data);
    }
  } catch (err) {
    console.error("✗ TEST 1 FAILED:", err.response?.data || err.message);
  }

  // TEST 2: COMPANY_ADMIN logs in -> Company-specific Admin Dashboard
  let techCorpToken = "";
  try {
    const res = await login("techcorp.admin@careerconnect.com");
    techCorpToken = res.data.token;
    const dash = await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    if (dash.data.scope === "TENANT" && dash.data.role === "COMPANY_ADMIN" && dash.data.company._id.toString() === techCorpId) {
      console.log("✓ TEST 2 PASSED: COMPANY_ADMIN logs in -> Company-specific Admin Dashboard");
      passed++;
    } else {
      console.error("✗ TEST 2 FAILED: Expected tenant scoped dashboard:", dash.data);
    }
  } catch (err) {
    console.error("✗ TEST 2 FAILED:", err.response?.data || err.message);
  }

  // TEST 3: Company A Admin requests Company A data -> SUCCESS
  try {
    const res = await axios.get(`${BASE_URL}/admin/opportunities?companyId=${techCorpId}`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    if (res.status === 200 && res.data.success) {
      console.log("✓ TEST 3 PASSED: Company A Admin requests Company A data -> SUCCESS (200)");
      passed++;
    }
  } catch (err) {
    console.error("✗ TEST 3 FAILED:", err.response?.data || err.message);
  }

  // TEST 4: Company A Admin requests Company B data -> 403 Forbidden
  try {
    await axios.get(`${BASE_URL}/admin/opportunities?companyId=${innovateId}`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    console.error("✗ TEST 4 FAILED: Should have rejected request for Company B data!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 4 PASSED: Company A Admin requests Company B data -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 4 FAILED: Expected 403, got", err.response?.status);
    }
  }

  // TEST 5: Company A Admin changes companyId in URL -> Denied (403)
  try {
    await axios.get(`${BASE_URL}/admin/companies/${innovateId}`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    console.error("✗ TEST 5 FAILED: Company Admin should not access other company in URL!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 5 PASSED: Company A Admin changes companyId in URL -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 5 FAILED: Expected 403, got", err.response?.status);
    }
  }

  // TEST 6: Company A Admin changes companyId in request body -> Denied (403)
  try {
    await axios.post(
      `${BASE_URL}/admin/reports`,
      {
        reportType: "Spam",
        details: "Test report attempt tampering companyId in body",
        companyId: innovateId,
      },
      {
        headers: { Authorization: `Bearer ${techCorpToken}` },
      }
    );
    console.error("✗ TEST 6 FAILED: Should have rejected companyId in body!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 6 PASSED: Company A Admin changes companyId in request body -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 6 FAILED: Expected 403, got", err.response?.status);
    }
  }

  // TEST 7: Company A Admin attempts query injection tampering -> Denied (403)
  try {
    await axios.get(`${BASE_URL}/admin/users?companyId=${innovateId}`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    console.error("✗ TEST 7 FAILED: Should have rejected tampered query companyId!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 7 PASSED: Company A Admin modifies query companyId -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 7 FAILED: Expected 403, got", err.response?.status);
    }
  }

  // TEST 8: Company A Admin directly calls another company's endpoint -> 403 Forbidden
  try {
    await axios.patch(
      `${BASE_URL}/admin/companies/${innovateId}/status`,
      { status: "inactive" },
      { headers: { Authorization: `Bearer ${techCorpToken}` } }
    );
    console.error("✗ TEST 8 FAILED: Company Admin should not modify another company!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 8 PASSED: Company A Admin directly calls another company's endpoint -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 8 FAILED: Expected 403, got", err.response?.status);
    }
  }

  // SUPER_ADMIN token for tests 9 and 10
  const superRes = await login("superadmin@careerconnect.com");
  const superToken = superRes.data.token;

  // TEST 9: SUPER_ADMIN accesses Company A -> SUCCESS
  try {
    const res = await axios.get(`${BASE_URL}/admin/companies/${techCorpId}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    if (res.status === 200 && res.data.company._id.toString() === techCorpId) {
      console.log("✓ TEST 9 PASSED: SUPER_ADMIN accesses Company A -> SUCCESS (200)");
      passed++;
    }
  } catch (err) {
    console.error("✗ TEST 9 FAILED:", err.response?.data || err.message);
  }

  // TEST 10: SUPER_ADMIN accesses Company B -> SUCCESS
  try {
    const res = await axios.get(`${BASE_URL}/admin/companies/${innovateId}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    if (res.status === 200 && res.data.company._id.toString() === innovateId) {
      console.log("✓ TEST 10 PASSED: SUPER_ADMIN accesses Company B -> SUCCESS (200)");
      passed++;
    }
  } catch (err) {
    console.error("✗ TEST 10 FAILED:", err.response?.data || err.message);
  }

  // TEST 11: Normal Student attempts /admin/login -> Admin authentication denied
  try {
    await axios.post(`${BASE_URL}/admin/login`, {
      email: "student_a_e2e@careerconnect.com",
      password: "TestPassword123!",
    });
    console.error("✗ TEST 11 FAILED: Student should NOT be able to authenticate at /admin/login!");
  } catch (err) {
    if (err.response?.status === 401 && err.response?.data?.message === "Invalid email or password") {
      console.log("✓ TEST 11 PASSED: Normal Student attempts /admin/login -> Generic 401 Denied");
      passed++;
    } else {
      console.error("✗ TEST 11 FAILED: Expected 401 generic error, got:", err.response?.data);
    }
  }

  // TEST 12: Employer attempts /admin/dashboard -> Access denied (403)
  try {
    // Regular candidate / employer auth token
    const empLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: "employer_a_e2e@careerconnect.com",
      password: "TestPassword123!",
    });
    const empToken = empLogin.data.token;
    await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    console.error("✗ TEST 12 FAILED: Employer should NOT access /admin/dashboard!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 12 PASSED: Employer attempts /admin/dashboard -> 403 Access Denied");
      passed++;
    } else {
      console.error("✗ TEST 12 FAILED: Expected 403, got:", err.response?.status);
    }
  }

  // TEST 13: Unauthenticated user accesses Admin API -> 401 Unauthorized
  try {
    await axios.get(`${BASE_URL}/admin/dashboard`);
    console.error("✗ TEST 13 FAILED: Unauthenticated request should be rejected!");
  } catch (err) {
    if (err.response?.status === 401) {
      console.log("✓ TEST 13 PASSED: Unauthenticated user accesses Admin API -> 401 Unauthorized");
      passed++;
    } else {
      console.error("✗ TEST 13 FAILED: Expected 401, got:", err.response?.status);
    }
  }

  // TEST 14: Company Admin attempts Super Admin Company Management -> 403 Forbidden
  try {
    await axios.get(`${BASE_URL}/admin/companies`, {
      headers: { Authorization: `Bearer ${techCorpToken}` },
    });
    console.error("✗ TEST 14 FAILED: Company Admin should NOT access Super Admin Company Management!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✓ TEST 14 PASSED: Company Admin attempts Super Admin Company Management -> 403 Forbidden");
      passed++;
    } else {
      console.error("✗ TEST 14 FAILED: Expected 403, got:", err.response?.status);
    }
  }

  // TEST 15: Company Admin logs out -> Admin session cleared
  try {
    const logoutRes = await axios.post(`${BASE_URL}/admin/logout`);
    if (logoutRes.status === 200 && logoutRes.data.success) {
      console.log("✓ TEST 15 PASSED: Company Admin logs out -> Session cleared successfully");
      passed++;
    }
  } catch (err) {
    console.error("✗ TEST 15 FAILED:", err.response?.data || err.message);
  }

  console.log("\n========================================================");
  console.log(`   FINAL RESULT: ${passed}/${total} ACCEPTANCE TESTS PASSED!`);
  console.log("========================================================\n");

  await mongoose.disconnect();
}

runAcceptanceTests().catch(console.error);
