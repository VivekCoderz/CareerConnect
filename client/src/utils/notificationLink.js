import { safeHttpUrl } from "./safeUrl";

/** One stable id per notification (API rows use _id, some older payloads use id). */
export const notificationKey = (notification) => String(notification?._id || notification?.id || "");

/**
 * Where clicking a notification should take the user: an in-app path ("/applications",
 * "/student/dashboard?tab=interviews", "/jobs/<id>"), an http(s) URL, or null when it has
 * no page of its own and should be read in the inbox instead.
 * @param {object} notification
 * @param {string} dashboardPath - the dashboard the user is on, for older interview rows saved without a link
 */
export const notificationLink = (notification, dashboardPath = "/student/dashboard") => {
  const link = (notification?.actionUrl || notification?.link || "").trim();
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  if (link) return safeHttpUrl(link) || null;
  if (notification?.notificationType?.startsWith("INTERVIEW_") || notification?.relatedInterviewId) {
    return `${dashboardPath}?tab=interviews`;
  }
  if (notification?.notificationType === "APPLICATION_STATUS") return "/applications";
  return null;
};
