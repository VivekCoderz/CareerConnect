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

export const getMyAppliedIds = async () => {
  const { data } = await api.get("/applications/me/applied-ids");
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

/**
 * Move candidate to next stage (Employer only)
 */
export const moveNextStage = async (id, payload = {}) => {
  const { data } = await api.patch(`/applications/${id}/pipeline/move-next`, payload);
  return data;
};

/**
 * Final candidate selection (Employer only)
 */
export const selectCandidate = async (id, payload = {}) => {
  const { data } = await api.patch(`/applications/${id}/pipeline/select`, payload);
  return data;
};

/**
 * Reject candidate (Employer only)
 */
export const rejectCandidate = async (id, payload = {}) => {
  const { data } = await api.patch(`/applications/${id}/pipeline/reject`, payload);
  return data;
};

/**
 * Mark stage failed (Employer only)
 */
export const markStageFailed = async (id, payload = {}) => {
  const { data } = await api.patch(`/applications/${id}/pipeline/mark-failed`, payload);
  return data;
};

/**
 * Update specific application round (Employer only)
 */
export const updateRound = async (id, payload = {}) => {
  const { data } = await api.patch(`/applications/${id}/pipeline/round`, payload);
  return data;
};

/**
 * Add note to application (Employer only)
 */
export const addNote = async (id, text) => {
  const { data } = await api.post(`/applications/${id}/notes`, { text });
  return data;
};

/**
 * Download Job Applicants PDF (with rounds details)
 */
export const downloadJobApplicantsPdf = async (jobId, stage = "All") => {
  const response = await api.get(`/applications/job/${jobId}/export-pdf`, {
    params: stage && stage !== "All" ? { stage } : {},
    responseType: "blob",
  });
  return response.data;
};

/**
 * Helper to trigger browser download of a PDF blob
 */
export const triggerPdfDownload = (blobData, defaultFilename = "Applicants_Report.pdf") => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  applyToJob,
  applyToInternship,
  getMyApplications,
  getMyAppliedIds,
  getApplicationById,
  withdraw,
  getEmployerApplications,
  updateStatus,
  updateStage,
  moveNextStage,
  selectCandidate,
  rejectCandidate,
  markStageFailed,
  updateRound,
  addNote,
  downloadJobApplicantsPdf,
  triggerPdfDownload,
};
