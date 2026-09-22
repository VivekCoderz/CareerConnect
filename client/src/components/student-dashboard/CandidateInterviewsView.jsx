import React, { useState, useEffect, useMemo } from "react";
import recruitmentService from "../../services/recruitmentService";

const parseInterviewDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    let hours = 11;
    let minutes = 0;

    if (timeStr) {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === "PM" && hours < 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;
      }
    }

    return new Date(year, month - 1, day, hours, minutes, 0);
  } catch {
    return null;
  }
};

const getCountdownInfo = (interview) => {
  if (!interview || !interview.scheduledDate) return null;

  const targetDate = parseInterviewDateTime(
    interview.scheduledDate,
    interview.startTime || interview.scheduledTime
  );
  if (!targetDate) return null;

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const durationMinutes = Number(interview.duration || interview.durationMinutes) || 45;
  const durationMs = durationMinutes * 60 * 1000;

  // If currently active (from 15 mins prior to start until duration ends)
  if (diffMs <= 15 * 60 * 1000 && diffMs >= -durationMs) {
    return {
      text: "Your interview is starting now",
      badge: "LIVE NOW",
      canJoin: true,
      urgent: true,
      diffMs,
    };
  }

  // If ended
  if (diffMs < -durationMs) {
    return {
      text: "Interview session concluded",
      badge: "ENDED",
      canJoin: false,
      urgent: false,
      diffMs,
    };
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return {
      text: `Interview starts in ${diffMins} minute${diffMins === 1 ? "" : "s"}`,
      badge: `${diffMins}m`,
      canJoin: diffMins <= 15,
      urgent: true,
      diffMs,
    };
  }

  if (diffDays < 1) {
    const remMins = diffMins % 60;
    return {
      text: `Interview starts in ${diffHours} hour${diffHours === 1 ? "" : "s"}${remMins > 0 ? ` ${remMins} minute${remMins === 1 ? "" : "s"}` : ""}`,
      badge: `${diffHours}h`,
      canJoin: false,
      urgent: false,
      diffMs,
    };
  }

  const remHours = diffHours % 24;
  return {
    text: `Interview starts in ${diffDays} day${diffDays === 1 ? "" : "s"}${remHours > 0 ? ` ${remHours} hour${remHours === 1 ? "" : "s"}` : ""}`,
    badge: `${diffDays}d`,
    canJoin: false,
    urgent: false,
    diffMs,
  };
};

const CandidateInterviewsView = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "history"
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "completed" | "cancelled"
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [prepareInterview, setPrepareInterview] = useState(null);
  const [, setTimerTick] = useState(0);

  // Periodic tick for countdown updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
<<<<<<< HEAD
    return interviews
      .filter((item) => {
        const s = (item.status || "").toLowerCase();
        return s === "scheduled" || s === "rescheduled";
      })
      .sort((a, b) => {
        const dateA = parseInterviewDateTime(a.scheduledDate, a.startTime || a.scheduledTime) || new Date(0);
        const dateB = parseInterviewDateTime(b.scheduledDate, b.startTime || b.scheduledTime) || new Date(0);
        return dateA - dateB;
      });
  }, [interviews]);

  const historyInterviews = useMemo(() => {
    return interviews
      .filter((item) => {
        const s = (item.status || "").toLowerCase();
        if (s !== "completed" && s !== "cancelled" && s !== "no_show") return false;
        if (historyFilter === "completed") return s === "completed";
        if (historyFilter === "cancelled") return s === "cancelled";
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [interviews, historyFilter]);

  // Nearest upcoming interview for the countdown banner
  const nearestUpcoming = useMemo(() => {
    if (upcomingInterviews.length === 0) return null;
    const now = new Date().getTime();
    const futureOrActive = upcomingInterviews.filter((i) => {
      const dt = parseInterviewDateTime(i.scheduledDate, i.startTime || i.scheduledTime);
      if (!dt) return false;
      const durationMs = (Number(i.duration || i.durationMinutes) || 45) * 60 * 1000;
      return dt.getTime() + durationMs >= now;
    });
    return futureOrActive.length > 0 ? futureOrActive[0] : upcomingInterviews[0];
  }, [upcomingInterviews]);

  const nearestCountdown = nearestUpcoming ? getCountdownInfo(nearestUpcoming) : null;

  // Metrics
=======
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

>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
  const totalUpcoming = upcomingInterviews.length;
  const totalCompleted = interviews.filter(
    (i) => (i.status || "").toLowerCase() === "completed"
  ).length;
  const totalCancelled = interviews.filter(
    (i) => (i.status || "").toLowerCase() === "cancelled"
  ).length;
<<<<<<< HEAD
  const totalPassed = interviews.filter((i) => {
    const r = (i.result || "").toLowerCase();
    return r === "passed" || r === "selected" || r === "next_round";
  }).length;
=======
  const totalPassed = interviews.filter(
    (i) => (i.result || "").toLowerCase() === "passed"
  ).length;
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7

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

<<<<<<< HEAD
    if (r === "selected") {
      return {
        label: "Selected 🏆",
        cls: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold",
        icon: "🏆",
      };
    }
    if (r === "next_round") {
      return {
        label: "Next Round ➡️",
        cls: "bg-blue-50 text-blue-800 border-blue-200 font-bold",
        icon: "➡️",
      };
    }
=======
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
    if (r === "passed") {
      return {
        label: "Round Cleared ✓",
        cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
        icon: "✓",
      };
    }
    if (r === "rejected") {
      return {
        label: "Rejected",
        cls: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        icon: "✕",
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
          label: status || "Scheduled",
          cls: "bg-slate-50 text-slate-700 border-slate-200 font-bold",
          icon: "📌",
        };
    }
  };

<<<<<<< HEAD
  const getCompanyName = (item) => {
    return (
      item.employerId?.companyName ||
      item.internshipId?.companyName ||
      item.applicationId?.companyName ||
      "Company Organization"
    );
  };

  const getCompanyLogo = (item) => {
    return item.employerId?.logo || null;
  };

=======
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#1e3a8a] to-blue-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[11px] font-semibold tracking-wider uppercase text-blue-200 border border-white/10">
            <span>🎙️</span> Campus Placement & Recruiter Interviews
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
<<<<<<< HEAD
            My Interviews
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
            Track upcoming rounds scheduled by employers, join live interview rooms, prepare with round guidelines, and view your results and feedback in real time.
=======
            My Interview Center
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
            Track upcoming rounds, join live video meeting rooms, review interviewer guidelines, and monitor your past interview history in real time.
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
          </p>

          {/* TOP STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Total Interviews</span>
              <span className="text-2xl font-black text-white">{interviews.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Upcoming</span>
              <span className="text-2xl font-black text-amber-300">{totalUpcoming}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Completed</span>
              <span className="text-2xl font-black text-blue-200">{totalCompleted}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] text-blue-200 uppercase font-bold tracking-wider block">Rounds Cleared</span>
              <span className="text-2xl font-black text-emerald-300">{totalPassed}</span>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* COUNTDOWN BANNER (Nearest Upcoming Interview) */}
      {nearestUpcoming && nearestCountdown && (
        <div
          className={`p-5 rounded-3xl border transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            nearestCountdown.urgent
              ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-50 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border-blue-200"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                nearestCountdown.urgent
                  ? "bg-amber-500 text-white animate-bounce shadow-sm"
                  : "bg-[#1e3a8a] text-white shadow-xs"
              }`}
            >
              ⏰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Next Scheduled Round
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    nearestCountdown.urgent
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-blue-100 text-[#1e3a8a]"
                  }`}
                >
                  {nearestCountdown.badge}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {nearestCountdown.text}
              </h3>
              <p className="text-xs text-slate-600">
                <strong className="text-slate-900">{getCompanyName(nearestUpcoming)}</strong> •{" "}
                {nearestUpcoming.roundName || `Round ${nearestUpcoming.roundNumber}`} ({nearestUpcoming.jobId?.title || nearestUpcoming.internshipId?.title || "Role"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedInterview(nearestUpcoming)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              View Details
            </button>

            {nearestUpcoming.meetingLink && (nearestUpcoming.meetingMode || nearestUpcoming.interviewType) !== "Offline" && (
              <a
                href={nearestUpcoming.meetingLink}
                target="_blank"
                rel="noreferrer"
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                  nearestCountdown.urgent || nearestCountdown.canJoin
                    ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/30"
                    : "bg-[#1e3a8a] hover:bg-[#1e40af]"
                }`}
              >
                <span>🎥</span>
                <span>Join Interview</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* TABS: [ Upcoming Interviews ] & [ Past / Interview History ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
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
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
              {totalUpcoming}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
<<<<<<< HEAD
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
=======
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
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
<<<<<<< HEAD
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
=======
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                  historyFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("completed")}
<<<<<<< HEAD
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
=======
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                  historyFilter === "completed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Completed ({totalCompleted})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter("cancelled")}
<<<<<<< HEAD
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
=======
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
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
<<<<<<< HEAD
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
=======
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
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
            className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold cursor-pointer"
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
<<<<<<< HEAD
              You do not have any pending interview rounds scheduled at the moment. When employers shortlist your applications and schedule an interview slot, it will automatically appear here.
=======
              You do not have any pending interview rounds right now. When employers shortlist your applications and schedule an interview slot, it will appear here with the live meeting link.
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingInterviews.map((item) => {
<<<<<<< HEAD
              const companyName = getCompanyName(item);
              const companyLogo = getCompanyLogo(item);
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Job";
              const isOffline = (item.meetingMode || item.interviewType) === "Offline";
              const badge = getStatusBadge(item.status, item.result);
              const countdown = getCountdownInfo(item);
=======
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Full-time Job";
              const statusLower = (item.status || "").toLowerCase();
              const badge = getStatusBadge(item.status, item.result);
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
<<<<<<< HEAD
                    {/* Company Info & Round Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black text-base flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden">
                          {companyLogo ? (
                            <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                          ) : (
                            companyName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">{companyName}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                              {roleType}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{roleTitle}</h4>
                        </div>
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] border inline-flex items-center gap-1 ${badge.cls}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

<<<<<<< HEAD
                    {/* Interview Round Badge & Countdown preview */}
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                      <span className="font-bold text-slate-800">
                        {item.roundName || `Round ${item.roundNumber}`}
                      </span>
                      {countdown && (
                        <span className={`text-[11px] font-bold ${countdown.urgent ? "text-amber-700 animate-pulse" : "text-slate-500"}`}>
                          ⏱️ {countdown.text}
                        </span>
                      )}
                    </div>

                    {/* Date, Time, Duration, Mode */}
                    <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">📅 Date:</span>
                        <strong className="text-slate-900 font-bold">{item.scheduledDate}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">🕒 Time Slot:</span>
                        <strong className="text-slate-900 font-mono font-bold">
                          {item.startTime || item.scheduledTime}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">⌛ Duration:</span>
                        <span className="text-slate-800 font-medium">
                          {item.duration || item.durationMinutes || 45} Minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">📍 Mode:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                          isOffline ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-[#1e3a8a]"
                        }`}>
                          {isOffline ? "🏢 Offline (In-Person)" : "🌐 Online"}
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                        </span>
                      </div>
                    </div>

<<<<<<< HEAD
                    {/* Interviewer Details */}
                    <div className="text-xs text-slate-600 flex items-center justify-between px-1">
                      <span>
                        Interviewer: <strong className="text-slate-800">{item.interviewerName || "Hiring Team Lead"}</strong>
                      </span>
                      {item.interviewerRole && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.interviewerRole}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: [ View Details ], [ Join Interview ] (if online), [ Prepare ] */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedInterview(item)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrepareInterview(item)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <span>💡</span>
                      <span>Prepare</span>
                    </button>

                    {!isOffline && item.meetingLink ? (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold text-center shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🎥</span>
                        <span>Join Interview</span>
                      </a>
                    ) : isOffline ? (
                      <span className="flex-1 text-[11px] text-slate-500 font-medium text-right pr-1">
                        🏢 Physical venue
                      </span>
                    ) : (
                      <span className="flex-1 text-[11px] text-slate-400 font-medium text-right pr-1">
                        Link activates soon
                      </span>
                    )}
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
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
<<<<<<< HEAD
              Completed and cancelled interview sessions and their evaluation outcomes will be archived here.
=======
              Completed and cancelled interview sessions will be archived here for your reference.
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyInterviews.map((item) => {
<<<<<<< HEAD
              const companyName = getCompanyName(item);
              const companyLogo = getCompanyLogo(item);
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Job";
=======
              const roleTitle = item.jobId?.title || item.internshipId?.title || "Role";
              const roleType = item.internshipId ? "Internship" : "Full-time Job";
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
              const statusLower = (item.status || "").toLowerCase();
              const isCancelled = statusLower === "cancelled";
              const isCompleted = statusLower === "completed";
              const badge = getStatusBadge(item.status, item.result);
<<<<<<< HEAD
              const scorecard = item.scorecard || {};
              const feedback = item.feedback || {};
=======
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7

              return (
                <div
                  key={item._id}
                  className={`rounded-3xl border shadow-2xs transition p-5 flex flex-col justify-between space-y-4 ${
<<<<<<< HEAD
                    isCancelled ? "bg-rose-50/20 border-rose-200" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white font-black text-base flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden">
                          {companyLogo ? (
                            <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                          ) : (
                            companyName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">{companyName}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                              {roleType}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{roleTitle}</h4>
                        </div>
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] border inline-flex items-center gap-1 ${badge.cls}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

<<<<<<< HEAD
                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Round:</span>
                        <strong className="text-slate-800">{item.roundName || `Round ${item.roundNumber}`}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">📅 Date & Time:</span>
                        <span className="text-slate-800 font-medium">{item.scheduledDate} · {item.startTime || item.scheduledTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Interviewer:</span>
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                        <span className="text-slate-800 font-medium">{item.interviewerName || "Hiring Lead"}</span>
                      </div>
                    </div>

<<<<<<< HEAD
                    {/* Cancellation Details */}
                    {isCancelled && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-rose-900">
                          <span>✕ Interview Cancelled</span>
                          {item.cancelledAt && (
                            <span className="text-[10px] text-rose-600 font-mono font-normal">
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                              {new Date(item.cancelledAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {item.cancellationReason && (
<<<<<<< HEAD
                          <p><strong>Reason:</strong> {item.cancellationReason}</p>
                        )}
                        {item.cancellationMessage && (
                          <p className="text-slate-600"><strong>Note:</strong> {item.cancellationMessage}</p>
=======
                          <p>
                            <strong>Reason:</strong> {item.cancellationReason}
                          </p>
                        )}
                        {item.cancellationMessage && (
                          <p className="text-rose-800">
                            <strong>Note:</strong> {item.cancellationMessage}
                          </p>
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                        )}
                      </div>
                    )}

<<<<<<< HEAD
                    {/* Completed Evaluation Details */}
                    {isCompleted && (
                      <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-950">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold uppercase tracking-wide text-[11px] text-emerald-800">
                            Evaluation Result
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {item.result ? item.result.toUpperCase().replace("_", " ") : "COMPLETED"}
                          </span>
                        </div>

                        {(scorecard.overallScore > 0 || feedback.rating > 0) && (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-700 font-bold font-mono">
                              ★ {scorecard.overallScore || feedback.rating}/5.0
                            </span>
                            <span className="text-slate-500 text-[11px]">Overall Score</span>
                          </div>
                        )}

                        {(scorecard.overallFeedback || scorecard.feedback || feedback.comments) && (
                          <div className="p-2.5 bg-white rounded-xl border border-emerald-100 text-slate-700 text-xs leading-relaxed">
                            <strong className="block text-slate-900 mb-0.5 font-bold">Recruiter Feedback:</strong>
                            {scorecard.overallFeedback || scorecard.feedback || feedback.comments}
                          </div>
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                        )}
                      </div>
                    )}
                  </div>

<<<<<<< HEAD
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isCancelled ? "Session Cancelled" : "Completed Record"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedInterview(item)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
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

      {/* ======================================================== */}
      {/* INTERVIEW DETAILS MODAL (PART 6)                         */}
      {/* ======================================================== */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top my-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedInterview.roundName || `Round ${selectedInterview.roundNumber}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {getCompanyName(selectedInterview)} • {selectedInterview.jobId?.title || selectedInterview.internshipId?.title || "Role"}
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

<<<<<<< HEAD
            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-600">Interview Status</span>
                {(() => {
                  const badge = getStatusBadge(selectedInterview.status, selectedInterview.result);
                  return (
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${badge.cls}`}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  );
                })()}
              </div>

              {/* Slot Particulars */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Company:</span>
                  <strong className="text-slate-900 font-bold">{getCompanyName(selectedInterview)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Position:</span>
                  <strong className="text-slate-900 font-bold">{selectedInterview.jobId?.title || selectedInterview.internshipId?.title || "Opportunity"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Interview Round:</span>
                  <strong className="text-slate-900">{selectedInterview.roundName || `Round ${selectedInterview.roundNumber}`}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Date:</span>
                  <strong className="text-slate-900">{selectedInterview.scheduledDate}</strong>
                </div>
                <div className="flex justify-between">
<<<<<<< HEAD
                  <span className="text-slate-600 font-medium">Time:</span>
                  <strong className="text-slate-900 font-mono">{selectedInterview.startTime || selectedInterview.scheduledTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Duration:</span>
                  <strong className="text-slate-900">{selectedInterview.duration || selectedInterview.durationMinutes || 45} Minutes</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Mode:</span>
                  <strong className="text-slate-900">{selectedInterview.meetingMode || selectedInterview.interviewType || "Online"}</strong>
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                </div>
              </div>

              {/* Meeting Link or Location */}
              {(selectedInterview.meetingMode || selectedInterview.interviewType) === "Offline" ? (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Physical Venue / Location</h4>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-medium">
                    📍 {selectedInterview.location || "Office location will be shared by recruiter"}
                  </div>
                </div>
              ) : selectedInterview.meetingLink ? (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Meeting Link</h4>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                    <span className="text-slate-700 truncate mr-2 font-mono text-[11px]">{selectedInterview.meetingLink}</span>
                    <a
                      href={selectedInterview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white font-bold hover:bg-[#1e40af] transition whitespace-nowrap cursor-pointer"
                    >
                      Join Link →
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Interviewer */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Interviewer</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <p className="font-semibold text-slate-800">{selectedInterview.interviewerName || "Hiring Team Lead"}</p>
                  {selectedInterview.interviewerRole && (
                    <p className="text-slate-500 text-[11px]">{selectedInterview.interviewerRole}</p>
                  )}
                  {selectedInterview.interviewerEmail && (
                    <p className="text-slate-400 text-[11px] font-mono">{selectedInterview.interviewerEmail}</p>
                  )}
                </div>
              </div>

              {/* Instructions */}
              {(selectedInterview.instructions || selectedInterview.notes || selectedInterview.preparationGuidelines) && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Instructions</h4>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 leading-relaxed font-medium">
                    {selectedInterview.instructions || selectedInterview.preparationGuidelines || selectedInterview.notes}
                  </div>
                </div>
              )}

<<<<<<< HEAD
              {/* Completed Evaluation Section */}
              {(selectedInterview.status || "").toLowerCase() === "completed" && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">Final Result</h4>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-bold uppercase text-[11px]">
                      {selectedInterview.result ? selectedInterview.result.toUpperCase().replace("_", " ") : "COMPLETED"}
                    </span>
                  </div>

                  {(selectedInterview.scorecard?.feedback || selectedInterview.scorecard?.overallFeedback || selectedInterview.feedback?.comments) && (
                    <div className="pt-2 border-t border-emerald-200/60 text-slate-800">
                      <strong className="block text-emerald-950 mb-0.5">Recruiter Feedback:</strong>
                      <p className="leading-relaxed bg-white p-2.5 rounded-xl border border-emerald-100">
                        {selectedInterview.scorecard?.overallFeedback || selectedInterview.scorecard?.feedback || selectedInterview.feedback?.comments}
                      </p>
                    </div>
                  )}
=======
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
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7
                </div>
              )}

              {/* Join Action if Upcoming & Online */}
              {(selectedInterview.status || "").toLowerCase() !== "cancelled" &&
                (selectedInterview.status || "").toLowerCase() !== "completed" &&
                (selectedInterview.meetingMode || selectedInterview.interviewType) !== "Offline" &&
                selectedInterview.meetingLink && (
                  <div className="pt-2">
                    <a
                      href={selectedInterview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold text-center block shadow-xs transition cursor-pointer"
                    >
                      Join Interview Room →
                    </a>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PREPARATION GUIDELINES MODAL                             */}
      {/* ======================================================== */}
      {prepareInterview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top my-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/90">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Interview Preparation Guide
                  </h3>
                  <p className="text-xs text-slate-500">
                    {prepareInterview.roundName || `Round ${prepareInterview.roundNumber}`} • {getCompanyName(prepareInterview)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrepareInterview(null)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {prepareInterview.instructions ? (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Employer Instructions</h4>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-medium leading-relaxed">
                    {prepareInterview.instructions}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Recommended Preparation Checklist</h4>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Review core concepts relevant to the role ({prepareInterview.jobId?.title || prepareInterview.internshipId?.title || "Position"}) and practice explaining past projects.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Ensure you have a quiet setting, stable high-speed internet, working webcam and microphone.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Join or arrive at least 5-10 minutes prior to the scheduled start time ({prepareInterview.startTime || prepareInterview.scheduledTime}).</span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Keep a digital copy of your resume and portfolio handy to share during the interview.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPrepareInterview(null)}
                  className="w-full py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition cursor-pointer shadow-xs"
                >
                  Got It, I'm Ready!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateInterviewsView;
