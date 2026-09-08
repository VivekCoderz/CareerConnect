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
export const getAssessments = async () => {
  const res = await api.get("/assessments");
  return res.data;
};

export const createAssessment = async (data) => {
  const res = await api.post("/assessments", data);
  return res.data;
};

export const getAssessmentResults = async (id) => {
  const res = await api.get(`/assessments/${id}/results`);
  return res.data;
};

export const deleteAssessment = async (id) => {
  const res = await api.delete(`/assessments/${id}`);
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

export const cancelInterview = async (id, data) => {
  const res = await api.put(`/interviews/${id}/cancel`, data);
  return res.data;
};

export const completeInterview = async (id) => {
  const res = await api.put(`/interviews/${id}/complete`);
  return res.data;
};

export const updateInterviewResult = async (id, data) => {
  const res = await api.put(`/interviews/${id}/result`, data);
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
  updateApplicationStage,
  updateApplicationStatus,
  addApplicationNote,
  rateApplication,
  getAssessments,
  createAssessment,
  getAssessmentResults,
  deleteAssessment,
  getInterviews,
  getInterviewStats,
  getEligibleCandidates,
  getInterviewById,
  getCandidateInterviewHistory,
  scheduleInterview,
  submitInterviewFeedback,
  submitScorecard,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  updateInterviewResult,
  updateInterviewStatus,
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


