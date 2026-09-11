const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Creates and delivers an in-app notification to a user.
 */
exports.createNotification = async ({
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
    const recipient = await User.findById(recipientId).select("_id email");
    if (!recipient) return null;

    const notif = await Notification.create({
      recipientId,
      senderId,
      title,
      message,
      notificationType,
      relatedInterviewId,
      relatedApplicationId,
      actionUrl,
      metadata,
    });

    return notif;
  } catch (err) {
    console.error("Error creating notification:", err.message);
    return null;
  }
};

/**
 * Retrieves notifications for a given user.
 */
exports.getUserNotifications = async (userId, { limit = 30, page = 1, unreadOnly = false } = {}) => {
  try {
    const query = { recipientId: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName email profileImage")
        .populate("relatedInterviewId", "title roundName scheduledDate scheduledTime status result")
        .populate("relatedApplicationId", "opportunityTitle opportunityType status"),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    throw err;
  }
};

/**
 * Marks a single notification as read.
 */
exports.markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return notification;
};

/**
 * Marks all notifications for a user as read.
 */
exports.markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};
