import api from "../api/api";
import { acquireSocket, releaseSocket } from "./socket";

/**
 * Fetch paginated notifications with unread counts
 */
export const fetchNotifications = async (params = {}) => {
  const response = await api.get("/notifications", { params });
  return response.data;
};

/**
 * Fetch a specific notification and mark as read
 */
export const fetchNotificationById = async (id) => {
  const response = await api.get(`/notifications/${id}`);
  return response.data;
};

/**
 * Mark a specific notification as read
 */
export const markNotificationRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  const response = await api.put("/notifications/read-all");
  return response.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

/**
 * Live notifications over the shared Socket.IO connection (H17), with light polling
 * while the socket is disconnected. Returns a cleanup function.
 */
export const subscribeToNotifications = (onNotification, onConnected) => {
  let pollInterval = null;
  let lastNotificationId = null;

  const deliver = (notification) => {
    const id = notification?._id;
    if (!id || id === lastNotificationId) return;
    lastNotificationId = id;
    onNotification?.(notification);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  const startPolling = () => {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      try {
        const data = await fetchNotifications({ limit: 5 });
        deliver(data?.notifications?.[0]);
      } catch {
        // A failed poll is retried on the next tick.
      }
    }, 30000);
  };

  const socket = acquireSocket();
  const handleConnect = () => {
    stopPolling();
    onConnected?.();
  };

  socket.on("connect", handleConnect);
  socket.on("connect_error", startPolling);
  socket.on("disconnect", startPolling);
  socket.on("notification", deliver);
  if (socket.connected) handleConnect();

  return () => {
    socket.off("connect", handleConnect);
    socket.off("connect_error", startPolling);
    socket.off("disconnect", startPolling);
    socket.off("notification", deliver);
    stopPolling();
    releaseSocket();
  };
};
