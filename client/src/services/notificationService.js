import api from "../api/api";

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
 * Real-time SSE subscription with auto-reconnect and polling fallback
 */
export const subscribeToNotifications = (onNotification, onConnected) => {
  const baseURL = (api.defaults.baseURL || "http://localhost:5000/api").replace(/\/+$/, "");
  const streamUrl = `${baseURL}/notifications/stream`;

  let eventSource = null;
  let pollInterval = null;

  try {
    eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.addEventListener("connected", (e) => {
      if (onConnected) onConnected();
    });

    eventSource.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onNotification) onNotification(data);
      } catch (err) {
        console.warn("Could not parse notification stream:", err);
      }
    });

    eventSource.onerror = () => {
      // If SSE disconnects, gracefully fallback to light polling
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          try {
            const data = await fetchNotifications({ limit: 5 });
            if (data?.notifications?.[0] && onNotification) {
              onNotification(data.notifications[0]);
            }
          } catch (e) {
            // silent poll fail
          }
        }, 30000);
      }
    };
  } catch (err) {
    console.warn("EventSource not supported, using polling fallback");
    pollInterval = setInterval(async () => {
      try {
        const data = await fetchNotifications({ limit: 5 });
        if (data?.notifications?.[0] && onNotification) {
          onNotification(data.notifications[0]);
        }
      } catch (e) {
        // silent
      }
    }, 30000);
  }

  // Return cleanup function
  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
};
