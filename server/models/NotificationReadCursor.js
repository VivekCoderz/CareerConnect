const mongoose = require("mongoose");

const notificationReadCursorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  broadcastReadBefore: { type: Date, required: true },
});

module.exports = mongoose.model("NotificationReadCursor", notificationReadCursorSchema);
