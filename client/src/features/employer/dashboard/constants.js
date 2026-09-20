/**
 * Badge color map as ONE shared constant (Section 5 requirements):
 * applied slate · shortlisted blue · assessment amber · interview indigo ·
 * offer teal · hired green · rejected red · withdrawn gray.
 */
export const STAGE_BADGE_STYLES = {
  applied: "bg-slate-100 text-slate-700 border-slate-200",
  shortlisted: "bg-blue-50 text-blue-700 border-blue-200",
  assessment: "bg-amber-50 text-amber-700 border-amber-200",
  interview: "bg-indigo-50 text-indigo-700 border-indigo-200",
  offer: "bg-teal-50 text-teal-700 border-teal-200",
  hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
};

export const STAGE_DISPLAY_NAMES = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/**
 * Computes human-readable relative time from server timestamp without hardcoded strings
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "—";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

/**
 * Formats interview schedule date and time
 */
export const formatScheduleDateTime = (isoDateString) => {
  if (!isoDateString) return "—";
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return "—";
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return `${dateStr} • ${timeStr}`;
  } catch {
    return "—";
  }
};
