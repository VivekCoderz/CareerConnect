const Notification = require("../models/Notification");
const User = require("../models/User");

// In-memory set of SSE client response streams: Map<userId, Set<res>>
const sseClients = new Map();

/**
 * Register a client for Server-Sent Events (SSE)
 */
const registerSseClient = (userId, res) => {
  const key = userId ? String(userId) : "broadcast";
  if (!sseClients.has(key)) {
    sseClients.set(key, new Set());
  }
  sseClients.get(key).add(res);

  // Send initial keep-alive
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date() })}\n\n`);

  // Clean up on disconnect
  res.on("close", () => {
    if (sseClients.has(key)) {
      sseClients.get(key).delete(res);
      if (sseClients.get(key).size === 0) {
        sseClients.delete(key);
      }
    }
  });
};

/**
 * Broadcast notification payload to connected SSE streams
 */
const broadcastRealtimeNotification = (notification, targetUserId = null) => {
  const payload = JSON.stringify(notification);

  // 1. Send to target user if specified
  if (targetUserId && sseClients.has(String(targetUserId))) {
    sseClients.get(String(targetUserId)).forEach((client) => {
      try {
        client.write(`event: notification\ndata: ${payload}\n\n`);
      } catch (err) {
        console.warn("SSE delivery error:", err.message);
      }
    });
  }

  // 2. Also send to broadcast stream (all active users)
  if (sseClients.has("broadcast")) {
    sseClients.get("broadcast").forEach((client) => {
      try {
        client.write(`event: notification\ndata: ${payload}\n\n`);
      } catch (err) {
        console.warn("SSE broadcast delivery error:", err.message);
      }
    });
  }
};

/**
 * Create a mail-style notification when an opportunity is published
 */
const createOpportunityNotification = async ({ type, item, targetUserId = null }) => {
  try {
    let title = "";
    let preview = "";
    let content = "";
    let category = "job";
    let actionUrl = "/jobs";
    let actionText = "Apply Now ›";
    const sender = item.company || item.employerId?.companyName || "CareerConnect Partner";
    const senderAvatar = item.logo || item.companyLogo || null;

    if (type === "job") {
      category = "job";
      actionUrl = `/jobs`;
      actionText = "Apply For Job ›";
      title = `New Job Opening: ${item.title} at ${sender}`;
      preview = `Fresh opening for ${item.title} (${item.salary || "Competitive CTC"}). Actively accepting applications!`;
      content = `
Dear Candidate,

A new exciting job opportunity matching platform career tracks has just opened on CareerConnect:

**Role:** ${item.title}
**Company:** ${sender}
**Location:** ${item.location || "Multiple Locations"} (${item.workMode || "Hybrid"})
**Compensation:** ${item.salary || "Competitive CTC"}
**Employment Type:** ${item.type || "Full Time"}

**Key Skills Required:**
${(item.skillsRequired || item.skills || []).map((s) => `• ${s}`).join("\n") || "• Software Engineering fundamentals"}

Don't wait—early applicants have a 3x higher interview rate. Click below to submit your application now!
      `.trim();
    } else if (type === "internship") {
      category = "internship";
      actionUrl = `/internships`;
      actionText = "Apply For Internship ›";
      title = `New Internship Alert: ${item.title} at ${sender}`;
      preview = `New internship opportunity for ${item.title} (${item.stipend || "Stipend Available"}). Limited seats!`;
      content = `
Dear Candidate,

A top partner has just published a verified internship program:

**Internship:** ${item.title}
**Company / Organization:** ${sender}
**Location:** ${item.location || "Work from home"} (${item.workMode || "Remote"})
**Stipend:** ${item.stipend || "Competitive Stipend"}
**Duration:** ${item.duration || "3 - 6 Months"}

**Skills In Focus:**
${(item.skillsRequired || item.skills || []).map((s) => `• ${s}`).join("\n") || "• Technical & Problem-solving skills"}

Submit your resume and statement of purpose before the deadline.
      `.trim();
    } else if (type === "course") {
      category = "course";
      actionUrl = item._id ? `/courses/${item._id}` : `/courses`;
      actionText = "Enroll In Course ›";
      title = `New Course Available: ${item.title}`;
      preview = `Master new skills with ${item.title} (${item.provider || "Geeta University Academy"}). Free enrollment!`;
      content = `
Dear Student,

Level up your engineering and tech resume with our newly added certified curriculum:

**Course Title:** ${item.title}
**Provider:** ${item.provider || "Geeta University Academy"}
**Duration:** ${item.duration || "Self-Paced / 6 Weeks"}
**Level:** ${item.level || "Beginner to Advanced"}
**Access:** ${item.isFree ? "100% Free Scholarship Access" : "University Certified"}

Industry projects and completion certificate included. Start learning today!
      `.trim();
    }

    const notification = await Notification.create({
      recipient: targetUserId || null,
      sender,
      senderRole: "employer",
      senderAvatar,
      title,
      preview,
      content,
      category,
      actionUrl,
      actionText,
      relatedId: item._id ? String(item._id) : null,
      metadata: {
        company: sender,
        location: item.location,
        stipend: item.stipend,
        salary: item.salary,
        skills: item.skillsRequired || item.skills || item.skillsCovered || [],
        workMode: item.workMode,
      },
    });

    broadcastRealtimeNotification(notification, targetUserId);
    return notification;
  } catch (err) {
    console.error("Failed to create opportunity notification:", err.message);
    return null;
  }
};

/**
 * Send an AI Recommendation Mail to a user
 */
const sendAiRecommendationNotification = async ({
  userId,
  title,
  preview,
  content,
  category = "ai_recommendation",
  actionUrl = "/student/dashboard",
  actionText = "View Recommendation ›",
  metadata = {},
}) => {
  try {
    const notification = await Notification.create({
      recipient: userId,
      sender: "CareerConnect AI Assistant 🤖",
      senderRole: "ai",
      senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CareerConnectAI",
      title,
      preview,
      content,
      category,
      actionUrl,
      actionText,
      metadata,
    });

    broadcastRealtimeNotification(notification, userId);
    return notification;
  } catch (err) {
    console.error("Failed to send AI recommendation notification:", err.message);
    return null;
  }
};

/**
 * Seed initial helpful notifications if user inbox is empty
 */
const seedWelcomeNotificationsIfEmpty = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      $or: [{ recipient: userId }, { recipient: null }],
    });

    if (count === 0) {
      await Notification.create([
        {
          recipient: userId,
          sender: "CareerConnect AI Assistant 🤖",
          senderRole: "ai",
          senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CareerConnectAI",
          title: "Welcome to CareerConnect! Your personalized AI is ready",
          preview: "Hi! I'm your personal platform AI Assistant. I analyze live jobs, internships, and courses for you.",
          content: `
Hello! Welcome to your CareerConnect workspace.

I am your personal AI Career Advisor, powered by live platform RAG (Retrieval-Augmented Generation).

Here's what I can do for you:
1. **Real-time Opportunity Alerts:** Whenever a new internship or job matching your target profile is listed, I will send you a mail notification directly.
2. **Instant Questions & Guidance:** Look at the floating AI button at the bottom-right of your screen. Click it anytime to ask questions about required skills, resume gaps, or interview prep.
3. **Smart Recommendations:** I continuously match active campus drives and top tech openings to help you apply early.

Feel free to browse your dashboard or test asking me anything in the side chat!

Warm regards,  
**CareerConnect AI Team**
          `.trim(),
          category: "ai_recommendation",
          actionUrl: "/student/dashboard",
          actionText: "Open Dashboard ›",
          isRead: false,
        },
        {
          recipient: userId,
          sender: "Zomato Technologies",
          senderRole: "employer",
          title: "Trending: Full Stack Web Development Internship (Remote)",
          preview: "Zomato Technologies is actively seeking enthusiastic student developers. Stipend: ₹25,000/mo.",
          content: `
Dear Candidate,

Zomato Technologies has opened applications for its Summer Engineering Internship Program:

**Role:** Full Stack Web Development Intern  
**Work Mode:** Work from home (Remote)  
**Stipend:** ₹25,000 - ₹35,000 / month  
**Duration:** 6 Months (Certificate + PPO Opportunity)  

**Tech Stack:** React, Node.js, REST APIs, MongoDB

Early applicants receive priority resume screening. Click below to review full details and apply.
          `.trim(),
          category: "internship",
          actionUrl: "/internships",
          actionText: "Apply Online ›",
          metadata: {
            company: "Zomato Technologies",
            location: "Gurugram / Remote",
            stipend: "₹25,000 - ₹35,000 / month",
            skills: ["React", "Node.js", "MongoDB"],
            workMode: "Remote",
          },
          isRead: false,
        },
        {
          recipient: userId,
          sender: "Amazon Development Centre",
          senderRole: "employer",
          title: "New Job Opening: Associate Software Engineer (Full-Time)",
          preview: "Entry-level campus recruitment drive by Amazon Development Centre. CTC: ₹8.5 - 12 LPA.",
          content: `
Dear Candidate,

Amazon Development Centre is hiring graduate engineers:

**Role:** Associate Software Engineer  
**Location:** Bangalore / Remote (Hybrid)  
**Compensation:** ₹8,50,000 - ₹12,00,000 / year  
**Eligibility:** 2024 - 2028 Batches (Computer Science & allied branches)  

Click below to explore full eligibility benchmarks and submit your candidate application.
          `.trim(),
          category: "job",
          actionUrl: "/jobs",
          actionText: "Apply For Job ›",
          metadata: {
            company: "Amazon Development Centre",
            location: "Bangalore",
            salary: "₹8.5 - 12 LPA",
            skills: ["Data Structures", "Algorithms", "React", "Node.js"],
            workMode: "Hybrid",
          },
          isRead: false,
        },
      ]);
    }
  } catch (err) {
    console.warn("Could not seed welcome notifications:", err.message);
  }
};

module.exports = {
  registerSseClient,
  broadcastRealtimeNotification,
  createOpportunityNotification,
  sendAiRecommendationNotification,
  seedWelcomeNotificationsIfEmpty,
};
