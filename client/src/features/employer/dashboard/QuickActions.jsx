import React from "react";
import { Plus, Briefcase, Users, Calendar, GitPullRequest } from "lucide-react";

const QuickActions = ({
  onPostJob,
  onPostInternship,
  onViewApplications,
  onScheduleInterview,
  onViewPipeline,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Quick Actions">
      {/* Primary Action: Post Job */}
      <button
        type="button"
        id="quick-action-post-job"
        onClick={onPostJob}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
        <span>Post Job</span>
      </button>

      {/* Post Internship */}
      <button
        type="button"
        id="quick-action-post-internship"
        onClick={onPostInternship}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
      >
        <Briefcase className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>Post Internship</span>
      </button>

      {/* View Applications */}
      <button
        type="button"
        id="quick-action-view-applications"
        onClick={onViewApplications}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
      >
        <Users className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>View Applications</span>
      </button>

      {/* Schedule Interview */}
      <button
        type="button"
        id="quick-action-schedule-interview"
        onClick={onScheduleInterview}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>Schedule Interview</span>
      </button>

      {/* View ATS Pipeline */}
      <button
        type="button"
        id="quick-action-view-pipeline"
        onClick={onViewPipeline}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
      >
        <GitPullRequest className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>View ATS Pipeline</span>
      </button>
    </div>
  );
};

export default QuickActions;
