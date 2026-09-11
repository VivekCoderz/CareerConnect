const Notification = require("../models/Notification");
const {
  registerSseClient,
  seedWelcomeNotificationsIfEmpty,
} = require("../services/notificationService");

/**
 * GET /api/notifications
 * Get user's inbox notifications with unread count
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { category, isRead, page = 1, limit = 20 } = req.query;

    if (userId) {
      await seedWelcomeNotificationsIfEmpty(userId);
    }

    const filter = {
      $or: [{ recipient: userId || null }, { recipient: null }],
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        $or: [{ recipient: userId || null }, { recipient: null }],
        isRead: false,
      }),
    ]);

    res.json({
      success: true,
      notifications: items,
      total,
      unreadCount,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

/**
 * GET /api/notifications/:id
 * Get full mail content and mark as read
 */
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    // Auto mark as read upon viewing
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error fetching notification details:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notification." });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;

    await Notification.updateMany(
      {
        $or: [{ recipient: userId || null }, { recipient: null }],
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("Error marking all read:", err);
    res.status(500).json({ success: false, message: "Failed to mark all as read." });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.json({ success: true, message: "Notification deleted successfully." });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, message: "Failed to delete notification." });
  }
};

/**
 * GET /api/notifications/stream
 * Server-Sent Events (SSE) stream for real-time notification push
 */
exports.streamNotifications = (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.flushHeaders?.();

  const userId = req.user?._id || req.query.userId || null;
  registerSseClient(userId, res);
};
