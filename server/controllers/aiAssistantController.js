const { answerUserQuery, retrievePlatformContext } = require("../services/ragAiService");
const { sendAiRecommendationNotification } = require("../services/notificationService");

/**
 * POST /api/ai/chat
 * Query personal AI assistant backed by RAG
 */
exports.chat = async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;
    const userId = req.user?._id || null;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "Query text is required." });
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

/**
 * POST /api/ai/send-recommendation-mail
 * Platform AI sends an automated curated recommendation directly to user's inbox
 */
exports.sendRecommendationMail = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const context = await retrievePlatformContext("recommended opportunities", userId);
    const topPick = context.internships[0] || context.jobs[0];

    if (!topPick) {
      return res.json({ success: false, message: "No active opportunities available right now." });
    }

    const isInternship = topPick.type === "internship";
    const title = `AI Recommendation: Top Pick ${topPick.title} at ${topPick.company}`;
    const preview = `CareerConnect AI matched your profile with ${topPick.title} based on your technical competencies.`;
    const content = `
Hello,

Our platform AI analyzed active recruiting drives against your engineering skill benchmarks and flagged a high-affinity match:

**Role:** ${topPick.title}
**Company:** ${topPick.company}
**Work Mode:** ${topPick.workMode || "Remote / Hybrid"}
**Package / Stipend:** ${topPick.salary || topPick.stipend || "Competitive"}

**Why this was recommended:**
Your profile demonstrates foundational technical proficiency, and this partner is actively shortlisting candidates from Geeta University.

Click below to submit your profile.
    `.trim();

    const notification = await sendAiRecommendationNotification({
      userId,
      title,
      preview,
      content,
      category: isInternship ? "internship" : "job",
      actionUrl: isInternship ? "/internships" : "/jobs",
      actionText: isInternship ? "Apply For Internship ›" : "Apply For Job ›",
      metadata: {
        company: topPick.company,
        salary: topPick.salary || topPick.stipend,
        skills: topPick.skills,
      },
    });

    res.json({
      success: true,
      message: "AI recommendation sent to your notification inbox!",
      notification,
    });
  } catch (err) {
    console.error("AI send recommendation error:", err);
    res.status(500).json({ success: false, message: "Failed to dispatch AI recommendation." });
  }
};
