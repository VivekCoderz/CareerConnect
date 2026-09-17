const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const NotificationUserState = require("../models/NotificationUserState");
const NotificationReadCursor = require("../models/NotificationReadCursor");
const { registerSseClient, seedWelcomeNotificationsIfEmpty } = require("../services/notificationService");

const accessible = (userId) => ({ $or: [{ recipient: userId }, { recipient: null }] });
const notFound = (res) => res.status(404).json({ success: false, message: "Notification not found." });

const loadAccessible = (id, userId) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Notification.findOne({ _id: id, ...accessible(userId) });
};

const getBroadcastView = async (notification, userId) => {
  const [state, cursor] = await Promise.all([
    NotificationUserState.findOne({ notificationId: notification._id, userId }).lean(),
    NotificationReadCursor.findOne({ userId }).lean(),
  ]);
  if (state?.deletedAt) return null;
  const readAt = state?.readAt ||
    (cursor?.broadcastReadBefore >= notification.createdAt ? cursor.broadcastReadBefore : null);
  return { ...notification.toObject(), isRead: Boolean(readAt), readAt };
};

const markBroadcastRead = async (notification, userId) => {
  const view = await getBroadcastView(notification, userId);
  if (!view || view.isRead) return view;
  view.isRead = true;
  view.readAt = new Date();
  await NotificationUserState.updateOne(
    { userId, notificationId: notification._id, deletedAt: null },
    { $set: { readAt: view.readAt } },
    { upsert: true }
  );
  return view;
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    await seedWelcomeNotificationsIfEmpty(userId);
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
    const cursor = await NotificationReadCursor.findOne({ userId }).lean();
    const cutoff = cursor?.broadcastReadBefore || new Date(0);
    const pipeline = [
      { $match: accessible(userId) },
      { $lookup: {
        from: NotificationUserState.collection.name,
        let: { notificationId: "$_id" },
        pipeline: [{ $match: { $expr: { $and: [
          { $eq: ["$notificationId", "$$notificationId"] },
          { $eq: ["$userId", userId] },
        ] } } }, { $limit: 1 }],
        as: "userState",
      } },
      { $set: { userState: { $first: "$userState" } } },
      { $match: { "userState.deletedAt": null } },
      { $set: {
        readAt: { $cond: [
          { $eq: ["$recipient", null] },
          { $ifNull: ["$userState.readAt", { $cond: [
            { $lte: ["$createdAt", cutoff] }, cutoff, null,
          ] }] },
          "$readAt",
        ] },
        isRead: { $cond: [
          { $eq: ["$recipient", null] },
          { $or: [
            { $ne: [{ $ifNull: ["$userState.readAt", null] }, null] },
            { $lte: ["$createdAt", cutoff] },
          ] },
          "$isRead",
        ] },
      } },
      { $unset: "userState" },
    ];
    const itemFilter = {};
    if (req.query.category && req.query.category !== "all") itemFilter.category = req.query.category;
    if (["true", "false"].includes(req.query.isRead)) itemFilter.isRead = req.query.isRead === "true";
    const filtered = Object.keys(itemFilter).length ? [{ $match: itemFilter }] : [];
    const [result] = await Notification.aggregate([
      ...pipeline,
      { $facet: {
        items: [...filtered, { $sort: { createdAt: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
        total: [...filtered, { $count: "value" }],
        unread: [{ $match: { isRead: false } }, { $count: "value" }],
      } },
    ]);
    const total = result.total[0]?.value || 0;
    res.json({ success: true, notifications: result.items, total,
      unreadCount: result.unread[0]?.value || 0, page, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const notification = await loadAccessible(req.params.id, req.user._id);
    if (!notification) return notFound(res);
    if (notification.recipient) {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
      }
      return res.json({ success: true, notification });
    }
    const view = await markBroadcastRead(notification, req.user._id);
    if (!view) return notFound(res);
    res.json({ success: true, notification: view });
  } catch (err) {
    console.error("Error fetching notification details:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notification." });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await loadAccessible(req.params.id, req.user._id);
    if (!notification) return notFound(res);
    if (notification.recipient) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
      return res.json({ success: true, notification });
    }
    const view = await markBroadcastRead(notification, req.user._id);
    if (!view) return notFound(res);
    res.json({ success: true, notification: view });
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    await Promise.all([
      Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true, readAt: now } }),
      NotificationReadCursor.updateOne({ userId }, { $max: { broadcastReadBefore: now } }, { upsert: true }),
    ]);
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("Error marking all read:", err);
    res.status(500).json({ success: false, message: "Failed to mark all as read." });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await loadAccessible(req.params.id, req.user._id);
    if (!notification) return notFound(res);
    if (notification.recipient) {
      await Notification.deleteOne({ _id: notification._id, recipient: req.user._id });
    } else {
      await NotificationUserState.updateOne(
        { userId: req.user._id, notificationId: notification._id },
        { $set: { deletedAt: new Date() } },
        { upsert: true }
      );
    }
    res.json({ success: true, message: "Notification deleted successfully." });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, message: "Failed to delete notification." });
  }
};

exports.streamNotifications = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
  registerSseClient(req.user._id, res);
};
