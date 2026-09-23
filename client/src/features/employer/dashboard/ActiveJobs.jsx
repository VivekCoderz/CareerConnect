import React from "react";
import { Briefcase, MapPin, Users, Plus, ChevronRight } from "lucide-react";
import { formatRelativeTime } from "./constants";

const ActiveJobs = ({
  jobs = [],
  loading = false,
  onPostJob,
  onViewJob,
  onViewJobApplications,
  onViewAllJobs,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-32 h-4 bg-slate-100 rounded" />
          <div className="w-16 h-3 bg-slate-100 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 border border-slate-100 rounded-xl space-y-2 animate-pulse">
              <div className="w-32 h-4 bg-slate-100 rounded" />
              <div className="w-24 h-3 bg-slate-100 rounded" />
              <div className="w-16 h-3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exact empty state copy per Section 6
  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Job Openings</h2>
        </div>
        <div className="py-7 text-center">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2.5">
            <Briefcase className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold text-slate-800">No active jobs yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3.5 max-w-xs mx-auto">
            Post your first job to start receiving applications.
          </p>
          <button
            type="button"
            onClick={onPostJob}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Post Job</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Job Openings</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Top {jobs.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewAllJobs}
          className="text-xs font-bold text-[#b45309] hover:text-[#92400e] transition flex items-center gap-1 cursor-pointer"
        >
          <span>All Jobs</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3">
        {jobs.slice(0, 3).map((job) => (
          <div
            key={job.id}
            className="p-3.5 rounded-xl border border-slate-200/90 hover:border-amber-200 bg-white hover:bg-slate-50/50 transition duration-150 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onViewJob && onViewJob(job.id, job)}
                className="font-bold text-xs text-slate-900 hover:text-amber-800 transition text-left cursor-pointer focus:outline-none focus:underline"
              >
                {job.title}
              </button>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize shrink-0">
                {job.status || "active"}
              </span>
            </div>

            {/* Meta: location, type, remote badge */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                {job.location}
              </span>
              <span>•</span>
              <span>{job.type}</span>
              {job.remote ? (
                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold text-[9.5px]">
                  Remote
                </span>
              ) : null}
            </div>

            {/* Bottom Row: applicants count + link */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">
                Posted {formatRelativeTime(job.postedAt)}
              </span>
              <button
                type="button"
                onClick={() => onViewJobApplications && onViewJobApplications(job.id, job)}
                className="inline-flex items-center gap-1.5 font-bold text-[11px] text-amber-800 hover:text-amber-950 transition cursor-pointer"
              >
                <Users className="w-3 h-3" aria-hidden="true" />
                <span>{job.applicantsCount} Applications</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveJobs;
