import api from "../api/api";

/**
 * Admin API Service
 */

export const adminLogin = async ({ emailOrUsername, password, keepSignedIn = false }) => {
  const response = await api.post("/admin/login", {
    emailOrUsername,
    password,
    keepSignedIn,
  });
  return response.data;
};

export const adminLogout = async () => {
  const response = await api.post("/admin/logout");
  return response.data;
};

export const getAdminDashboard = async (range = "30d") => {
  const response = await api.get(`/admin/dashboard?range=${range}`);
  return response.data;
};

export const searchAdminData = async (query) => {
  if (!query || !query.trim()) {
    return { success: true, results: {} };
  }
  const response = await api.get(`/admin/search?q=${encodeURIComponent(query.trim())}`);
  return response.data;
};

export const getAdminNotifications = async () => {
  const response = await api.get("/admin/notifications");
  return response.data;
};

// Page 25: Students
export const getAdminStudents = async (params = {}) => {
  const response = await api.get("/admin/students", { params });
  return response.data;
};

export const updateStudentStatus = async (id, isActive) => {
  const response = await api.patch(`/admin/students/${id}/status`, { isActive });
  return response.data;
};

// Page 26: Employers
export const getAdminEmployers = async (params = {}) => {
  const response = await api.get("/admin/employers", { params });
  return response.data;
};

export const updateEmployerStatus = async (id, data) => {
  const response = await api.patch(`/admin/employers/${id}/status`, data);
  return response.data;
};

// Page 27: Opportunities
export const getAdminOpportunities = async (params = {}) => {
  const response = await api.get("/admin/opportunities", { params });
  return response.data;
};

export const updateOpportunityStatus = async (type, id, status) => {
  const response = await api.patch(`/admin/opportunities/${type}/${id}/status`, { status });
  return response.data;
};

// Page 28: Applications
export const getAdminApplications = async (params = {}) => {
  const response = await api.get("/admin/applications", { params });
  return response.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await api.patch(`/admin/applications/${id}/status`, { status });
  return response.data;
};

// Page 29: Reports
export const getAdminReports = async () => {
  const response = await api.get("/admin/reports");
  return response.data;
};

// Page 30: Settings
export const getAdminSettings = async () => {
  const response = await api.get("/admin/settings");
  return response.data;
};

export const updateAdminSettings = async (data) => {
  const response = await api.put("/admin/settings", data);
  return response.data;
};

export default {
  adminLogin,
  adminLogout,
  getAdminDashboard,
  searchAdminData,
  getAdminNotifications,
  getAdminStudents,
  updateStudentStatus,
  getAdminEmployers,
  updateEmployerStatus,
  getAdminOpportunities,
  updateOpportunityStatus,
  getAdminApplications,
  updateApplicationStatus,
  getAdminReports,
  getAdminSettings,
  updateAdminSettings,
};
