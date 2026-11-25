const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitNotification } = require("./socketService");

// Location text for a listing alert: only what the listing says, nothing invented.
const locationLine = (item) => {
  const where = [item.location, item.workMode && `(${item.workMode})`].filter(Boolean).join(" ");
  return where ? `**Location:** ${where}` : "";
};

const DASHBOARDS = {
  student: "/student/dashboard",
  fresher: "/fresher/dashboard",
  professional: "/professional/dashboard",
  employer: "/employer/dashboard",
};
const dashboardPath = (user) =>
  DASHBOARDS[user?.userType] || (user?.role === "employer" ? DASHBOARDS.employer : DASHBOARDS.student);

// Where clicking an in-app notification takes its recipient when the caller gives no link.
const defaultActionUrl = (notificationType, user) => {
  if (notificationType?.startsWith("INTERVIEW_")) return `${dashboardPath(user)}?tab=interviews`;
  switch (notificationType) {
    case "APPLICATION_STATUS": return "/applications";
    // Candidates accept or decline offers on My Applications; employers track them on their dashboard.
    case "OFFER": return dashboardPath(user) === DASHBOARDS.employer ? DASHBOARDS.employer : "/applications";
    case "COMPANY_VERIFICATION":
    case "LISTING_STATUS": return DASHBOARDS.employer;
    default: return null;
  }
};

// Live delivery goes over Socket.IO, the app's one realtime channel (H17).
const broadcastRealtimeNotification = (notification, targetUserId = null) => {
  emitNotification(notification, targetUserId);
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
  actionUrl = null,
  metadata = {},
}) => {
  try {
    if (!recipientId) return null;

    // Verify recipient exists
    const recipient = await User.findById(recipientId).select("_id email fullName userType role");
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
      actionUrl: actionUrl || defaultActionUrl(notificationType, recipient),
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
    const listingId = item._id ? String(item._id) : null;
    let actionText = "View Opportunity ›";

    if (type === "job") {
      category = "job";
      actionUrl = listingId ? `/jobs/${listingId}` : "/jobs";
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
      actionUrl = listingId ? `/internships/${listingId}` : "/internships";
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
      actionUrl = listingId ? `/courses/${listingId}` : "/courses";
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
      relatedId: listingId,
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

module.exports = {
  DASHBOARDS,
  dashboardPath,
  defaultActionUrl,
  broadcastRealtimeNotification,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createOpportunityNotification,
};
