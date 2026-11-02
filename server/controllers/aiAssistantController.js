const { answerUserQuery } = require("../services/ragAiService");

/**
 * POST /api/ai/chat
 * Query personal AI assistant backed by RAG
 */
exports.chat = async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body || {};
    const userId = req.user?._id || null;

    if (typeof query !== "string" || !query.trim() || query.length > 2000 ||
        !Array.isArray(conversationHistory) || conversationHistory.length > 10 ||
        conversationHistory.some((item) => !item || !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" || item.content.length > 2000)) {
      return res.status(400).json({ success: false, message: "Invalid query or conversation history." });
    }

    const response = await answerUserQuery({
      query: query.trim(),
      userId,
      conversationHistory,
    });

    res.json(response);
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({
      success: false,
      message: "AI Assistant encountered an error. Please try again.",
    });
  }
};
