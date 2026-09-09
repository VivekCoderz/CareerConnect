const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null means broadcast / visible to all users
      index: true,
    },
    sender: {
      type: String,
      default: "CareerConnect AI Assistant",
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
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["job", "internship", "course", "ai_recommendation", "system"],
      default: "ai_recommendation",
      index: true,
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
      company: String,
      location: String,
      stipend: String,
      salary: String,
      skills: [String],
      matchScore: Number,
      workMode: String,
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

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
