import api from "../api/api";

/**
 * Career Recommendations Service for Freshers
 * Communicates with /api/recommendations backend engine
 */
export const getRecommendationsOverview = async () => {
  const response = await api.get("/recommendations");
  return response.data;
};

export const getRecommendedJobs = async (params = {}) => {
  const response = await api.get("/recommendations/jobs", { params });
  return response.data;
};

export const getRecommendedInternships = async () => {
  const response = await api.get("/recommendations/internships");
  return response.data;
};

export const getSkillGapAnalysis = async () => {
  const response = await api.get("/recommendations/skills");
  return response.data;
};

export const getRecommendedCourses = async () => {
  const response = await api.get("/recommendations/courses");
  return response.data;
};

export const getRecommendedProjects = async () => {
  const response = await api.get("/recommendations/projects");
  return response.data;
};

export const getCareerPaths = async () => {
  const response = await api.get("/recommendations/career-paths");
  return response.data;
};

export const getActionPlan = async () => {
  const response = await api.get("/recommendations/action-plan");
  return response.data;
};

export default {
  getRecommendationsOverview,
  getRecommendedJobs,
  getRecommendedInternships,
  getSkillGapAnalysis,
  getRecommendedCourses,
  getRecommendedProjects,
  getCareerPaths,
  getActionPlan,
};
