const Notification = require("../models/Notification");
const User = require("../models/User");

// Location text for a listing alert: only what the listing says, nothing invented.
const locationLine = (item) => {
  const where = [item.location, item.workMode && `(${item.workMode})`].filter(Boolean).join(" ");
  return where ? `**Location:** ${where}` : "";
};

// In-memory set of SSE client response streams: Map<userId, Set<res>>
const sseClients = new Map();
const locallyDelivered = new Map();
let changeStream = null;
let changeStreamRetry = null;

// One database change stream per API process delivers inserts created by other
// replicas to this process's connected users. MongoDB must run as a replica set.
const startChangeStream = () => {
  if (changeStream || changeStreamRetry || sseClients.size === 0) return;
  const topology = Notification.db.client?.topology?.description?.type;
  if (!topology || (!topology.startsWith("ReplicaSet") && topology !== "Sharded")) return;
  try {
    changeStream = Notification.watch([{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" });
    changeStream.on("change", ({ fullDocument }) => {
      if (!fullDocument) return;
      const id = String(fullDocument._id);
      if (locallyDelivered.delete(id)) return;
      broadcastRealtimeNotification(fullDocument, fullDocument.recipient);
    });
    changeStream.on("error", (error) => {
      console.warn("Notification change stream unavailable:", error.message);
      changeStream?.close().catch(() => {});
      changeStream = null;
      changeStreamRetry = setTimeout(() => {
        changeStreamRetry = null;
        startChangeStream();
      }, 30000);
      changeStreamRetry.unref?.();
    });
  } catch (error) {
    console.warn("Notification change stream unavailable:", error.message);
    changeStream = null;
  }
};

/**
 * Register a client for Server-Sent Events (SSE)
 */
const registerSseClient = (userId, res) => {
  const key = String(userId);
  if (!sseClients.has(key)) {
    sseClients.set(key, new Set());
  }
  sseClients.get(key).add(res);
  startChangeStream();

  // Send initial keep-alive
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date() })}\n\n`);

  const heartbeat = setInterval(() => {
    if (res.writableLength > 128 * 1024) {
      res.end();
      return;
    }
    res.write(": keep-alive\n\n");
  }, 25000);
  heartbeat.unref?.();

  // Clean up on disconnect
  res.on("close", () => {
    clearInterval(heartbeat);
    if (sseClients.has(key)) {
      sseClients.get(key).delete(res);
      if (sseClients.get(key).size === 0) {
        sseClients.delete(key);
      }
    }
  });
};

/**
 * Broadcast an SSE event to a specific user and global listeners
 */
const broadcastRealtimeNotification = (notification, targetUserId = null) => {
  try {
    if (notification._id) {
      locallyDelivered.set(String(notification._id), Date.now());

      if (locallyDelivered.size > 10000) {
        const cutoff = Date.now() - 60000;

        for (const [id, timestamp] of locallyDelivered) {
          if (timestamp >= cutoff && locallyDelivered.size <= 10000) break;
          locallyDelivered.delete(id);
        }
      }
    }

    const payload = JSON.stringify(notification);

    const recipient = notification.recipient || targetUserId;

    const destinations = recipient
      ? [sseClients.get(String(recipient))].filter(Boolean)
      : sseClients.values();

    for (const clients of destinations) {
      clients.forEach((client) => {
        try {
          if (client.writableLength > 128 * 1024) {
            client.end();
            return;
          }

          client.write(
            `event: notification\ndata: ${payload}\n\n`
          );
        } catch (err) {
          console.warn("SSE delivery error:", err.message);
        }
      });
    }
  } catch (err) {
    console.error("SSE Broadcast error:", err.message);
  }
};

/**
 * Creates and delivers an in-app notification to a user (used for interviews & applications).
 */
const createNotification = async ({
  recipientId,
  senderId = null,
  title,
  message,
  notificationType = "GENERAL",
  relatedInterviewId = null,
  relatedApplicationId = null,
  actionUrl = "",
  metadata = {},
}) => {
  try {
    if (!recipientId) return null;

    // Verify recipient exists
    const recipient = await User.findById(recipientId).select("_id email fullName");
    if (!recipient) return null;

    const notif = await Notification.create({
      recipient: recipientId,
      recipientId,
      senderId,
      sender: "E2Job System",
      senderRole: "system",
      title,
      preview: message,
      message,
      content: message,
      notificationType,
      category: "system",
      relatedInterviewId,
      relatedApplicationId,
      actionUrl,
      metadata,
    });

    broadcastRealtimeNotification(notif, recipientId);
    return notif;
  } catch (err) {
    console.error("Error creating notification:", err.message);
    return null;
  }
};

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (userId, { limit = 30, page = 1, unreadOnly = false } = {}) => {
  const query = {
    $or: [{ recipient: userId }, { recipientId: userId }, { recipient: null }],
  };
  if (unreadOnly) {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      $or: [{ recipient: userId }, { recipientId: userId }],
      isRead: false,
    }),
  ]);

  return {
    success: true,
    notifications,
    total,
    unreadCount,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      $or: [{ recipient: userId }, { recipientId: userId }, { recipient: null }],
    },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    {
      $or: [{ recipient: userId }, { recipientId: userId }],
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { success: true };
};

/**
 * Create a targeted Opportunity Notification (Job, Internship, Course)
 */
const createOpportunityNotification = async ({ type, item, sender = "E2Job Platform", senderAvatar = null, targetUserId = null }) => {
  try {
    let title = "";
    let preview = "";
    let content = "";
    let category = "job";
    let actionUrl = "/jobs";
    let actionText = "View Opportunity ›";

    if (type === "job") {
      category = "job";
      actionUrl = `/jobs`;
      actionText = "Apply For Job ›";
      title = `Hot Job Match: ${item.title} at ${sender}`;
      preview = `Exciting career opportunity for ${item.title}${item.salary ? ` (${item.salary})` : ""}. Apply now!`;
      content = `
Dear Candidate,

A verified employer has just posted a relevant job opportunity:

**Job Title:** ${item.title}
**Company:** ${sender}
${locationLine(item)}
${item.salary ? `**Compensation:** ${item.salary}\n` : ""}${item.type ? `**Employment Type:** ${item.type}` : ""}

**Key Skills Required:**
${(item.skillsRequired || item.skills || []).map((s) => `• ${s}`).join("\n") || "• See the listing"}

Don't wait—early applicants have a 3x higher interview rate. Click below to submit your application now!
      `.trim();
    } else if (type === "internship") {
      category = "internship";
      actionUrl = `/internships`;
      actionText = "Apply For Internship ›";
      title = `New Internship Alert: ${item.title} at ${sender}`;
      preview = `New internship opportunity for ${item.title}${item.stipend ? ` (${item.stipend})` : ""}.`;
      content = `
Dear Candidate,

A top partner has just published a verified internship program:

**Internship:** ${item.title}
**Company / Organization:** ${sender}
${locationLine(item)}
${item.stipend ? `**Stipend:** ${item.stipend}\n` : ""}${item.duration ? `**Duration:** ${item.duration}` : ""}

**Skills In Focus:**
${(item.skillsRequired || item.skills || []).map((s) => `• ${s}`).join("\n") || "• See the listing"}

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
      recipientId: targetUserId || null,
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
      recipientId: userId,
      sender: "E2Job AI Assistant 🤖",
      senderRole: "ai",
      senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=E2JobAI",
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

// Plain text only: the inbox shows content as-is, so markdown would appear as "**".
// Keep every line true; nothing here may promise a feature the platform does not have.
const WELCOME_CANDIDATE = `Welcome to E2Job.

Here is how to get started:
1. Complete your profile and upload your resume, so employers can see your skills.
2. Browse Jobs and Internships and apply with one click.
3. Track every application under My Applications. You will get a notification here when an employer updates it.
4. Have a question about skills, your resume or interviews? Use the Ask AI button at the bottom-right of the page.

E2Job Team`;

const WELCOME_EMPLOYER = `Welcome to E2Job.

Here is how to get started:
1. Complete your company profile. Every company is verified by the E2Job team before its listings go live.
2. Post a job or internship. It goes live once the E2Job team approves it.
3. Review applicants in the ATS Pipeline and download the list from Export.

Questions? Write to support@e2job.com.

E2Job Team`;

/**
 * Seed a welcome notification if the user's inbox is empty.
 * No actionUrl: opening it shows the full message instead of a link back to the same page.
 */
const seedWelcomeNotificationsIfEmpty = async (userId, role = "user") => {
  try {
    const count = await Notification.countDocuments({
      $or: [{ recipient: userId }, { recipientId: userId }, { recipient: null }],
    });

    if (count === 0) {
      const isEmployer = role === "employer";
      await Notification.create([
        {
          recipient: userId,
          recipientId: userId,
          sender: "E2Job Team",
          senderRole: "system",
          title: "Welcome to E2Job",
          preview: isEmployer
            ? "How to get started: company profile, posting jobs and reviewing applicants."
            : "How to get started: your profile, jobs, applications and Ask AI.",
          content: isEmployer ? WELCOME_EMPLOYER : WELCOME_CANDIDATE,
          category: "system",
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
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createOpportunityNotification,
  sendAiRecommendationNotification,
  seedWelcomeNotificationsIfEmpty,
};
