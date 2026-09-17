const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.use(protect);
router.get("/stream", notificationController.streamNotifications);
router.get("/", notificationController.getNotifications);
router.put("/read-all", notificationController.markAllAsRead);
router.get("/:id", notificationController.getNotificationById);
router.put("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
