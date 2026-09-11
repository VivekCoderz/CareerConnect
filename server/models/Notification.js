const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    notificationType: {
      type: String,
      enum: [
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_RESCHEDULED",
        "INTERVIEW_CANCELLED",
        "INTERVIEW_COMPLETED",
        "INTERVIEW_RESULT",
        "APPLICATION_STATUS",
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
    actionUrl: {
      type: String,
      default: "",
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

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
