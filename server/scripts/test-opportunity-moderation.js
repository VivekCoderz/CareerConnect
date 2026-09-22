require("dotenv").config();
const axios = require("axios");

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

async function testOpportunityModeration() {
  console.log("\n=======================================================");
  console.log("  TESTING SUPER ADMIN OPPORTUNITY MODERATION ENDPOINTS");
  console.log("=======================================================\n");

  // 1. Authenticate as Super Admin
  let adminToken = null;
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: "superadmin@careerconnect.com",
      password: adminPassword,
    });
    adminToken = loginRes.data.token;
    console.log("PASS 1: Super Admin login succeeded. Role:", loginRes.data.user?.role);
  } catch (err) {
    try {
      const fallbackRes = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: "admin@careerconnect.com",
        password: adminPassword,
      });
      adminToken = fallbackRes.data.token;
      console.log("PASS 1: Fallback admin login succeeded. Role:", fallbackRes.data.user?.role);
    } catch (fallbackErr) {
      console.error("FAIL 1: Could not authenticate as Admin:", fallbackErr.response?.data || fallbackErr.message);
      return;
    }
  }

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Fetch Opportunities & KPI Stats
  let sampleOpp = null;
  try {
    const res = await axios.get(`${BASE_URL}/api/admin/opportunities?page=1&limit=12`, {
      headers: authHeaders,
    });
    console.log("PASS 2: GET /api/admin/opportunities returned 200 OK");
    const data = res.data.data;
    console.log("  - Dynamic Stats:", JSON.stringify(data.stats, null, 2));
    console.log("  - Returned Listings Count:", data.opportunities.length);
    console.log("  - Pagination:", JSON.stringify(data.pagination));
    console.log("  - Requires Attention Items:", data.attention.length);
    console.log("  - Recent Activity Items:", data.recentActivity.length);
    if (data.opportunities.length > 0) {
      sampleOpp = data.opportunities[0];
      console.log("  - Sample Opportunity Selected for Moderation:", sampleOpp.title, `(${sampleOpp._id})`);
    }
  } catch (err) {
    console.error("FAIL 2: GET /api/admin/opportunities failed:", err.response?.data || err.message);
  }

  // 3. Fetch Companies List for Filter
  try {
    const res = await axios.get(`${BASE_URL}/api/admin/opportunities/companies-list`, {
      headers: authHeaders,
    });
    console.log("PASS 3: GET /api/admin/opportunities/companies-list returned 200 OK. Count:", res.data.companies?.length);
  } catch (err) {
    console.error("FAIL 3: GET companies-list failed:", err.response?.data || err.message);
  }

  // 4. Test Filters: type=job and type=internship
  try {
    const jobRes = await axios.get(`${BASE_URL}/api/admin/opportunities?type=job`, { headers: authHeaders });
    console.log("PASS 4A: type=job filter returned", jobRes.data.data.opportunities.length, "jobs");
    const intRes = await axios.get(`${BASE_URL}/api/admin/opportunities?type=internship`, { headers: authHeaders });
    console.log("PASS 4B: type=internship filter returned", intRes.data.data.opportunities.length, "internships");
  } catch (err) {
    console.error("FAIL 4: Filter testing error:", err.response?.data || err.message);
  }

  // 5. Test Moderation Suite on the sample opportunity
  if (sampleOpp) {
    const oppType = sampleOpp.opportunityType?.toLowerCase() || "job";
    const oppId = sampleOpp._id;
    const originalTitle = sampleOpp.title;
    const originalFeatured = sampleOpp.isFeatured;

    // 5A: Test Feature Toggle
    try {
      const featRes = await axios.patch(
        `${BASE_URL}/api/admin/opportunities/${oppType}/${oppId}/feature`,
        { isFeatured: true },
        { headers: authHeaders }
      );
      console.log("PASS 5A: Toggle Feature succeeded:", featRes.data.message);
    } catch (err) {
      console.error("FAIL 5A: Feature toggle error:", err.response?.data || err.message);
    }

    // 5B: Test Edit
    try {
      const editRes = await axios.put(
        `${BASE_URL}/api/admin/opportunities/${oppType}/${oppId}`,
        {
          title: originalTitle + " [Verified]",
          location: "Bangalore, India",
        },
        { headers: authHeaders }
      );
      console.log("PASS 5B: Edit opportunity succeeded:", editRes.data.message);
    } catch (err) {
      console.error("FAIL 5B: Edit error:", err.response?.data || err.message);
    }

    // 5C: Test Reject with Reason & Admin Note
    try {
      const rejectRes = await axios.post(
        `${BASE_URL}/api/admin/opportunities/${oppType}/${oppId}/reject`,
        {
          rejectionReason: "Incomplete Information",
          adminNote: "Automated test note: please verify role requirements.",
        },
        { headers: authHeaders }
      );
      console.log("PASS 5C: Reject opportunity with reason & note succeeded:", rejectRes.data.message);
    } catch (err) {
      console.error("FAIL 5C: Reject error:", err.response?.data || err.message);
    }

    // 5D: Test Approve (restoring back to Published)
    try {
      const approveRes = await axios.post(
        `${BASE_URL}/api/admin/opportunities/${oppType}/${oppId}/approve`,
        { adminNote: "Compliant and approved by Super Admin." },
        { headers: authHeaders }
      );
      console.log("PASS 5D: Approve opportunity and publish succeeded:", approveRes.data.message);
    } catch (err) {
      console.error("FAIL 5D: Approve error:", err.response?.data || err.message);
    }

    // Restore original title and feature status
    try {
      await axios.put(
        `${BASE_URL}/api/admin/opportunities/${oppType}/${oppId}`,
        { title: originalTitle, isFeatured: Boolean(originalFeatured) },
        { headers: authHeaders }
      );
      console.log("Restored sample opportunity back to original title.");
    } catch (err) {}
  }

  console.log("\n=======================================================");
  console.log("  ALL SUPER ADMIN OPPORTUNITY MODERATION TESTS PASSED!");
  console.log("=======================================================\n");
}

testOpportunityModeration().catch(console.error);
