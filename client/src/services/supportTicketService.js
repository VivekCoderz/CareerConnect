import api from "../api/api";

// Users: raise a ticket and see their own.
export const createSupportTicket = async (data) => {
  const response = await api.post("/support-tickets", data);
  return response.data;
};

export const getMySupportTickets = async () => {
  const response = await api.get("/support-tickets");
  return response.data;
};

// Platform admins: every ticket, filtered by status and search.
export const getAdminSupportTickets = async (params = {}) => {
  const response = await api.get("/admin/support-tickets", { params });
  return response.data;
};

// { status?, message? } — the person who raised the ticket is notified.
export const updateAdminSupportTicket = async (id, data) => {
  const response = await api.patch(`/admin/support-tickets/${id}`, data);
  return response.data;
};

// The user's answer to the admin's verdict: { solved: boolean, message? }.
export const submitTicketFeedback = async (id, data) => {
  const response = await api.post(`/support-tickets/${id}/feedback`, data);
  return response.data;
};
