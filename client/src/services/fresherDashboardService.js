import api from "../api/api.jsx";

// Get complete fresher dashboard data
export const getFresherDashboardData = async () => {
  const response = await api.get("/fresher/dashboard");
  return response.data;
};

// Banner: name, preferences, profile strength, counts
export const getDashboardSummary = async () => {
  const response = await api.get("/dashboard/summary");
  return response.data;
};

// "Jobs for you", scored against the fresher's preferences. type: internship | full-time | remote
export const getRecommendedJobs = async ({ page = 1, limit = 10, type } = {}) => {
  const response = await api.get("/jobs/recommended", {
    params: { page, limit, ...(type ? { type } : {}) },
  });
  return response.data;
};

// Save { targetRoles, techStack, jobType, location }; responds with the updated profile
export const updateFresherPreferences = async (preferences) => {
  const response = await api.put("/fresher/profile", { preferences });
  return response.data;
};

export default {
  getFresherDashboardData,
  getDashboardSummary,
  getRecommendedJobs,
  updateFresherPreferences,
};
