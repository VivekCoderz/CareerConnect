// client/src/services/jobVisibilityService.js
import api from "./api";

/**
 * Creates a new job with visibility and eligibility criteria (Employer)
 */
export const createJobWithVisibility = async (jobData) => {
  const response = await api.post("/job-visibility/employer/jobs", jobData);
  return response.data;
};

/**
 * Gets all employer jobs with their attached visibility status (Employer)
 */
export const getEmployerJobsWithVisibility = async () => {
  const response = await api.get("/job-visibility/employer/jobs");
  return response.data;
};

/**
 * Gets visibility configuration for a specific job (Employer)
 */
export const getJobVisibilityConfig = async (jobId) => {
  const response = await api.get(`/job-visibility/employer/jobs/${jobId}/config`);
  return response.data;
};

/**
 * Updates/configures visibility settings for an existing job (Employer)
 */
export const configureJobVisibility = async (jobId, configData) => {
  const response = await api.put(`/job-visibility/employer/jobs/${jobId}/config`, configData);
  return response.data;
};

/**
 * Fetches strictly authorized eligible jobs for the logged-in student (Student)
 */
export const getEligibleJobsForStudent = async (params = {}) => {
  const response = await api.get("/job-visibility/student/eligible-jobs", { params });
  return response.data;
};

/**
 * Fetches job details with backend security verification (Student)
 */
export const getEligibleJobDetails = async (jobId) => {
  const response = await api.get(`/job-visibility/student/jobs/${jobId}`);
  return response.data;
};

/**
 * Applies to an eligible job with backend eligibility validation (Student)
 */
export const applyToEligibleJob = async (jobId, applicationData) => {
  const response = await api.post(`/job-visibility/student/jobs/${jobId}/apply`, applicationData);
  return response.data;
};

export default {
  createJobWithVisibility,
  getEmployerJobsWithVisibility,
  getJobVisibilityConfig,
  configureJobVisibility,
  getEligibleJobsForStudent,
  getEligibleJobDetails,
  applyToEligibleJob,
};
