const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const notificationService = require("../services/notificationService");

/**
 * GET /api/notifications
 * Get authenticated user's notifications and unread count
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const { limit, page, unreadOnly } = req.query;
    const result = await notificationService.getUserNotifications(req.user._id, {
      limit: limit ? Number(limit) : 30,
      page: page ? Number(page) : 1,
      unreadOnly: unreadOnly === "true",
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the authenticated user as read
 */
router.patch("/read-all", protect, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch("/:id/read", protect, async (req, res, next) => {
  try {
    const notif = await notificationService.markAsRead(req.params.id, req.user._id);
    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    return res.status(200).json({
      success: true,
      notification: notif,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
