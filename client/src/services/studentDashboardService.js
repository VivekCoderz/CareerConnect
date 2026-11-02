import api from "../api/api";

/**
 * Fetches aggregated student dashboard data including
 * profile, readiness score, skill gap, recommendations, and applications.
 */
export const getStudentDashboardData = async () => {
  const response = await api.get("/student/dashboard");
  return response.data;
};

/**
 * Toggles save / bookmark for a job, internship, or course.
 */
export const saveOpportunity = async (opportunityData) => {
  const response = await api.post("/student/save", opportunityData);
  return response.data;
};

// Applications go through /api/applications/... (see utils/opportunityApply.js);
// the old POST /student/apply endpoint is retired.
