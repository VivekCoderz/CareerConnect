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

export const scheduleInterview = async (data) => {
  const res = await api.post("/interviews", data);
  return res.data;
};

export const submitInterviewFeedback = async (id, data) => {
  const res = await api.patch(`/interviews/${id}/feedback`, data);
  return res.data;
};

export const updateInterviewStatus = async (id, data) => {
  const res = await api.patch(`/interviews/${id}/status`, data);
  return res.data;
};

// Offers
export const getOffers = async () => {
  const res = await api.get("/offers");
  return res.data;
};

export const createOffer = async (data) => {
  const res = await api.post("/offers", data);
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
  addApplicationNote,
  rateApplication,
  getAssessments,
  createAssessment,
  getAssessmentResults,
  deleteAssessment,
  getInterviews,
  scheduleInterview,
  submitInterviewFeedback,
  updateInterviewStatus,
  getOffers,
  createOffer,
  respondToOffer,
  getEmployerAnalytics,
};
