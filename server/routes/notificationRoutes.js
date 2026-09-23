const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.use(protect);
// Real-time SSE stream endpoint
router.get("/stream", notificationController.streamNotifications);

// Notification retrieval
router.get("/", notificationController.getNotifications);

// Bulk mark as read (must be before :id to prevent matching 'read-all' as an id)
// Support both PUT and PATCH for read operations
router.put("/read-all", notificationController.markAllAsRead);
router.patch("/read-all", notificationController.markAllAsRead);

// Single notification routes
router.get("/:id", notificationController.getNotificationById);
router.put("/:id/read", notificationController.markAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;

