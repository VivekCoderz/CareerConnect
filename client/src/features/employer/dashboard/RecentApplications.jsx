import React from "react";
import { Users, ChevronRight } from "lucide-react";
import { STAGE_BADGE_STYLES, STAGE_DISPLAY_NAMES, formatRelativeTime } from "./constants";

const RecentApplications = ({
  applications = [],
  loading = false,
  onCandidateClick,
  onJobClick,
  onViewAll,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-36 h-4 bg-slate-100 rounded" />
          <div className="w-16 h-3 bg-slate-100 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100" />
                <div className="space-y-1">
                  <div className="w-28 h-3.5 bg-slate-100 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="w-16 h-5 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exact empty state copy per Section 6
  if (!applications || applications.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Applications</h2>
        </div>
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2.5">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold text-slate-800">No applications yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">They'll appear here as candidates apply.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Applications</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {applications.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-bold text-[#b45309] hover:text-[#92400e] transition flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Desktop & Tablet Table (≥780px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Recent Applications Table">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th scope="col" className="pb-2.5 font-bold">Candidate</th>
              <th scope="col" className="pb-2.5 font-bold">Applied Role</th>
              <th scope="col" className="pb-2.5 font-bold">Applied</th>
              <th scope="col" className="pb-2.5 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {applications.slice(0, 6).map((app) => {
              const stageKey = (app.status || "applied").toLowerCase();
              const badgeStyle = STAGE_BADGE_STYLES[stageKey] || "bg-slate-100 text-slate-700 border-slate-200";
              const stageLabel = STAGE_DISPLAY_NAMES[stageKey] || app.status || "Applied";

              return (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onCandidateClick && onCandidateClick(app.candidateId, app)}
                      className="font-bold text-slate-900 hover:text-amber-800 transition text-left cursor-pointer focus:outline-none focus:underline"
                    >
                      {app.candidateName || "Applicant"}
                    </button>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onJobClick && onJobClick(app.jobId, app)}
                      className="text-slate-600 hover:text-slate-900 transition text-left line-clamp-1 max-w-[200px] cursor-pointer focus:outline-none focus:underline"
                    >
                      {app.jobTitle || "Position"}
                    </button>
                  </td>
                  <td className="py-3 text-slate-400 font-medium whitespace-nowrap">
                    {formatRelativeTime(app.appliedAt)}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
                      {stageLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List (<780px) */}
      <div className="md:hidden space-y-2.5 divide-y divide-slate-100">
        {applications.slice(0, 6).map((app) => {
          const stageKey = (app.status || "applied").toLowerCase();
          const badgeStyle = STAGE_BADGE_STYLES[stageKey] || "bg-slate-100 text-slate-700 border-slate-200";
          const stageLabel = STAGE_DISPLAY_NAMES[stageKey] || app.status || "Applied";

          return (
            <div key={app.id} className="pt-2.5 first:pt-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onCandidateClick && onCandidateClick(app.candidateId, app)}
                  className="font-bold text-xs text-slate-900 hover:text-amber-800 text-left"
                >
                  {app.candidateName || "Applicant"}
                </button>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                  {stageLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => onJobClick && onJobClick(app.jobId, app)}
                  className="hover:text-slate-900 text-left line-clamp-1"
                >
                  {app.jobTitle || "Position"}
                </button>
                <span className="text-slate-400 shrink-0 ml-2">
                  {formatRelativeTime(app.appliedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentApplications;
