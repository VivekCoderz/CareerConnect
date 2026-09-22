import api from "../api/api";

export const getConversations = async () => {
  const res = await api.get("/messages/conversations");
  return res.data;
};

export const getOrCreateConversation = async (data) => {
  const res = await api.post("/messages/conversations", data);
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/messages/${conversationId}`);
  return res.data;
};

export const sendMessage = async (conversationId, data) => {
  const res = await api.post(`/messages/${conversationId}`, data);
  return res.data;
};

export const markConversationRead = async (conversationId) => {
  const res = await api.patch(`/messages/${conversationId}/read`);
  return res.data;
};

export default {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
};
