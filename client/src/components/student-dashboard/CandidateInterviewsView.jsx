import React, { useState, useEffect, useMemo } from "react";
import recruitmentService from "../../services/recruitmentService";

const CandidateInterviewsView = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "history"
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "completed" | "cancelled"
  const [selectedInterview, setSelectedInterview] = useState(null);

  const fetchCandidateInterviews = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await recruitmentService.getInterviews();
      setInterviews(res.interviews || []);
    } catch (err) {
      console.error("Failed to load student interviews:", err);
      setError(err.response?.data?.message || err.message || "Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidateInterviews();
  }, []);

  // Filter groups
  const upcomingInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const s = (item.status || "").toLowerCase();
      return s === "scheduled" || s === "rescheduled";
    });
  }, [interviews]);

  const historyInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const s = (item.status || "").toLowerCase();
      if (s !== "completed" && s !== "cancelled" && s !== "no_show") return false;
      if (historyFilter === "completed") return s === "completed";
      if (historyFilter === "cancelled") return s === "cancelled";
      return true;
    });
  }, [interviews, historyFilter]);

  const totalUpcoming = upcomingInterviews.length;
  const totalCompleted = interviews.filter(
    (i) => (i.status || "").toLowerCase() === "completed"
  ).length;
  const totalCancelled = interviews.filter(
    (i) => (i.status || "").toLowerCase() === "cancelled"
  ).length;
  const totalPassed = interviews.filter(
    (i) => (i.result || "").toLowerCase() === "passed"
  ).length;

  const getStatusBadge = (status, result) => {
    const s = (status || "").toLowerCase();
    const r = (result || "").toLowerCase();

    if (s === "cancelled") {
      return {
        label: "Cancelled",
        cls: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        icon: "✕",
      };
    }

    if (r === "passed") {
      return {
        label: "Round Cleared ✓",
        cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        icon: "🏆",
      };
    }
    if (r === "failed") {
      return {
        label: "Round Not Cleared",
        cls: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        icon: "❌",
      };
    }

    switch (s) {
      case "scheduled":
        return {
          label: "Scheduled",
          cls: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
          icon: "📅",
        };
      case "rescheduled":
        return {
          label: "Rescheduled",
          cls: "bg-purple-50 text-purple-700 border-purple-200 font-bold",
          icon: "🔄",
        };
      case "completed":
        return {
          label: "Completed",
          cls: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          icon: "✓",
        };
      default:
        return {
          label: status,
          cls: "bg-slate-50 text-slate-700 border-slate-200 font-bold",
          icon: "📌",
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#1e3a8a] to-blue-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-semibold tracking-wider uppercase text-blue-200 border border-white/10">
            <span>🎙️</span> Campus Placement & Recruiter Interviews
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            My Interview Center
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
            Track upcoming rounds, join live video meeting rooms, review interviewer guidelines, and monitor your past interview history in real time.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Total Slots</span>
              <span className="text-2xl font-black text-white">{interviews.length}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Upcoming</span>
              <span className="text-2xl font-black text-amber-300">{totalUpcoming}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Completed</span>
              <span className="text-2xl font-black text-blue-200">{totalCompleted}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Rounds Cleared</span>
              <span className="text-2xl font-black text-emerald-300">{totalPassed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation: Upcoming vs Past History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>🕒 Upcoming Interviews</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === "upcoming" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalUpcoming}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>📜 Past / Interview History</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalCompleted + totalCancelled}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "history" && (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setHistoryFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  historyFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("completed")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  historyFilter === "completed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Completed ({totalCompleted})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("cancelled")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  historyFilter === "cancelled" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cancelled ({totalCancelled})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={fetchCandidateInterviews}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading interview details...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchCandidateInterviews}
            className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold"
          >
            Retry
          </button>
        </div>
      ) : activeTab === "upcoming" ? (
        /* UPCOMING INTERVIEWS TAB */
        upcomingInterviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 text-2xl flex items-center justify-center mx-auto">
              📅
            </div>
            <h3 className="text-base font-bold text-slate-900">No Upcoming Interviews Scheduled</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You do not have any pending interview rounds right now. When employers shortlist your applications and schedule an interview slot, it will appear here with the live meeting link.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingInterviews.map((item) => {
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Full-time Job";
              const statusLower = (item.status || "").toLowerCase();
              const badge = getStatusBadge(item.status, item.result);

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Role & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {roleType}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {item.roundName || `Round ${item.roundNumber}`}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">
                          {roleTitle}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {item.jobId?.department || "Technology Department"}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] border inline-flex items-center gap-1 ${badge.cls}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Date & Time Slot Box */}
                    <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">📅 Scheduled Date</span>
                        <strong className="text-slate-900 font-bold">{item.scheduledDate}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">🕒 Time Slot</span>
                        <strong className="text-slate-900 font-mono font-bold">{item.scheduledTime || item.startTime}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">⌛ Duration & Mode</span>
                        <span className="text-slate-700 font-medium">
                          {item.durationMinutes || item.duration || 45} mins • {item.meetingMode || item.interviewType || "Online Video Call"}
                        </span>
                      </div>
                    </div>

                    {/* Interviewer Info */}
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>
                        Interviewer: <strong className="text-slate-800">{item.interviewerName || "Hiring Team Lead"}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.interviewerRole || "Technical Evaluator"}
                      </span>
                    </div>

                    {/* Guidelines or Instructions */}
                    {(item.preparationGuidelines || item.instructions) && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11.5px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>💡</span> Preparation Guidelines
                        </div>
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {item.preparationGuidelines || item.instructions}
                        </p>
                      </div>
                    )}

                    {/* Reschedule Note if Rescheduled */}
                    {statusLower === "rescheduled" && (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-800 space-y-0.5">
                        <div className="font-bold flex items-center gap-1">
                          <span>🔄</span>
                          <span>Interview Slot Rescheduled</span>
                        </div>
                        {item.rescheduledReason && (
                          <p>Note: {item.rescheduledReason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {item.meetingLink ? (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold text-center shadow-xs hover:shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <span>🎥</span>
                        <span>Join Live Meeting Room</span>
                      </a>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium text-center">
                        Meeting link will be activated shortly
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedInterview(item)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      title="View Full Guidelines & Details"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* PAST / INTERVIEW HISTORY TAB */
        historyInterviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-600 text-2xl flex items-center justify-center mx-auto">
              📜
            </div>
            <h3 className="text-base font-bold text-slate-900">No Past Interviews Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Completed and cancelled interview sessions will be archived here for your reference.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyInterviews.map((item) => {
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Full-time Job";
              const statusLower = (item.status || "").toLowerCase();
              const isCancelled = statusLower === "cancelled";
              const isCompleted = statusLower === "completed";
              const badge = getStatusBadge(item.status, item.result);

              return (
                <div
                  key={item._id}
                  className={`rounded-3xl border shadow-2xs transition p-5 flex flex-col justify-between space-y-4 ${
                    isCancelled
                      ? "bg-rose-50/30 border-rose-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Role & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {roleType}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {item.roundName || `Round ${item.roundNumber}`}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">
                          {roleTitle}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {item.jobId?.department || "Department"}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] border inline-flex items-center gap-1 ${badge.cls}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Date & Time Slot Box */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">📅 Slot Date</span>
                        <strong className="text-slate-800">{item.scheduledDate}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">🕒 Time</span>
                        <strong className="text-slate-800 font-mono">{item.scheduledTime || item.startTime}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Interviewer</span>
                        <span className="text-slate-800 font-medium">{item.interviewerName || "Hiring Lead"}</span>
                      </div>
                    </div>

                    {/* Cancellation Details (If cancelled) */}
                    {isCancelled && (
                      <div className="p-3.5 bg-rose-100/70 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                        <div className="flex items-center justify-between font-extrabold text-rose-950">
                          <span className="flex items-center gap-1">
                            <span>✕</span>
                            <span>Interview Cancelled</span>
                          </span>
                          {item.cancelledAt && (
                            <span className="text-[10.5px] text-rose-700 font-mono font-normal">
                              {new Date(item.cancelledAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {item.cancellationReason && (
                          <p>
                            <strong>Reason:</strong> {item.cancellationReason}
                          </p>
                        )}
                        {item.cancellationMessage && (
                          <p className="text-rose-800">
                            <strong>Note:</strong> {item.cancellationMessage}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Evaluation Details (If completed) */}
                    {isCompleted && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-950">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Evaluation Completed</span>
                          {item.result && (
                            <span className="font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              {item.result}
                            </span>
                          )}
                        </div>
                        {item.feedback?.recommendation && (
                          <p className="text-slate-700">Recommendation: {item.feedback.recommendation}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isCancelled ? (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <span>✕</span>
                        <span>Meeting room closed (Slot Cancelled)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500">
                        Historical Record
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedInterview(item)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition ml-auto"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Candidate Interview Detail Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedInterview.roundName || `Round ${selectedInterview.roundNumber}`} Details
                </h3>
                <p className="text-xs text-slate-500">
                  Position: <strong className="text-slate-800">{selectedInterview.jobId?.title || selectedInterview.internshipId?.title || "Role"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInterview(null)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Cancellation Notice if cancelled */}
              {(selectedInterview.status || "").toLowerCase() === "cancelled" && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                  <div className="flex items-center justify-between font-extrabold text-rose-950">
                    <span className="flex items-center gap-1">
                      <span>✕</span>
                      <span>Interview Cancelled</span>
                    </span>
                    {selectedInterview.cancelledAt && (
                      <span className="text-[10px] text-rose-600 font-mono">
                        {new Date(selectedInterview.cancelledAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {selectedInterview.cancellationReason && (
                    <p><strong>Reason:</strong> {selectedInterview.cancellationReason}</p>
                  )}
                  {selectedInterview.cancellationMessage && (
                    <p className="text-slate-600"><strong>Note:</strong> {selectedInterview.cancellationMessage}</p>
                  )}
                </div>
              )}

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Date:</span>
                  <strong className="text-slate-900">{selectedInterview.scheduledDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Time:</span>
                  <strong className="text-slate-900">{selectedInterview.scheduledTime || selectedInterview.startTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Mode:</span>
                  <strong className="text-slate-900">{selectedInterview.meetingMode || selectedInterview.interviewType || "Online"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Duration:</span>
                  <strong className="text-slate-900">{selectedInterview.durationMinutes || selectedInterview.duration || 45} Minutes</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Interviewer Details</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p><strong>Name:</strong> {selectedInterview.interviewerName || "Technical Hiring Team"}</p>
                  <p><strong>Role:</strong> {selectedInterview.interviewerRole || "Engineering / Talent Partner"}</p>
                </div>
              </div>

              {selectedInterview.preparationGuidelines && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Guidelines & Preparation Notes</h4>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 leading-relaxed font-medium">
                    {selectedInterview.preparationGuidelines}
                  </div>
                </div>
              )}

              {/* ONLY show video meeting room if NOT cancelled */}
              {(selectedInterview.status || "").toLowerCase() !== "cancelled" && selectedInterview.meetingLink && (
                <div className="pt-2">
                  <a
                    href={selectedInterview.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold text-center block shadow-xs transition"
                  >
                    Open Live Video Room →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateInterviewsView;
