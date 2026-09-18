const mongoose = require("mongoose");

const notificationUserStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: "Notification", required: true },
  readAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
});

notificationUserStateSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

module.exports = mongoose.model("NotificationUserState", notificationUserStateSchema);
