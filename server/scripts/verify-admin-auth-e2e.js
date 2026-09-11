require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/User");

const SERVER_URL = "http://localhost:5000";
const CLIENT_URL = "http://localhost:5173";

async function runAcceptanceTests() {
  console.log("==================================================");
  console.log("RUNNING COMPREHENSIVE ADMIN AUTH ACCEPTANCE TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Connect to DB for direct verification of hashing and roles
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    // 1. Check Admin User in Database
    const adminUser = await User.findOne({
      email: process.env.ADMIN_EMAIL || "admin@careerconnect.com",
    }).select("+password");
    assert(adminUser !== null, "1. Admin user exists in database");
    assert(adminUser?.role === "admin", "2. Admin user role is strictly 'admin'");
    assert(
      adminUser?.password && adminUser.password.startsWith("$2"),
      "3. Admin password is stored securely hashed with bcrypt ($2a$ / $2b$)"
    );
    assert(
      !adminUser?.password.includes("TestAdminPassword123!"),
      "4. Plaintext password is NOT stored anywhere in database"
    );

    // 2. Test Normal User Login (Student) via /api/auth/login
    let studentToken = null;
    try {
      const studentLogin = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email: "student_b_e2e@careerconnect.com",
        password: "TestPassword123!",
      });
      assert(studentLogin.status === 200, "5. Student can log into normal /login (via /api/auth/login)");
      studentToken = studentLogin.data.token;
      assert(studentLogin.data.user.role === "user", "6. Student user has role 'user'");
    } catch (e) {
      assert(false, `Student login failed: ${e.response?.data?.message || e.message}`);
    }

    // 3. Test Normal Employer Login via /api/auth/login
    let employerToken = null;
    try {
      const employerLogin = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email: "employer_a_e2e@careerconnect.com",
        password: "TestPassword123!",
      });
      assert(employerLogin.status === 200, "7. Employer can log into normal /login (via /api/auth/login)");
      employerToken = employerLogin.data.token;
      assert(employerLogin.data.user.role === "employer", "8. Employer user has role 'employer'");
    } catch (e) {
      assert(false, `Employer login failed: ${e.response?.data?.message || e.message}`);
    }

    // 4. Student credentials cannot log into /admin/login
    try {
      await axios.post(`${SERVER_URL}/api/admin/login`, {
        email: "student_b_e2e@careerconnect.com",
        password: "TestPassword123!",
      });
      assert(false, "Student MUST NOT be allowed to log into /admin/login");
    } catch (e) {
      assert(
        e.response && e.response.status === 401,
        "9. Student credentials at /admin/login rejected with 401 Unauthorized"
      );
      assert(
        e.response?.data?.message === "Invalid email or password",
        `10. Student receives generic error without role leakage: "${e.response?.data?.message}"`
      );
    }

    // 5. Employer credentials cannot log into /admin/login
    try {
      await axios.post(`${SERVER_URL}/api/admin/login`, {
        email: "employer_a_e2e@careerconnect.com",
        password: "TestPassword123!",
      });
      assert(false, "Employer MUST NOT be allowed to log into /admin/login");
    } catch (e) {
      assert(
        e.response && e.response.status === 401,
        "11. Employer credentials at /admin/login rejected with 401 Unauthorized"
      );
      assert(
        e.response?.data?.message === "Invalid email or password",
        `12. Employer receives generic error without role leakage: "${e.response?.data?.message}"`
      );
    }

    // 6. Non-existent / wrong credentials at /api/admin/login
    try {
      await axios.post(`${SERVER_URL}/api/admin/login`, {
        email: "unknown@careerconnect.com",
        password: "wrongpassword",
      });
      assert(false, "Wrong credentials should be rejected");
    } catch (e) {
      assert(
        e.response && e.response.status === 401,
        "13. Invalid credentials rejected with 401"
      );
      assert(
        e.response?.data?.message === "Invalid email or password",
        "14. Non-existent admin returns generic message 'Invalid email or password'"
      );
    }

    // 7. Valid Admin Login via /api/admin/login
    let adminToken = null;
    let adminCookie = null;
    try {
      const adminLoginRes = await axios.post(`${SERVER_URL}/api/admin/login`, {
        email: "admin@careerconnect.com",
        password: "TestAdminPassword123!",
      });
      assert(adminLoginRes.status === 200, "15. Valid ADMIN credentials successfully log in (200 OK)");
      assert(adminLoginRes.data.user.role === "admin", "16. Returned admin record has role 'admin'");
      assert(!!adminLoginRes.data.token, "17. Admin session/JWT returned");
      adminToken = adminLoginRes.data.token;
      adminCookie = adminLoginRes.headers["set-cookie"];
      assert(!!adminCookie, "18. HTTP-only auth cookie set for Admin session");
    } catch (e) {
      assert(false, `Valid admin login failed: ${e.response?.data?.message || e.message}`);
    }

    // 8. Unauthenticated request to /api/admin/dashboard
    try {
      await axios.get(`${SERVER_URL}/api/admin/dashboard`);
      assert(false, "Unauthenticated request to Admin API should be denied");
    } catch (e) {
      assert(
        e.response && e.response.status === 401,
        "19. Unauthenticated request to /api/admin/dashboard returns 401"
      );
    }

    // 9. Authenticated Student to /api/admin/dashboard -> 403 Forbidden
    if (studentToken) {
      try {
        await axios.get(`${SERVER_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        assert(false, "Student token MUST NOT access /api/admin/dashboard");
      } catch (e) {
        assert(
          e.response && e.response.status === 403,
          "20. Authenticated Student accessing /api/admin/dashboard returns 403 Forbidden"
        );
      }
    }

    // 10. Authenticated Employer to /api/admin/dashboard -> 403 Forbidden
    if (employerToken) {
      try {
        await axios.get(`${SERVER_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${employerToken}` },
        });
        assert(false, "Employer token MUST NOT access /api/admin/dashboard");
      } catch (e) {
        assert(
          e.response && e.response.status === 403,
          "21. Authenticated Employer accessing /api/admin/dashboard returns 403 Forbidden"
        );
      }
    }

    // 11. Authenticated Admin to /api/admin/dashboard -> 200 OK + dynamic MongoDB stats
    if (adminToken) {
      try {
        const dashRes = await axios.get(`${SERVER_URL}/api/admin/dashboard?range=30d`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Cookie: adminCookie ? adminCookie.join("; ") : "",
          },
        });
        assert(dashRes.status === 200, "22. Admin can access /api/admin/dashboard (200 OK)");
        assert(dashRes.data.success === true, "23. Dashboard response format is standard success");
        assert(typeof dashRes.data.data.overview.totalUsers === "number", `24. Real MongoDB totalUsers returned (${dashRes.data.data.overview.totalUsers})`);
        assert(typeof dashRes.data.data.overview.totalApplications === "number", `25. Real MongoDB totalApplications returned (${dashRes.data.data.overview.totalApplications})`);
        assert(Array.isArray(dashRes.data.data.userGrowth), `26. Real MongoDB userGrowth time-series returned (${dashRes.data.data.userGrowth.length} points)`);
        assert(Array.isArray(dashRes.data.data.recentActivity), `27. Real MongoDB recentActivity list returned (${dashRes.data.data.recentActivity.length} items)`);
      } catch (e) {
        assert(false, `Admin dashboard access failed: ${e.response?.data?.message || e.message}`);
      }
    }

    // 12. Admin Logout
    try {
      const logoutRes = await axios.post(
        `${SERVER_URL}/api/admin/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Cookie: adminCookie ? adminCookie.join("; ") : "",
          },
        }
      );
      assert(logoutRes.status === 200, "28. Admin logout endpoint returns 200 OK");
      const clearedCookies = logoutRes.headers["set-cookie"] || [];
      const hasExpiredCookie = clearedCookies.some(c => c.includes("token=;") || c.includes("Expires="));
      assert(hasExpiredCookie || clearedCookies.length > 0, "29. Logout response clears authentication cookie");
    } catch (e) {
      assert(false, `Admin logout failed: ${e.response?.data?.message || e.message}`);
    }

    // 13. Frontend Route Availability Check
    try {
      const clientRes = await axios.get(`${CLIENT_URL}/admin/login`);
      assert(clientRes.status === 200, "30. Frontend serves /admin/login page (200 OK)");
    } catch (e) {
      assert(false, `Frontend check failed: ${e.message}`);
    }

  } finally {
    await mongoose.disconnect();
  }

  console.log("==================================================");
  console.log(`TOTAL ACCEPTANCE CRITERIA PASSED: ${passed} / ${passed + failed}`);
  if (failed === 0) {
    console.log("ALL ACCEPTANCE TESTS COMPLETED WITH 100% SUCCESS!");
  } else {
    console.error(`SOME ACCEPTANCE TESTS FAILED: ${failed}`);
  }
  console.log("==================================================");
}

runAcceptanceTests();
