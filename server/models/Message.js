const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "fresher", "professional", "employer", "admin", "SUPER_ADMIN", "COMPANY_ADMIN"],
      default: "student",
    },
    senderName: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: 5000,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
