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

/**
 * Submits an application for a job or internship.
 */
export const applyOpportunity = async (applicationData) => {
  const response = await api.post("/student/apply", applicationData);
  return response.data;
};
