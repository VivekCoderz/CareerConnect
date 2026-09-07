import React, { useState, useMemo } from "react";
import InterviewScorecardModal from "./InterviewScorecardModal";
import InterviewScheduleModal from "./InterviewScheduleModal";
import CandidateInterviewHistoryModal from "./CandidateInterviewHistoryModal";
import recruitmentService from "../../services/recruitmentService";

const InterviewManagementHub = ({
  interviews = [],
  stats = null,
  jobs = [],
  onRefresh,
  showToast,
  onOpenOfferModal = null,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roundFilter, setRoundFilter] = useState("All");
  const [sortBy, setSortBy] = useState("upcoming");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modals state
  const [scorecardInterview, setScorecardInterview] = useState(null);
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [rescheduleInterview, setRescheduleInterview] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Status badges
  const getStatusBadge = (status) => {
    switch (status) {
      case "Scheduled":
        return { label: "Scheduled", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: "📅" };
      case "In Progress":
        return { label: "In Progress", bg: "bg-amber-50 text-amber-800 border-amber-300", icon: "⏳" };
      case "Completed":
        return { label: "Completed", bg: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✓" };
      case "Rescheduled":
        return { label: "Rescheduled", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: "🔄" };
      case "Cancelled":
        return { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: "✕" };
      default:
        return { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200", icon: "📌" };
    }
  };

  // Metrics computation
  const calculatedStats = useMemo(() => {
    if (stats) return stats;
    const total = interviews.length;
    const scheduled = interviews.filter((i) => i.status === "Scheduled").length;
    const completed = interviews.filter((i) => i.status === "Completed").length;
    const rescheduled = interviews.filter((i) => i.status === "Rescheduled").length;
    const cancelled = interviews.filter((i) => i.status === "Cancelled").length;

    const scored = interviews.filter((i) => i.status === "Completed" && i.feedback?.overallScore > 0);
    const avgScore = scored.length > 0
      ? (scored.reduce((acc, curr) => acc + (curr.feedback?.overallScore || 0), 0) / scored.length).toFixed(1)
      : "0.0";

    const recommendedHire = interviews.filter((i) =>
      ["Hire / Select", "Strong Hire"].includes(i.feedback?.recommendation)
    ).length;

    return {
      total,
      scheduled,
      completed,
      rescheduled,
      cancelled,
      avgScore: Number(avgScore),
      recommendedHire,
    };
  }, [interviews, stats]);

  // Filtered & Sorted Interviews
  const filteredInterviews = useMemo(() => {
    return interviews
      .filter((item) => {
        // Status filter
        if (statusFilter !== "All" && item.status !== statusFilter) return false;

        // Round filter
        if (roundFilter !== "All" && String(item.roundNumber) !== String(roundFilter)) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const candName = item.candidateId?.fullName?.toLowerCase() || "";
          const candEmail = item.candidateId?.email?.toLowerCase() || "";
          const jobTitle = item.jobId?.title?.toLowerCase() || "";
          const intName = item.interviewerName?.toLowerCase() || "";
          const roundName = item.roundName?.toLowerCase() || "";
          return candName.includes(q) || candEmail.includes(q) || jobTitle.includes(q) || intName.includes(q) || roundName.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "upcoming") {
          return new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0);
        } else if (sortBy === "newest") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        } else if (sortBy === "highestScore") {
          return (b.feedback?.overallScore || 0) - (a.feedback?.overallScore || 0);
        }
        return 0;
      });
  }, [interviews, statusFilter, roundFilter, searchQuery, sortBy]);

  // Actions
  const handleScorecardSubmit = async (interviewId, payload) => {
    try {
      setActionLoading(true);
      await recruitmentService.submitInterviewFeedback(interviewId, payload);
      if (showToast) showToast("Scorecard and feedback evaluation recorded!");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to submit scorecard", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (interviewId, payload) => {
    try {
      setActionLoading(true);
      await recruitmentService.rescheduleInterview(interviewId, payload);
      if (showToast) showToast("Interview slot successfully rescheduled!");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to reschedule", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInterview = async (interviewId) => {
    const reason = window.prompt("Please provide a reason for cancelling this interview slot:");
    if (reason === null) return;

    try {
      setActionLoading(true);
      await recruitmentService.cancelInterview(interviewId, { cancelledReason: reason || "Cancelled by recruiter" });
      if (showToast) showToast("Interview slot has been cancelled.");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to cancel interview", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleNextRound = (candidate) => {
    // Open schedule modal prefilled for candidate
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interview Scheduling & Scorecards</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule multi-round interviews, assign evaluators, and record structured competency scorecards
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsScheduleModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition"
        >
          <span className="text-sm font-black">+</span> Schedule New Interview
        </button>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div
          onClick={() => setStatusFilter("All")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "All" ? "border-slate-800 ring-2 ring-slate-800/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Slots</span>
            <span className="text-sm">📁</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{calculatedStats.total}</p>
          <span className="text-[10px] text-slate-400 font-medium">All interview rounds</span>
        </div>

        {/* Scheduled / Upcoming */}
        <div
          onClick={() => setStatusFilter("Scheduled")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Scheduled" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming</span>
            <span className="text-sm">🕒</span>
          </div>
          <p className="text-2xl font-black text-blue-700">{calculatedStats.scheduled}</p>
          <span className="text-[10px] text-blue-600 font-medium">Pending evaluation</span>
        </div>

        {/* Completed */}
        <div
          onClick={() => setStatusFilter("Completed")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Completed" ? "border-emerald-600 ring-2 ring-emerald-600/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <span className="text-sm">✓</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{calculatedStats.completed}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Scorecard recorded</span>
        </div>

        {/* Average Score */}
        <div className="p-4 rounded-3xl bg-amber-500/5 border border-amber-300/80">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Score</span>
            <span className="text-sm">★</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-amber-900 font-mono">{calculatedStats.avgScore}</p>
            <span className="text-xs text-amber-700 font-bold">/ 5.0</span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Across all candidates</span>
        </div>

        {/* Recommended for Hire */}
        <div className="p-4 rounded-3xl bg-teal-500/5 border border-teal-300/80">
          <div className="flex items-center justify-between text-teal-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cleared & Hire</span>
            <span className="text-sm">🎯</span>
          </div>
          <p className="text-2xl font-black text-teal-800">{calculatedStats.recommendedHire}</p>
          <span className="text-[10px] text-teal-700 font-medium">Ready for offer letter</span>
        </div>

        {/* Rescheduled / Cancelled */}
        <div
          onClick={() => setStatusFilter("Rescheduled")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Rescheduled" ? "border-purple-500 ring-2 ring-purple-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rescheduled</span>
            <span className="text-sm">🔄</span>
          </div>
          <p className="text-2xl font-black text-purple-700">{calculatedStats.rescheduled}</p>
          <span className="text-[10px] text-purple-600 font-medium">{calculatedStats.cancelled} cancelled</span>
        </div>
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, interviewer, round name, or position..."
              className="w-full h-10 pl-9 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#1e3a8a] transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Round Filter */}
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-[#1e3a8a]"
            >
              <option value="All">All Interview Rounds</option>
              <option value="1">Round 1 (Technical)</option>
              <option value="2">Round 2 (Coding)</option>
              <option value="3">Round 3 (System Design)</option>
              <option value="4">Round 4 (Managerial)</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-[#1e3a8a]"
            >
              <option value="upcoming">Sort: Schedule Date (Soonest)</option>
              <option value="newest">Sort: Newest First</option>
              <option value="highestScore">Sort: Highest Score</option>
            </select>

            {/* View Mode */}
            <div className="h-10 p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ⊞ Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ☰ Table
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          {[
            { id: "All", label: "All Slots" },
            { id: "Scheduled", label: "📅 Scheduled" },
            { id: "Completed", label: "✓ Completed & Scored" },
            { id: "Rescheduled", label: "🔄 Rescheduled" },
            { id: "Cancelled", label: "✕ Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* DISPLAY LIST */}
      {filteredInterviews.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl font-bold">
            📅
          </div>
          <h4 className="text-base font-bold text-slate-900">No Interviews Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== "All"
              ? "No interview slots match your search query or selected filters."
              : "No interviews have been scheduled yet. Select shortlisted candidates from your ATS pipeline to schedule Round 1."}
          </p>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition inline-block mt-2"
          >
            + Schedule First Interview
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInterviews.map((item) => {
            const badge = getStatusBadge(item.status);
            const cand = item.candidateId || {};
            const isCompleted = item.status === "Completed";
            const feedback = item.feedback || {};
            const ratings = feedback.ratings || {};

            return (
              <div
                key={item._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header & Candidate Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 font-black text-sm flex items-center justify-center">
                        {cand.fullName ? cand.fullName.charAt(0) : "C"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {cand.fullName || "Candidate"}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {item.jobId?.title || "Position"} • {item.jobId?.department || "Dept"}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border inline-flex items-center gap-1 ${badge.bg}`}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Round & Mode Info */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">
                        {item.roundName || `Round ${item.roundNumber}`}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {item.interviewType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>📅 {item.scheduledDate}</span>
                      <span className="font-bold text-slate-800">{item.scheduledTime}</span>
                    </div>
                  </div>

                  {/* Assigned Interviewer */}
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Interviewer: <strong className="text-slate-800">{item.interviewerName}</strong></span>
                    <span className="text-[10.5px] text-slate-400 font-medium">{item.durationMinutes} mins</span>
                  </div>

                  {/* If Completed, Scorecard Summary */}
                  {isCompleted ? (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900">Scorecard Verdict:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-700 font-mono">
                            ★ {feedback.overallScore || "0"}/5.0
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white">
                            {feedback.recommendation || "Completed"}
                          </span>
                        </div>
                      </div>

                      {/* Criteria Mini Bar */}
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600 font-medium">
                        <span>Tech: {ratings.technicalSkills || "-"}/5</span>
                        <span>Coding: {ratings.problemSolving || "-"}/5</span>
                        <span>Comm: {ratings.communication || "-"}/5</span>
                      </div>
                    </div>
                  ) : (
                    /* Video Call Link */
                    item.meetingLink && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                        <span className="text-slate-600 font-medium">{item.meetingMode}</span>
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#1e3a8a] hover:underline inline-flex items-center gap-1"
                        >
                          Join Call →
                        </a>
                      </div>
                    )
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScorecardInterview(item)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                        isCompleted
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                          : "bg-[#f59e0b] hover:bg-[#d97706] text-white"
                      }`}
                    >
                      <span>📝</span>
                      <span>{isCompleted ? "View / Edit Scorecard" : "Evaluate & Score"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHistoryCandidate(cand)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      title="View Multi-Round History"
                    >
                      📊
                    </button>
                  </div>

                  {/* Sub-actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isCompleted && item.status !== "Cancelled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRescheduleInterview(item)}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition text-center"
                        >
                          🔄 Reschedule
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleCancelInterview(item._id)}
                          className="flex-1 py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10.5px] font-bold transition text-center"
                        >
                          ✕ Cancel
                        </button>
                      </>
                    )}

                    {isCompleted && feedback.recommendation === "Move to Next Round" && (
                      <button
                        type="button"
                        onClick={() => handleScheduleNextRound(cand)}
                        className="w-full py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 text-[11px] font-bold transition text-center"
                      >
                        + Schedule Next Round
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11.5px] font-bold text-slate-700">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Round & Type</th>
                  <th className="py-3 px-4">Interviewer</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInterviews.map((item) => {
                  const badge = getStatusBadge(item.status);
                  const cand = item.candidateId || {};
                  const feedback = item.feedback || {};
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cand.fullName || "Candidate"}</div>
                        <div className="text-[11px] text-slate-500">{item.jobId?.title || "Role"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.roundName || `Round ${item.roundNumber}`}</div>
                        <div className="text-[11px] text-indigo-700 font-medium">{item.interviewType}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{item.interviewerName}</div>
                        <div className="text-[11px] text-slate-500">{item.meetingMode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{item.scheduledDate}</div>
                        <div className="text-[11px] text-slate-500">{item.scheduledTime}</div>
                      </td>
                      <td className="py-3 px-4">
                        {item.status === "Completed" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-700 font-mono">★ {feedback.overallScore}/5</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border inline-flex items-center gap-1 ${badge.bg}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setScorecardInterview(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#f59e0b] text-white text-[11px] font-bold hover:bg-[#d97706] transition"
                          >
                            Scorecard
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryCandidate(cand)}
                            className="p-1 px-2 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition"
                            title="Candidate History"
                          >
                            📊
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Scorecard Modal */}
      <InterviewScorecardModal
        isOpen={Boolean(scorecardInterview)}
        onClose={() => setScorecardInterview(null)}
        interview={scorecardInterview}
        onSubmitScorecard={handleScorecardSubmit}
      />

      {/* 2. Schedule New Interview Modal */}
      <InterviewScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={async (payload) => {
          await recruitmentService.scheduleInterview(payload);
          if (showToast) showToast("Interview scheduled successfully!");
          if (onRefresh) onRefresh();
        }}
        jobs={jobs}
      />

      {/* 3. Reschedule Slot Modal */}
      <InterviewScheduleModal
        isOpen={Boolean(rescheduleInterview)}
        onClose={() => setRescheduleInterview(null)}
        interviewToReschedule={rescheduleInterview}
        onReschedule={handleRescheduleSubmit}
        jobs={jobs}
      />

      {/* 4. Candidate Multi-Round History Modal */}
      <CandidateInterviewHistoryModal
        isOpen={Boolean(historyCandidate)}
        onClose={() => setHistoryCandidate(null)}
        candidate={historyCandidate}
        onScheduleNextRound={handleScheduleNextRound}
      />
    </div>
  );
};

export default InterviewManagementHub;
