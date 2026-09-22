const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.use(protect);
router.get("/stream", notificationController.streamNotifications);
router.get("/", notificationController.getNotifications);
<<<<<<< HEAD
router.get("/:id", notificationController.getNotificationById);

// Support both PUT and PATCH for read operations
router.put("/read-all", notificationController.markAllAsRead);
router.patch("/read-all", notificationController.markAllAsRead);

=======
router.put("/read-all", notificationController.markAllAsRead);
router.get("/:id", notificationController.getNotificationById);
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
router.put("/:id/read", notificationController.markAsRead);
router.patch("/:id/read", notificationController.markAsRead);

router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
