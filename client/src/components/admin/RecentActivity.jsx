import React from "react";
import {
  UserPlus,
  Briefcase,
  GraduationCap,
  FileText,
  Calendar,
  Activity,
  Clock,
} from "lucide-react";

/**
 * Format relative time
 */
function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const RecentActivity = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case "USER_REGISTERED":
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case "JOB_POSTED":
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      case "INTERNSHIP_POSTED":
        return <GraduationCap className="w-4 h-4 text-teal-600" />;
      case "APPLICATION_SUBMITTED":
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case "INTERVIEW_SCHEDULED":
        return <Calendar className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Recent Platform Activity</h3>
          <p className="text-xs text-slate-400">Live feed across users, postings, applications & interviews</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>Real-time</span>
        </div>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No platform activities logged yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((item) => (
            <div
              key={item.id}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-8 h-8 rounded-xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center shrink-0">
                  {getActivityIcon(item.type)}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-400">{item.entity} Telemetry</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    {item.badge}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
