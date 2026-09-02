import { useState } from "react";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  interview: {
    label: "Interview Scheduled 📅",
    color: "bg-purple-100 text-purple-900 border-purple-200",
  },
  review: {
    label: "Under Review ⏳",
    color: "bg-amber-100 text-amber-900 border-amber-200",
  },
  shortlisted: {
    label: "Shortlisted 🎯",
    color: "bg-blue-100 text-blue-900 border-blue-200",
  },
  external: {
    label: "Application Started 🌐",
    color: "bg-slate-100 text-slate-800 border-slate-200",
  },
  selected: {
    label: "Offer Extended 🎉",
    color: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
};

const ProfessionalApplicationsView = ({
  applications = [],
  stats = { applied: 4, underReview: 2, shortlisted: 1, interview: 1 },
  onExploreOpportunities,
}) => {
  const [filterType, setFilterType] = useState("all"); // "all", "direct", "external"
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredList = applications.filter((app) => {
    if (filterType === "direct" && app.source !== "direct") return false;
    if (filterType === "external" && app.source !== "external") return false;
    if (filterStatus !== "all") {
      if (filterStatus === "interview" && !app.status?.toLowerCase().includes("interview")) return false;
      if (filterStatus === "review" && !app.status?.toLowerCase().includes("review")) return false;
      if (filterStatus === "shortlisted" && !app.status?.toLowerCase().includes("shortlist")) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Applications Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track and manage your confidential senior transitions across direct and external portals.
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreOpportunities}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs shadow-purple-600/20 self-start md:self-center shrink-0"
        >
          Explore More Opportunities →
        </button>
      </div>

      {/* 4 Pipeline Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs text-center">
          <span className="text-2xl font-extrabold text-slate-900">{stats.applied}</span>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
            Total Applied
          </span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-xs text-center bg-amber-50/40">
          <span className="text-2xl font-extrabold text-amber-800">{stats.underReview}</span>
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mt-0.5">
            Under Review
          </span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-xs text-center bg-blue-50/40">
          <span className="text-2xl font-extrabold text-blue-800">{stats.shortlisted}</span>
          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mt-0.5">
            Shortlisted
          </span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-purple-200 shadow-xs text-center bg-purple-50/40">
          <span className="text-2xl font-extrabold text-purple-900">{stats.interview}</span>
          <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mt-0.5">
            Interview Scheduled
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Sources ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("direct")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "direct" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🟢 CareerConnect Direct ({applications.filter((a) => a.source === "direct").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("external")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "external" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🔵 External Portals ({applications.filter((a) => a.source === "external").length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="review">Under Review</option>
            <option value="interview">Interview Scheduled</option>
            <option value="shortlisted">Shortlisted</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredList.map((app) => {
          const isDirect = app.source === "direct";
          const statusStyle =
            STATUS_CONFIG[app.statusType] ||
            (app.status?.toLowerCase().includes("interview")
              ? STATUS_CONFIG.interview
              : app.status?.toLowerCase().includes("shortlist")
              ? STATUS_CONFIG.shortlisted
              : app.status?.toLowerCase().includes("external")
              ? STATUS_CONFIG.external
              : STATUS_CONFIG.review);

          return (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-purple-200 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{app.title}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDirect
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}
                  >
                    {isDirect ? "🟢 CareerConnect Direct" : "🔵 Applied on Company Portal"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="font-bold text-purple-700">{app.company}</span>
                  <span>·</span>
                  <span>Applied on {app.appliedDate || "Sep 2, 2026"}</span>
                  {app.location && (
                    <>
                      <span>·</span>
                      <span>{app.location}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="text-slate-400">📄 Executive_Resume.pdf attached</span>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusStyle.color}`}>
                  {app.status || statusStyle.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfessionalApplicationsView;
