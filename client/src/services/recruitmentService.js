import api from "../api/api";

// Applications
export const getEmployerApplications = async (params = {}) => {
  const res = await api.get("/applications/employer/list", { params });
  return res.data;
};

export const updateApplicationStage = async (id, status, notes = "") => {
  const res = await api.patch(`/applications/${id}/stage`, { status, notes });
  return res.data;
};

export const updateApplicationStatus = async (id, status) => {
  const res = await api.patch(`/applications/${id}/status`, { status });
  return res.data;
};

export const addApplicationNote = async (id, note) => {
  const res = await api.post(`/applications/${id}/notes`, { note });
  return res.data;
};

export const rateApplication = async (id, rating) => {
  const res = await api.patch(`/applications/${id}/rating`, { rating });
  return res.data;
};

// Assessments
export const getAssessments = async (params = {}) => {
  const res = await api.get("/assessments", { params });
  return res.data;
};

export const createAssessment = async (data) => {
  const res = await api.post("/assessments", data);
  return res.data;
};

export const getAssessmentResults = async (id, params = {}) => {
  const res = await api.get(`/assessments/${id}/results`, { params: { limit: 100, ...params } });
  return res.data;
};

export const getCandidateAssessments = async () => {
  const res = await api.get("/assessments/candidate/list");
  return res.data;
};

export const startCandidateAssessment = async (id) => {
  const res = await api.post(`/assessments/${id}/start`);
  return res.data;
};

export const submitCandidateAssessment = async (id, data) => {
  const res = await api.post(`/assessments/${id}/submit`, data);
  return res.data;
};

export const reviewAssessmentSubmission = async (submissionId, data) => {
  const res = await api.patch(`/assessments/submissions/${submissionId}/review`, data);
  return res.data;
};

export const deleteAssessment = async (id) => {
  const res = await api.delete(`/assessments/${id}`);
  return res.data;
};

export const updateAssessment = async (id, data) => {
  const res = await api.put(`/assessments/${id}`, data);
  return res.data;
};

export const scheduleAssessmentRound = async (id, data) => {
  const res = await api.patch(`/assessments/${id}/schedule`, data);
  return res.data;
};

export const getResultsByJob = async (jobId, params = {}) => {
  const res = await api.get(`/assessments/job/${jobId}/results`, { params });
  return res.data;
};

// Interviews
export const getInterviews = async (params = {}) => {
  const res = await api.get("/interviews", { params });
  return res.data;
};

export const getInterviewStats = async () => {
  const res = await api.get("/interviews/statistics");
  return res.data;
};

export const getEligibleCandidates = async () => {
  const res = await api.get("/interviews/eligible-candidates");
  return res.data;
};

export const getInterviewAvailability = async (params = {}) => {
  const res = await api.get("/interviews/availability", { params });
  return res.data;
};

export const getInterviewById = async (id) => {
  const res = await api.get(`/interviews/${id}`);
  return res.data;
};

export const getCandidateInterviewHistory = async (candidateId) => {
  const res = await api.get(`/interviews/candidate/${candidateId}`);
  return res.data;
};

export const scheduleInterview = async (data) => {
  const res = await api.post("/interviews", data);
  return res.data;
};

export const submitInterviewFeedback = async (id, data) => {
  const res = await api.post(`/interviews/${id}/scorecard`, data);
  return res.data;
};

export const submitScorecard = async (id, data) => {
  const res = await api.post(`/interviews/${id}/scorecard`, data);
  return res.data;
};

export const rescheduleInterview = async (id, data) => {
  const res = await api.put(`/interviews/${id}/reschedule`, data);
  return res.data;
};

export const cancelInterview = async (id, data = {}) => {
  const res = await api.put(`/interviews/${id}/cancel`, data);
  return res.data;
};

export const deleteInterview = async (id) => {
  const res = await api.delete(`/interviews/${id}`);
  return res.data;
};

export const completeInterview = async (id) => {
  const res = await api.put(`/interviews/${id}/complete`);
  return res.data;
};

export const startAiInterview = async (id, consentAccepted = true) => {
  const res = await api.post(`/interviews/${id}/ai/start`, { consentAccepted });
  return res.data;
};

export const saveAiInterviewAnswer = async (id, questionId, answer) => {
  const res = await api.post(`/interviews/${id}/ai/answer`, { questionId, answer });
  return res.data;
};

export const completeAiInterview = async (id) => {
  const res = await api.post(`/interviews/${id}/ai/complete`);
  return res.data;
};

export const updateInterviewResult = async (id, data) => {
  const res = await api.put(`/interviews/${id}/result`, data);
  return res.data;
};

// Notifications
export const getNotifications = async (params = {}) => {
  const res = await api.get("/notifications", { params });
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch("/notifications/read-all");
  return res.data;
};

export const updateInterviewStatus = async (id, data) => {
  const res = await api.patch(`/interviews/${id}/status`, data);
  return res.data;
};

// Offers
export const getOffers = async (params = {}) => {
  const res = await api.get("/offers", { params });
  return res.data;
};

export const getOfferStats = async () => {
  const res = await api.get("/offers/stats");
  return res.data;
};

export const getOfferById = async (id) => {
  const res = await api.get(`/offers/${id}`);
  return res.data;
};

export const createOffer = async (data) => {
  const res = await api.post("/offers", data);
  return res.data;
};

export const updateOffer = async (id, data) => {
  const res = await api.put(`/offers/${id}`, data);
  return res.data;
};

export const submitOfferForApproval = async (id, data = {}) => {
  const res = await api.patch(`/offers/${id}/submit-approval`, data);
  return res.data;
};

export const approveOffer = async (id, data = {}) => {
  const res = await api.patch(`/offers/${id}/approve`, data);
  return res.data;
};

export const sendOffer = async (id, data = {}) => {
  const res = await api.patch(`/offers/${id}/send`, data);
  return res.data;
};

export const withdrawOffer = async (id, data = {}) => {
  const res = await api.patch(`/offers/${id}/withdraw`, data);
  return res.data;
};

export const respondToOffer = async (id, data) => {
  const res = await api.patch(`/offers/${id}/respond`, data);
  return res.data;
};

// Analytics
export const getEmployerAnalytics = async () => {
  const res = await api.get("/employer/analytics");
  return res.data;
};

export default {
  getEmployerApplications,
  updateAssessment,
  scheduleAssessmentRound,
  getResultsByJob,
  updateApplicationStage,
  updateApplicationStatus,
  addApplicationNote,
  rateApplication,
  getAssessments,
  getCandidateAssessments,
  startCandidateAssessment,
  submitCandidateAssessment,
  reviewAssessmentSubmission,
  createAssessment,
  getAssessmentResults,
  deleteAssessment,
  getInterviews,
  getInterviewStats,
  getEligibleCandidates,
  getInterviewAvailability,
  getInterviewById,
  getCandidateInterviewHistory,
  scheduleInterview,
  submitInterviewFeedback,
  submitScorecard,
  rescheduleInterview,
  cancelInterview,
  deleteInterview,
  completeInterview,
  startAiInterview,
  saveAiInterviewAnswer,
  completeAiInterview,
  updateInterviewResult,
  updateInterviewStatus,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getOffers,
  getOfferStats,
  getOfferById,
  createOffer,
  updateOffer,
  submitOfferForApproval,
  approveOffer,
  sendOffer,
  withdrawOffer,
  respondToOffer,
  getEmployerAnalytics,
};
