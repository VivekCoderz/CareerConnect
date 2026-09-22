const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Support both recipient (develop) and recipientId (interviews/admin)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null means broadcast / visible to all users
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sender: {
      type: String,
      default: "CareerConnect AI Assistant",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderRole: {
      type: String,
      enum: ["ai", "employer", "system", "admin"],
      default: "ai",
    },
    senderAvatar: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    preview: {
      type: String,
      trim: true,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "ai_recommendation",
      index: true,
    },
    notificationType: {
      type: String,
      enum: [
        "APPLICATION_RECEIVED",
        "APPLICATION_STATUS",
        "CANDIDATE_SHORTLISTED",
        "ASSESSMENT_ASSIGNED",
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_RESCHEDULED",
        "INTERVIEW_CANCELLED",
        "INTERVIEW_COMPLETED",
        "INTERVIEW_RESULT",
        "OFFER_RECEIVED",
        "OFFER_ACCEPTED",
        "OFFER_REJECTED",
        "OFFER_WITHDRAWN",
        "NEW_MESSAGE",
        "VERIFICATION_APPROVED",
        "VERIFICATION_REJECTED",
        "VERIFICATION_CHANGES_REQUESTED",
        "SYSTEM_ANNOUNCEMENT",
        "GENERAL",
      ],
      default: "GENERAL",
      index: true,
    },
    relatedInterviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      default: null,
    },
    relatedApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    relatedOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOffer",
      default: null,
    },
    relatedConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    relatedEntityId: {
      type: String,
      default: null,
    },
    actionUrl: {
      type: String,
      default: null,
    },
    actionText: {
      type: String,
      default: "View Details ›",
    },
    relatedId: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Fallback population / synchronization before save
notificationSchema.pre("save", function () {
  if (this.recipient && !this.recipientId) {
    this.recipientId = this.recipient;
  } else if (this.recipientId && !this.recipient) {
    this.recipient = this.recipientId;
  }

  if (this.preview && !this.message) {
    this.message = this.preview;
  } else if (this.message && !this.preview) {
    this.preview = this.message;
  }

  if (!this.content && (this.message || this.preview)) {
    this.content = this.message || this.preview;
  }
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
