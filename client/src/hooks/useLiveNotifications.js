import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeToNotifications,
} from "../services/notificationService";
import { notificationKey, notificationLink } from "../utils/notificationLink";

/**
 * The signed-in user's notification inbox: loads it, keeps it live over the real-time
 * stream, and handles read / delete / click.
 * @param {(tab: string) => void} [onNavigateTab] - switches tabs on the current dashboard,
 *   used when a notification links to one (e.g. "?tab=interviews")
 */
export default function useLiveNotifications(onNavigateTab) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(
    () =>
      fetchNotifications({ limit: 30 })
        .then((data) => {
          if (!data?.notifications) return;
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch((err) => console.warn("Could not load notifications:", err.message)),
    []
  );

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToNotifications((newNotif) => {
      const id = notificationKey(newNotif);
      setNotifications((prev) => [newNotif, ...prev.filter((item) => notificationKey(item) !== id)]);
      setUnreadCount((c) => c + 1);
    });
    return () => unsubscribe();
  }, [refresh]);

  const markRead = async (notif) => {
    if (notif.isRead) return;
    const id = notificationKey(notif);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (notificationKey(n) === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.warn("Failed to mark read:", e);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn("Failed to mark all read:", e);
    }
  };

  const remove = async (id) => {
    try {
      await deleteNotification(id);
      const removed = notifications.find((n) => notificationKey(n) === String(id));
      setNotifications((prev) => prev.filter((n) => notificationKey(n) !== String(id)));
      if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.warn("Failed to delete notification:", e);
    }
  };

  // Marks the clicked notification read, then opens its page (an application, interview,
  // offer or listing). Returns false when it has no page other than this one, so the inbox
  // shows the message instead.
  const open = (notif) => {
    markRead(notif);
    const target = notificationLink(notif, location.pathname);
    if (!target || target === location.pathname) return false;

    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return true;
    }
    const url = new URL(target, window.location.origin);
    const tab = url.searchParams.get("tab");
    if (tab && url.pathname === location.pathname && onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate(target);
    }
    return true;
  };

  return { notifications, unreadCount, open, markAllRead, remove };
}
