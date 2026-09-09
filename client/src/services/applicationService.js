import api from "../api/api";

/**
 * Apply to a job (Campus listing only)
 * @param {string} id - Job ID
 * @param {Object} data - { coverNote, resumeUrl }
 */
// export const applyToJob = async (id, data = {}) => {
//   const { data: resData } = await api.post(`/applications/job/${id}`, data);
//   return resData;
// };

/**
 * Apply to an internship (Campus listing only)
 * @param {string} id - Internship ID
 * @param {Object} data - { coverNote, resumeUrl }
 */
export const applyToInternship = async (id, data = {}) => {
  const { data: resData } = await api.post(`/applications/internship/${id}`, data);
  return resData;
};

/**
 * Apply to a job (Campus/Direct listing)
 * @param {string} id - Job ID
 * @param {Object} data - { coverNote, resumeUrl }
 */
export const applyToJob = async (id, data) => {
  const { data: resData } = await api.post(`/applications/job/${id}`, data);
  return resData;
};

/**
 * Get logged-in candidate's applications
 */
export const getMyApplications = async () => {
  const { data } = await api.get("/applications/me");
  return data;
};

/**
 * Get single application by ID
 */
export const getApplicationById = async (id) => {
  const { data } = await api.get(`/applications/${id}`);
  return data;
};

/**
 * Withdraw an application (Candidate)
 */
export const withdraw = async (id) => {
  const { data } = await api.patch(`/applications/${id}/withdraw`);
  return data;
};

/**
 * Get applications received by the employer (Employer only)
 * @param {Object} params - { status, opportunityType, internshipId, jobId }
 */
export const getEmployerApplications = async (params = {}) => {
  const { data } = await api.get("/applications/employer/list", { params });
  return data;
};

/**
 * Update application status (Employer only)
 */
export const updateStatus = async (id, status) => {
  const { data } = await api.patch(`/applications/${id}/status`, { status });
  return data;
};

/**
 * Update application stage (Employer only)
 */
export const updateStage = async (id, stage, notes = "") => {
  const { data } = await api.patch(`/applications/${id}/stage`, { stage, notes });
  return data;
};

export default {
  applyToJob,
  applyToInternship,
  getMyApplications,
  getApplicationById,
  withdraw,
  getEmployerApplications,
  updateStatus,
  updateStage,
};
