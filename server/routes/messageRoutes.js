const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

// 1. Conversation list
router.get("/conversations", messageController.getConversations);

// 2. Create or find conversation
router.post("/conversations", messageController.getOrCreateConversation);

// 3. Messages inside a conversation
router.get("/:conversationId", messageController.getMessages);

// 4. Send message to conversation
router.post("/:conversationId", messageController.sendMessage);

// 5. Mark conversation as read
router.patch("/:conversationId/read", messageController.markAsRead);

module.exports = router;
