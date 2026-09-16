import api from "../api/api";

/**
 * Admin API Service - RBAC & Multi-Tenant Support
 */

export const adminLogin = async ({ emailOrUsername, password, keepSignedIn = false }) => {
  const response = await api.post("/admin/login", {
    email: emailOrUsername,
    username: emailOrUsername,
    password,
    keepSignedIn,
  });
  return response.data;
};

export const adminLogout = async () => {
  const response = await api.post("/admin/logout");
  return response.data;
};

export const getAdminMe = async () => {
  const response = await api.get("/admin/me");
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

// ==========================================
// COMPANIES (SUPER_ADMIN)
// ==========================================
export const getAdminCompanies = async (params = {}) => {
  const response = await api.get("/admin/companies", { params });
  return response.data;
};

export const createAdminCompany = async (data) => {
  const response = await api.post("/admin/companies", data);
  return response.data;
};

export const getAdminCompanyById = async (id) => {
  const response = await api.get(`/admin/companies/${id}`);
  return response.data;
};

export const updateAdminCompany = async (id, data) => {
  const response = await api.put(`/admin/companies/${id}`, data);
  return response.data;
};

export const updateAdminCompanyStatus = async (id, status) => {
  const response = await api.patch(`/admin/companies/${id}/status`, { status });
  return response.data;
};

export const deleteAdminCompany = async (id) => {
  const response = await api.delete(`/admin/companies/${id}`);
  return response.data;
};

// ==========================================
// COMPANY ADMINS (SUPER_ADMIN)
// ==========================================
export const getCompanyAdmins = async (params = {}) => {
  const response = await api.get("/admin/company-admins", { params });
  return response.data;
};

export const createCompanyAdmin = async (data) => {
  const response = await api.post("/admin/company-admins", data);
  return response.data;
};

export const updateCompanyAdmin = async (id, data) => {
  const response = await api.put(`/admin/company-admins/${id}`, data);
  return response.data;
};

export const updateCompanyAdminStatus = async (id, status) => {
  const response = await api.patch(`/admin/company-admins/${id}/status`, { status });
  return response.data;
};

// ==========================================
// OWN COMPANY (COMPANY_ADMIN)
// ==========================================
export const getOwnCompany = async () => {
  const response = await api.get("/admin/company");
  return response.data;
};

export const updateOwnCompany = async (data) => {
  const response = await api.put("/admin/company", data);
  return response.data;
};

// ==========================================
// USERS (STUDENTS, EMPLOYERS, ETC.)
// ==========================================
export const getAdminUsers = async (params = {}) => {
  const response = await api.get("/admin/users", { params });
  return response.data;
};

export const updateUserStatus = async (id, status) => {
  const response = await api.patch(`/admin/users/${id}/status`, { status });
  return response.data;
};

export const getAdminStudents = async (params = {}) => {
  const response = await api.get("/admin/students", { params });
  return response.data;
};

export const updateStudentStatus = async (id, status) => {
  const response = await api.patch(`/admin/students/${id}/status`, { status });
  return response.data;
};

export const getAdminEmployers = async (params = {}) => {
  const response = await api.get("/admin/employers", { params });
  return response.data;
};

export const updateEmployerStatus = async (id, status) => {
  const response = await api.patch(`/admin/employers/${id}/status`, { status });
  return response.data;
};

// ==========================================
// OPPORTUNITIES
// ==========================================
export const getAdminOpportunities = async (params = {}) => {
  const response = await api.get("/admin/opportunities", { params });
  return response.data;
};

export const getAdminOpportunitiesCompanies = async () => {
  const response = await api.get("/admin/opportunities/companies-list");
  return response.data;
};

export const approveAdminOpportunity = async (type, id, data = {}) => {
  const response = await api.post(`/admin/opportunities/${type}/${id}/approve`, data);
  return response.data;
};

export const rejectAdminOpportunity = async (type, id, { rejectionReason, adminNote = "" }) => {
  const response = await api.post(`/admin/opportunities/${type}/${id}/reject`, {
    rejectionReason,
    adminNote,
  });
  return response.data;
};

export const editAdminOpportunity = async (type, id, data) => {
  const response = await api.put(`/admin/opportunities/${type}/${id}`, data);
  return response.data;
};

export const closeAdminOpportunity = async (type, id) => {
  const response = await api.patch(`/admin/opportunities/${type}/${id}/close`);
  return response.data;
};

export const toggleFeatureOpportunity = async (type, id, isFeatured) => {
  const response = await api.patch(`/admin/opportunities/${type}/${id}/feature`, { isFeatured });
  return response.data;
};

export const updateOpportunityStatus = async (type, id, status) => {
  const response = await api.patch(`/admin/opportunities/${type}/${id}/status`, { status });
  return response.data;
};

// ==========================================
// APPLICATIONS
// ==========================================
export const getAdminApplications = async (params = {}) => {
  const response = await api.get("/admin/applications", { params });
  return response.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await api.patch(`/admin/applications/${id}/status`, { status });
  return response.data;
};

// ==========================================
// REPORTS (Platform Reports & Trust)
// ==========================================
export const getAdminReports = async (params = {}) => {
  const response = await api.get("/admin/reports", { params });
  return response.data;
};

export const getAdminReportById = async (id) => {
  const response = await api.get(`/admin/reports/${id}`);
  return response.data;
};

export const createAdminReport = async (data) => {
  const response = await api.post("/admin/reports", data);
  return response.data;
};

export const updateAdminReportStatus = async (id, status, resolutionNotes = "") => {
  const response = await api.patch(`/admin/reports/${id}/status`, { status, resolutionNotes });
  return response.data;
};

export const updateAdminReportPriority = async (id, priority) => {
  const response = await api.patch(`/admin/reports/${id}/priority`, { priority });
  return response.data;
};

export const addAdminReportNote = async (id, note) => {
  const response = await api.post(`/admin/reports/${id}/notes`, { note });
  return response.data;
};

export const resolveAdminReport = async (id, resolutionNote) => {
  const response = await api.post(`/admin/reports/${id}/resolve`, { resolutionNote });
  return response.data;
};

export const dismissAdminReport = async (id, dismissalReason) => {
  const response = await api.post(`/admin/reports/${id}/dismiss`, { dismissalReason });
  return response.data;
};

// ==========================================
// SETTINGS
// ==========================================
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
  getAdminMe,
  getAdminDashboard,
  searchAdminData,
  getAdminNotifications,
  getAdminCompanies,
  createAdminCompany,
  getAdminCompanyById,
  updateAdminCompany,
  updateAdminCompanyStatus,
  deleteAdminCompany,
  getCompanyAdmins,
  createCompanyAdmin,
  updateCompanyAdmin,
  updateCompanyAdminStatus,
  getOwnCompany,
  updateOwnCompany,
  getAdminUsers,
  updateUserStatus,
  getAdminStudents,
  updateStudentStatus,
  getAdminEmployers,
  updateEmployerStatus,
  getAdminOpportunities,
  updateOpportunityStatus,
  getAdminApplications,
  updateApplicationStatus,
  getAdminReports,
  getAdminReportById,
  createAdminReport,
  updateAdminReportStatus,
  updateAdminReportPriority,
  addAdminReportNote,
  resolveAdminReport,
  dismissAdminReport,
  getAdminSettings,
  updateAdminSettings,
};
