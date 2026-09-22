const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Company = require("../models/Company");
const Application = require("../models/Application");
const EmployerProfile = require("../models/EmployerProfile");
const notificationService = require("../services/notificationService");
const socketService = require("../services/socketService");

// Helper to determine employer company ID
const getEmployerCompany = async (user) => {
  if (user.companyId) return user.companyId;
  const profile = await EmployerProfile.findOne({ userId: user._id }).select("companyId");
  return profile?.companyId || null;
};

// GET /api/messages/conversations (List user's active conversations)
exports.getConversations = async (req, res, next) => {
  try {
    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";
    let query = {};

    if (isEmployer) {
      const companyId = await getEmployerCompany(req.user);
      if (companyId) {
        query.$or = [{ employerId: req.user._id }, { companyId }, { participants: req.user._id }];
      } else {
        query.$or = [{ employerId: req.user._id }, { participants: req.user._id }];
      }
    } else {
      query.$or = [{ candidateId: req.user._id }, { participants: req.user._id }];
    }

    const conversations = await Conversation.find(query)
      .populate("candidateId", "fullName email profileImage role userType")
      .populate("employerId", "fullName email profileImage role userType companyName")
      .populate("companyId", "name logo")
      .populate("applicationId", "status stage opportunityType opportunityTitle")
      .populate("jobId", "title department")
      .populate("internshipId", "title department")
      .sort({ lastMessageAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => {
      const otherUser =
        String(conv.candidateId?._id) === String(req.user._id)
          ? conv.employerId
          : conv.candidateId;
      const unreadCount = conv.unreadCounts?.[String(req.user._id)] || 0;

      return {
        ...conv,
        otherUser,
        unreadCount,
      };
    });

    return res.status(200).json({
      success: true,
      conversations: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/messages/conversations (Find existing or create conversation)
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const { candidateId, applicationId, jobId, internshipId, contextTitle } = req.body;
    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";

    let targetCandidateId = isEmployer ? candidateId : req.user._id;
    let targetEmployerId = isEmployer ? req.user._id : null;
    let companyId = null;

    if (!targetCandidateId) {
      return res.status(400).json({ success: false, message: "Candidate ID is required" });
    }

    // If application provided, extract company and employer
    if (applicationId) {
      const app = await Application.findById(applicationId)
        .populate("jobId")
        .populate("internshipId")
        .lean();
      if (app) {
        targetCandidateId = app.candidateId;
        companyId = app.companyId || (isEmployer ? await getEmployerCompany(req.user) : null);
        if (!isEmployer) {
          targetEmployerId =
            app.jobId?.createdBy ||
            app.internshipId?.createdBy ||
            app.employerId ||
            (await User.findOne({ companyId: app.companyId, role: "employer" }).select("_id"))?._id;
        }
      }
    }

    if (!targetEmployerId) {
      if (isEmployer) {
        targetEmployerId = req.user._id;
      } else {
        return res.status(400).json({ success: false, message: "Employer ID or Application context is required" });
      }
    }

    if (!companyId && isEmployer) {
      companyId = await getEmployerCompany(req.user);
    }

    // Check if conversation already exists between these users for this application/opportunity
    let conversation = await Conversation.findOne({
      candidateId: targetCandidateId,
      $or: [{ employerId: targetEmployerId }, { companyId: companyId || null }],
      ...(applicationId ? { applicationId } : {}),
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [targetCandidateId, targetEmployerId],
        candidateId: targetCandidateId,
        employerId: targetEmployerId,
        companyId: companyId || null,
        applicationId: applicationId || null,
        jobId: jobId || null,
        internshipId: internshipId || null,
        contextTitle: contextTitle || "Application Discussion",
        lastMessage: "Conversation started",
        lastMessageAt: new Date(),
        unreadCounts: {},
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate("candidateId", "fullName email profileImage role userType")
      .populate("employerId", "fullName email profileImage role userType companyName")
      .populate("companyId", "name logo")
      .populate("applicationId", "status stage opportunityType opportunityTitle")
      .lean();

    return res.status(200).json({
      success: true,
      conversation: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/messages/:conversationId (List messages in conversation)
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Verify user authorization
    const userIdStr = String(req.user._id);
    const isParticipant =
      conversation.participants.some((p) => String(p) === userIdStr) ||
      String(conversation.candidateId) === userIdStr ||
      String(conversation.employerId) === userIdStr;

    let hasCompanyAccess = false;
    if (!isParticipant && (req.user.role === "employer" || req.user.userType === "employer")) {
      const userCompanyId = await getEmployerCompany(req.user);
      if (userCompanyId && String(userCompanyId) === String(conversation.companyId)) {
        hasCompanyAccess = true;
      }
    }

    if (!isParticipant && !hasCompanyAccess && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized access to this conversation" });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "fullName email profileImage role userType")
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // Mark as read for this user
    if (conversation.unreadCounts && conversation.unreadCounts.get(userIdStr) > 0) {
      conversation.unreadCounts.set(userIdStr, 0);
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/messages/:conversationId (Send a message)
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text, attachments } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const userIdStr = String(req.user._id);
    const isParticipant =
      conversation.participants.some((p) => String(p) === userIdStr) ||
      String(conversation.candidateId) === userIdStr ||
      String(conversation.employerId) === userIdStr;

    let hasCompanyAccess = false;
    if (!isParticipant && (req.user.role === "employer" || req.user.userType === "employer")) {
      const userCompanyId = await getEmployerCompany(req.user);
      if (userCompanyId && String(userCompanyId) === String(conversation.companyId)) {
        hasCompanyAccess = true;
      }
    }

    if (!isParticipant && !hasCompanyAccess && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized to send messages in this conversation" });
    }

    const message = await Message.create({
      conversationId,
      senderId: req.user._id,
      senderRole: req.user.role || req.user.userType || "student",
      senderName: req.user.fullName || "User",
      text: text.trim(),
      attachments: attachments || [],
      readBy: [req.user._id],
    });

    // Update conversation
    conversation.lastMessage = text.trim().slice(0, 100);
    conversation.lastMessageAt = new Date();
    conversation.lastSender = req.user._id;

    // Increment unread count for other participants
    const recipientId =
      String(conversation.candidateId) === userIdStr
        ? conversation.employerId
        : conversation.candidateId;

    if (recipientId) {
      const currentUnread = conversation.unreadCounts?.get(String(recipientId)) || 0;
      if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
      conversation.unreadCounts.set(String(recipientId), currentUnread + 1);
    }

    await conversation.save();

    const populatedMsg = await Message.findById(message._id)
      .populate("senderId", "fullName email profileImage role userType")
      .lean();

    // Real-time broadcast via Socket.IO
    try {
      const io = socketService.getIO();
      if (io) {
        io.to(`conversation_${conversationId}`).emit("NEW_MESSAGE", populatedMsg);
        if (recipientId) {
          io.to(`user_${String(recipientId)}`).emit("NEW_MESSAGE", populatedMsg);
        }
      }
    } catch (sockErr) {
      console.warn("Socket broadcast error:", sockErr.message);
    }

    // Send notification to recipient
    if (recipientId) {
      try {
        await notificationService.createNotification({
          recipientId,
          senderId: req.user._id,
          title: `New Message from ${req.user.fullName || "CareerConnect"} 💬`,
          message: text.trim().slice(0, 150),
          notificationType: "NEW_MESSAGE",
          relatedConversationId: conversation._id,
          actionUrl: "/student/dashboard?tab=messages",
          metadata: {
            conversationId: conversation._id,
            senderName: req.user.fullName,
          },
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch message notification:", notifErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: populatedMsg,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/messages/:conversationId/read (Mark conversation as read)
exports.markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userIdStr = String(req.user._id);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (conversation.unreadCounts && conversation.unreadCounts.has(userIdStr)) {
      conversation.unreadCounts.set(userIdStr, 0);
      await conversation.save();
    }

    await Message.updateMany(
      { conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (error) {
    next(error);
  }
};
