require("dotenv").config();
const axios = require("axios");

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

async function testAdmin() {
  console.log("=== TESTING ADMIN ENDPOINTS ===");

  // 1. Unauthenticated request to /api/admin/dashboard
  try {
    await axios.get(`${BASE_URL}/api/admin/dashboard`);
    console.error("FAIL: Unauthenticated request should have been rejected with 401");
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log("PASS: Unauthenticated request returned 401");
    } else {
      console.error("FAIL: Expected 401, got", err.response?.status, err.message);
    }
  }

  // 2. Log in as admin
  let adminToken = null;
  let adminCookie = null;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@careerconnect.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });
    console.log("PASS: Admin login successful. Role:", loginRes.data.user?.role);
    adminToken = loginRes.data.token;
    adminCookie = loginRes.headers["set-cookie"];
  } catch (err) {
    console.error("FAIL: Admin login error:", err.response?.data || err.message);
    return;
  }

  // 3. Fetch Admin Dashboard
  try {
    const dashRes = await axios.get(`${BASE_URL}/api/admin/dashboard?range=30d`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Cookie: adminCookie ? adminCookie.join("; ") : "",
      },
    });
    console.log("PASS: Admin dashboard returned 200 OK");
    console.log("Overview Data:", dashRes.data.data.overview);
    console.log("Users Breakdown:", dashRes.data.data.users);
    console.log("User Growth data points count:", dashRes.data.data.userGrowth.length);
    console.log("Application Funnel:", dashRes.data.data.applicationFunnel);
    console.log("Recent Activity items count:", dashRes.data.data.recentActivity.length);
  } catch (err) {
    console.error("FAIL: Admin dashboard fetch error:", err.response?.data || err.message);
  }

  // 4. Test Global Search
  try {
    const searchRes = await axios.get(`${BASE_URL}/api/admin/search?q=developer`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    console.log("PASS: Admin search returned 200 OK");
    console.log("Search results categories:", Object.keys(searchRes.data.results));
  } catch (err) {
    console.error("FAIL: Admin search error:", err.response?.data || err.message);
  }

  // 5. Test Non-Admin Forbidden Access (with student/candidate)
  try {
    const candidateLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "student_b_e2e@careerconnect.com",
      password: "Password123!",
    });
    const candidateToken = candidateLogin.data.token;
    try {
      await axios.get(`${BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${candidateToken}` },
      });
      console.error("FAIL: Candidate should NOT be able to access /api/admin/dashboard");
    } catch (candErr) {
      if (candErr.response && candErr.response.status === 403) {
        console.log("PASS: Candidate correctly received 403 Forbidden for Admin endpoint");
      } else {
        console.error("Expected 403 for candidate, got:", candErr.response?.status);
      }
    }
  } catch (e) {
    console.log("Note on candidate test:", e.response?.data?.message || e.message);
  }

  console.log("=== COMPLETED ADMIN BACKEND VERIFICATION ===");
}

testAdmin();
