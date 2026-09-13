import React from "react";
import { Briefcase, GraduationCap, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const OpportunityOverview = ({ opportunities = {} }) => {
  const jobs = opportunities.jobs || {
    total: 0,
    published: 0,
    pendingApproval: 0,
    draft: 0,
    closed: 0,
  };

  const internships = opportunities.internships || {
    total: 0,
    published: 0,
    pendingApproval: 0,
    draft: 0,
    closed: 0,
  };

  const totalOpps = (jobs.total || 0) + (internships.total || 0);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Opportunity Overview</h3>
          <p className="text-xs text-slate-400">Published and active hiring postings</p>
        </div>
        <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-lg">
          {totalOpps} Total Postings
        </span>
      </div>

      {/* Jobs vs Internships Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jobs Column */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Jobs</span>
            </div>
            <Link
              to="/opportunities"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              Browse
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {(jobs.total || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">total listings</span>
          </div>

          {/* Status Breakdown Pills */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Published</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                {(jobs.published || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Pending</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                {(jobs.pendingApproval || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Drafts</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                {(jobs.draft || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Closed</span>
              <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                {(jobs.closed || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Internships Column */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Internships</span>
            </div>
            <Link
              to="/internships"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 shrink-0"
            >
              Browse
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {(internships.total || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">total listings</span>
          </div>

          {/* Status Breakdown Pills */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Published</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                {(internships.published || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Pending</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                {(internships.pendingApproval || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Drafts</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                {(internships.draft || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Closed</span>
              <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                {(internships.closed || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityOverview;
