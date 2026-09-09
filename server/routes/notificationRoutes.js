const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Optional auth helper for SSE stream where cookies or query token might be passed
const authOrQuery = async (req, res, next) => {
  try {
    if (req.session?.user?.userId) {
      const user = await User.findById(req.session.user.userId).select("-password");
      if (user) {
        req.user = user;
        return next();
      }
    }

    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1] || req.query.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
      const user = await User.findById(decoded.id || decoded.userId).select("-password");
      if (user) {
        req.user = user;
      }
    }
  } catch (e) {
    // allow fallback for public broadcast stream
  }
  next();
};

// Real-time SSE stream endpoint
router.get("/stream", authOrQuery, notificationController.streamNotifications);

// Protected notification management routes
router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/:id", notificationController.getNotificationById);
router.put("/read-all", notificationController.markAllAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
