import api from "../api/api";

/**
 * Send user query to RAG AI Assistant
 */
export const askAiAssistant = async (query, conversationHistory = []) => {
  const response = await api.post("/ai/chat", { query, conversationHistory });
  return response.data;
};

/**
 * Trigger AI Recommendation Mail into user's notification inbox
 */
export const triggerAiRecommendationMail = async () => {
  const response = await api.post("/ai/send-recommendation-mail");
  return response.data;
};
