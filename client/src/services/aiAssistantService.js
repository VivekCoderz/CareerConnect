import api from "../api/api";

/**
 * Send user query to RAG AI Assistant
 */
export const askAiAssistant = async (query, conversationHistory = []) => {
  const response = await api.post("/ai/chat", { query, conversationHistory });
  return response.data;
};
