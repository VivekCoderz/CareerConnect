import React from "react";
import { Activity } from "lucide-react";
import { formatRelativeTime } from "./constants";

const ActivityFeed = ({ activity = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="w-32 h-4 bg-slate-100 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="w-3/4 h-3.5 bg-slate-100 rounded" />
                <div className="w-1/4 h-2.5 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exact empty state copy per Section 6
  if (!activity || activity.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h2>
        </div>
        <div className="py-6 text-center">
          <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Activity className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-slate-500">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {activity.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-slate-100">
        {activity.slice(0, 8).map((event) => (
          <div key={event.id} className="relative flex items-start gap-3 pl-0 text-xs">
            <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-amber-800">
              {event.actorName?.[0] || "A"}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-slate-700 font-medium leading-relaxed">
                <span className="font-bold text-slate-900">{event.actorName}</span>{" "}
                {event.message}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                <span>{event.type}</span>
                <span>•</span>
                <span>{formatRelativeTime(event.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
