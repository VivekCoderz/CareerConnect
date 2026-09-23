import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getApplicationById, withdraw } from "../../services/applicationService";
import { useSelector } from "react-redux";

const DEFAULT_STAGES = [
  { name: "Resume Screening", type: "Resume Screening", order: 0 },
  { name: "Technical Interview", type: "Technical Interview", order: 1 },
  { name: "HR Interview", type: "HR Interview", order: 2 },
];

export default function StudentApplicationTrackingPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchApplication = async (silent = false) => {
    if (!applicationId) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getApplicationById(applicationId);
      if (res?.success && res.application) {
        setApplication(res.application);
      } else {
        setError(res?.message || "Failed to load application tracking details.");
      }
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || "Application not found or unauthorized.");
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplication();

    // Auto-sync polling every 7 seconds
    const interval = setInterval(() => {
      fetchApplication(true);
    }, 7000);

    const onFocus = () => fetchApplication(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [applicationId]);

  const handleWithdraw = async () => {
    if (!window.confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) {
      return;
    }
    try {
      setWithdrawLoading(true);
      const res = await withdraw(applicationId);
      if (res.success) {
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to withdraw application.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error withdrawing application.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-800">Loading Application Tracking...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving latest recruitment pipeline & status</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
          <span className="text-4xl">🔍</span>
          <h2 className="text-lg font-black text-slate-900">Application Not Found</h2>
          <p className="text-xs text-slate-600">{error || "We could not find the specified application."}</p>
          <Link
            to="/student/applications"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold transition"
          >
            ← Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const opp = application.jobId || application.internshipId || {};
  const isInternship = application.opportunityType === "Internship" || opp.employmentType === "Internship";
  const stages = (opp.recruitmentStages && opp.recruitmentStages.length > 0)
    ? [...opp.recruitmentStages].sort((a, b) => a.order - b.order)
    : (application.recruitmentStages && application.recruitmentStages.length > 0)
    ? [...application.recruitmentStages].sort((a, b) => a.order - b.order)
    : DEFAULT_STAGES;

  const isSelected = application.overallStatus === "Selected" || application.status === "Selected" || application.status === "Hired" || application.status === "Offered";
  const isRejected = application.overallStatus === "Rejected" || application.status === "Rejected";
  const isWithdrawn = application.overallStatus === "Withdrawn" || application.status === "Withdrawn";

  // Build full timeline steps:
  // Step 0: Applied (always Completed)
  // Step 1..N: Configured Recruitment Stages
  // Step N+1: Final Decision
  const timelineSteps = [
    {
      id: "applied",
      name: "Applied",
      type: "Application",
      isInitial: true,
      status: "Completed",
      date: application.appliedAt || application.createdAt,
      remarks: "Application submitted successfully.",
    },
    ...stages.map((stg, idx) => {
      // Match history record
      const historyEntry = (application.stageHistory || []).find(
        (sh) =>
          sh.stageIndex === idx ||
          (sh.stageId && stg._id && sh.stageId.toString() === stg._id.toString()) ||
          (sh.stageName && sh.stageName.toLowerCase() === stg.name.toLowerCase())
      );

      // Match interview if any
      const matchingInterview = (application.interviews || []).find(
        (inv) =>
          inv.roundNumber === idx + 1 ||
          (inv.roundName && inv.roundName.toLowerCase().includes(stg.name.toLowerCase()))
      );

      let stepStatus = "Pending";
      const currentIdx = application.currentStageIndex ?? 0;

      if (isWithdrawn) {
        stepStatus = "Withdrawn";
      } else if (historyEntry) {
        stepStatus = historyEntry.status || "In Progress";
      } else if (idx < currentIdx) {
        stepStatus = "Passed";
      } else if (idx === currentIdx) {
        if (isRejected) {
          stepStatus = "Rejected";
        } else if (isSelected) {
          stepStatus = "Passed";
        } else if (matchingInterview && matchingInterview.status?.toLowerCase() === "scheduled") {
          stepStatus = "Scheduled";
        } else {
          stepStatus = "In Progress";
        }
      } else {
        stepStatus = "Pending";
      }

      return {
        id: stg._id || idx,
        name: stg.name,
        type: stg.type,
        order: idx + 1,
        description: stg.description,
        configuration: stg.configuration || {},
        status: stepStatus,
        historyEntry,
        interview: matchingInterview,
        isCurrent: idx === currentIdx && !isSelected && !isRejected && !isWithdrawn,
      };
    }),
    {
      id: "final-decision",
      name: "Final Decision",
      type: "Outcome",
      isFinal: true,
      status: isSelected ? "Selected" : isRejected ? "Rejected" : isWithdrawn ? "Withdrawn" : "Pending",
    },
  ];

  // Current active step calculation
  const currentStep = timelineSteps.find((s) => s.isCurrent) ||
    (isSelected ? timelineSteps[timelineSteps.length - 1] : isRejected ? timelineSteps[timelineSteps.length - 1] : timelineSteps[1] || timelineSteps[0]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
      case "Passed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Selected":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-black";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200 font-bold animate-pulse";
      case "Scheduled":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
      case "Rejected":
      case "Failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Withdrawn":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link to="/student/applications" className="hover:text-blue-900 transition flex items-center gap-1 font-bold">
              <span>←</span> My Applications
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-xs">
              {application.opportunityTitle || opp.title || "Tracking"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                fetchApplication(true);
              }}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Opportunity Card Banner */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                {(application.companyName || opp.companyName || "C")?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(application.overallStatus || application.status)}`}>
                    {application.overallStatus || application.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                    {isInternship ? "🎓 Internship" : "💼 Job"}
                  </span>
                  {opp.workMode && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                      {opp.workMode}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {application.opportunityTitle || opp.title || "Opportunity"}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                  🏢 {application.companyName || opp.companyName || "Organization Lead"} · 📍 {opp.location || opp.city || "Bangalore"}
                </p>
              </div>
            </div>

            {/* Application Meta Box */}
            <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-100 shrink-0">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Applied Date</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {application.appliedAt || application.createdAt
                  ? new Date(application.appliedAt || application.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recently"}
              </p>
              <div className="mt-2 text-xs">
                <span className="text-slate-500">Current Stage: </span>
                <span className="font-extrabold text-[#1e3a8a]">
                  {isSelected ? "Selected 🎉" : isRejected ? "Not Selected" : isWithdrawn ? "Withdrawn" : currentStep.name}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Compensation</span>
              <span className="font-bold text-slate-800">
                {isInternship ? (opp.stipend || "Stipend Disclosed") : (opp.compensationLabel || "Competitive CTC")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Rounds</span>
              <span className="font-bold text-slate-800">{stages.length} Evaluation Rounds</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Student Applicant</span>
              <span className="font-bold text-slate-800">{application.studentName || user?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Application ID</span>
              <span className="font-mono text-[11px] font-semibold text-slate-600">
                #{application._id.slice(-6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RECRUITMENT PROGRESS TIMELINE (HORIZONTAL DESKTOP / ADAPTIVE MOBILE)      */}
        {/* ========================================================================= */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Recruitment Progress Timeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stage progression from application through final hiring decision
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200">
              {stages.length} Dynamic Rounds
            </span>
          </div>

          {/* Desktop Horizontal Timeline */}
          <div className="hidden md:block py-6 overflow-x-auto">
            <div className="flex items-start justify-between relative min-w-[650px] px-4">
              {/* Connecting Background Line */}
              <div className="absolute top-5 left-10 right-10 h-1 bg-slate-200 -z-0 rounded-full" />

              {timelineSteps.map((step, idx) => {
                const isPassed = step.status === "Passed" || step.status === "Completed" || (step.isFinal && step.status === "Selected");
                const isCurrent = step.isCurrent;
                const isFailed = step.status === "Failed" || step.status === "Rejected";
                const isScheduled = step.status === "Scheduled";

                return (
                  <div key={step.id || idx} className="relative z-10 flex flex-col items-center text-center max-w-[120px]">
                    {/* Circle Node */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs transition-all shadow-xs ${
                        isPassed
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                          : isCurrent
                          ? "bg-[#1e3a8a] text-white ring-4 ring-blue-100 scale-110 animate-pulse"
                          : isScheduled
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : isFailed
                          ? "bg-rose-500 text-white ring-4 ring-rose-100"
                          : "bg-white text-slate-400 border-2 border-slate-300"
                      }`}
                    >
                      {isPassed ? (
                        "✓"
                      ) : isFailed ? (
                        "✕"
                      ) : isCurrent ? (
                        "●"
                      ) : isScheduled ? (
                        "📅"
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Title & Details */}
                    <div className="mt-2.5 space-y-1">
                      <p className={`text-xs font-bold leading-tight ${
                        isCurrent ? "text-[#1e3a8a] font-black" : isPassed ? "text-slate-900" : "text-slate-500"
                      }`}>
                        {step.name}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${getStatusBadge(step.status)}`}>
                        {step.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="md:hidden space-y-4 pt-2">
            {timelineSteps.map((step, idx) => {
              const isPassed = step.status === "Passed" || step.status === "Completed" || (step.isFinal && step.status === "Selected");
              const isCurrent = step.isCurrent;
              const isFailed = step.status === "Failed" || step.status === "Rejected";
              const isScheduled = step.status === "Scheduled";

              return (
                <div key={step.id || idx} className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPassed
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-100"
                          : isCurrent
                          ? "bg-[#1e3a8a] text-white ring-2 ring-blue-100 font-black"
                          : isScheduled
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-100"
                          : isFailed
                          ? "bg-rose-500 text-white ring-2 ring-rose-100"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isPassed ? "✓" : isFailed ? "✕" : isCurrent ? "●" : idx + 1}
                    </div>
                    {idx < timelineSteps.length - 1 && <div className="w-0.5 h-8 bg-slate-200 my-1" />}
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-bold ${isCurrent ? "text-[#1e3a8a] font-black" : "text-slate-900"}`}>
                        {step.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${getStatusBadge(step.status)}`}>
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{step.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROUND-BY-ROUND EVALUATION STATUS CARDS SECTION                           */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Round-by-Round Evaluation Status
              </h2>
              <p className="text-xs text-slate-500">
                Detailed real-time overview of schedules, instructions, and outcomes for every recruitment round
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {timelineSteps.length} Rounds
            </span>
          </div>

          <div className="space-y-3.5">
            {timelineSteps.map((step, idx) => {
              const isPassed = step.status === "Passed" || step.status === "Completed" || (step.isFinal && step.status === "Selected");
              const isCurrent = step.isCurrent;
              const isScheduled = step.status === "Scheduled";
              const isFailed = step.status === "Failed" || step.status === "Rejected";

              // Schedule information from stageHistory or interview
              const scheduledDate = step.historyEntry?.scheduledDate || step.interview?.scheduledDate;
              const scheduledTime = step.historyEntry?.scheduledTime || step.interview?.scheduledTime || step.interview?.startTime;
              const meetingMode = step.historyEntry?.meetingMode || step.interview?.meetingMode || step.configuration?.interviewType || "Online";
              const meetingLink = step.historyEntry?.meetingLink || step.interview?.meetingLink;
              const instructions = step.historyEntry?.instructions || step.interview?.instructions || step.configuration?.instructions;
              const feedback = step.historyEntry?.feedback || step.historyEntry?.notes;
              const score = step.historyEntry?.score;
              const testLink = step.configuration?.testLink;

              return (
                <div
                  key={step.id || idx}
                  className={`p-5 rounded-3xl border transition-all ${
                    isCurrent
                      ? "bg-white border-blue-400 shadow-md ring-2 ring-blue-500/10"
                      : isPassed
                      ? "bg-white border-slate-200/90 shadow-2xs"
                      : isScheduled
                      ? "bg-white border-indigo-300 shadow-xs"
                      : isFailed
                      ? "bg-rose-50/40 border-rose-200 shadow-2xs"
                      : "bg-white border-slate-200/80 opacity-80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPassed
                          ? "bg-emerald-100 text-emerald-800"
                          : isCurrent
                          ? "bg-[#1e3a8a] text-white font-extrabold"
                          : isScheduled
                          ? "bg-indigo-600 text-white"
                          : isFailed
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {isPassed ? "✓" : isFailed ? "✕" : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900">
                            {step.name}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {step.type}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                              Active Round
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${getStatusBadge(step.status)}`}>
                        Status: {step.status}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Interview Card inside the round */}
                  {isScheduled && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                          <span>📅</span> Interview Scheduled
                        </span>
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                          Mode: {meetingMode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Scheduled Date</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {scheduledDate
                              ? new Date(scheduledDate).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Date to be confirmed"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Scheduled Time</span>
                          <span className="font-bold text-slate-900 text-xs">{scheduledTime || "Time TBA"}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Interview Type</span>
                          <span className="font-bold text-slate-900 text-xs">{meetingMode} Round</span>
                        </div>
                      </div>

                      {instructions && (
                        <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100 text-[11.5px] text-slate-700">
                          <span className="font-bold text-slate-900">Instructions: </span>
                          <span>{instructions}</span>
                        </div>
                      )}

                      {meetingLink && (
                        <div className="pt-1 flex items-center gap-2">
                          <a
                            href={meetingLink.startsWith("http") ? meetingLink : `https://${meetingLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-800 text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>🎥</span>
                            <span>Join Interview Meeting ↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test / Assessment Link if applicable */}
                  {testLink && (isCurrent || isScheduled) && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-amber-900 block">Assessment Platform Ready</span>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Please complete your online assessment round using the assigned portal.
                        </p>
                      </div>
                      <a
                        href={testLink.startsWith("http") ? testLink : `https://${testLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-xs transition shrink-0 text-center"
                      >
                        Start Test Assessment ↗
                      </a>
                    </div>
                  )}

                  {/* Feedback / Outcome Details */}
                  {feedback && (
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Evaluation Result</span>
                        {score > 0 && (
                          <span className="font-bold text-emerald-700 text-xs">Score: {score}/5.0</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11.5px] italic">"{feedback}"</p>
                    </div>
                  )}

                  {/* Final Decision Banner Card */}
                  {step.isFinal && (
                    <div className="mt-4">
                      {isSelected ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🎉</span>
                            <h4 className="font-black text-sm text-emerald-900">Congratulations! You Have Been Selected!</h4>
                          </div>
                          <p className="text-xs text-emerald-800">
                            You have successfully cleared all recruitment stages. The employer will reach out with the official offer letter and onboarding schedule.
                          </p>
                        </div>
                      ) : isRejected ? (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                          <h4 className="font-bold text-rose-900">Application Closed</h4>
                          <p className="text-xs text-rose-800">
                            Thank you for your effort and time throughout this recruitment process. The hiring team has decided not to proceed further at this stage.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                          Final decision will be published here upon completion of all preceding evaluation rounds.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Details & Submitted Documents Accordion */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Your Submitted Application Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10.5px]">Full Name</span>
              <span className="font-bold text-slate-900">{application.studentName || user?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Email Address</span>
              <span className="font-bold text-slate-900">{application.studentEmail || user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Phone</span>
              <span className="font-bold text-slate-900">{application.studentPhone || user?.phone || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Education</span>
              <span className="font-bold text-slate-900">{application.education || "Undergraduate"}</span>
            </div>
          </div>

          {application.resumeUrl && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">Submitted Resume</span>
                  <p className="text-[10px] text-slate-400">Attached with initial application</p>
                </div>
              </div>
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-[#1e3a8a] transition"
              >
                View Document ↗
              </a>
            </div>
          )}

          {/* Withdraw Application Option */}
          {!isSelected && !isRejected && !isWithdrawn && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Wish to cancel this application? You can withdraw before a final decision is made.
              </p>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition disabled:opacity-50"
              >
                {withdrawLoading ? "Withdrawing..." : "Withdraw Application"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
