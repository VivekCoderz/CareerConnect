import api from "../api/api";

/**
 * Employer Profile & Dashboard API Service
 */

export const getEmployerProfile = async () => {
  const response = await api.get("/employer/profile");
  return response.data;
};

export const createEmployerProfile = async (data) => {
  const response = await api.post("/employer/profile", data);
  return response.data;
};

export const updateEmployerProfile = async (data) => {
  const response = await api.put("/employer/profile", data);
  return response.data;
};

export const patchEmployerProfile = async (data) => {
  const response = await api.patch("/employer/profile", data);
  return response.data;
};

export const saveEmployerDraft = async (data) => {
  const response = await api.post("/employer/profile/draft", data);
  return response.data;
};

export const publishEmployerProfile = async () => {
  const response = await api.post("/employer/profile/publish");
  return response.data;
};

export const unpublishEmployerProfile = async () => {
  const response = await api.post("/employer/profile/unpublish");
  return response.data;
};

export const deleteEmployerProfile = async () => {
  const response = await api.delete("/employer/profile");
  return response.data;
};

export const getEmployerDashboard = async () => {
  const response = await api.get("/employer/dashboard");
  return response.data;
};

export const getPublicCompanyProfile = async (companyId) => {
  const response = await api.get(`/companies/${companyId}`);
  return response.data;
};

export default {
  getEmployerProfile,
  createEmployerProfile,
  updateEmployerProfile,
  patchEmployerProfile,
  saveEmployerDraft,
  publishEmployerProfile,
  unpublishEmployerProfile,
  deleteEmployerProfile,
  getEmployerDashboard,
  getPublicCompanyProfile,
};
