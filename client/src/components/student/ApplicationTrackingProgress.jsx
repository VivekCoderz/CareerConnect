import React, { useState } from "react";

// Format date into clean readable format: "22/09/26, 3:05 pm"
const formatScheduleDate = (dateVal, timeVal) => {
  if (!dateVal && !timeVal) return null;
  try {
    let dateStr = "";
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = String(d.getFullYear()).slice(-2);
        dateStr = `${dd}/${mm}/${yy}`;
      } else {
        dateStr = String(dateVal);
      }
    }

    let timeStr = "";
    if (timeVal) {
      timeStr = timeVal;
    } else if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime()) && (d.getHours() !== 0 || d.getMinutes() !== 0)) {
        timeStr = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).toLowerCase();
      }
    }

    if (dateStr && timeStr) return `${dateStr}, ${timeStr}`;
    return dateStr || timeStr || null;
  } catch {
    return null;
  }
};

const DEFAULT_STAGES = [
  {
    name: "Resume Screening",
    type: "Resume Screening",
    subtitle: "AI Resume screening",
    order: 0,
  },
  {
    name: "Aptitude Test",
    type: "Online Test",
    subtitle: "Online coding and aptitude test",
    order: 1,
  },
  {
    name: "Technical Interview",
    type: "Technical Interview",
    subtitle: "In-depth coding and systems discussion",
    order: 2,
  },
];

export default function ApplicationTrackingProgress({ application }) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  if (!application) return null;

  const opp = application.jobId || application.internshipId || {};
  const configuredStages =
    opp.recruitmentStages && opp.recruitmentStages.length > 0
      ? [...opp.recruitmentStages].sort((a, b) => a.order - b.order)
      : application.recruitmentStages && application.recruitmentStages.length > 0
      ? [...application.recruitmentStages].sort((a, b) => a.order - b.order)
      : DEFAULT_STAGES;

  const currentIdx = application.currentStageIndex ?? 0;
  const isSelected =
    application.overallStatus === "Selected" ||
    application.status === "Selected" ||
    application.status === "Hired" ||
    application.status === "Offered";
  const isRejected =
    application.overallStatus === "Rejected" ||
    application.status === "Rejected";
  const isWithdrawn =
    application.overallStatus === "Withdrawn" ||
    application.status === "Withdrawn";

  // Build the complete pipeline flow:
  // 1. Applied (Application Received)
  // 2..N. Configured Stages
  // N+1. Decision (Final Selection Status)
  const allSteps = [
    {
      id: "step-applied",
      name: "Applied",
      subtitle: "Application Received",
      type: "Online Round",
      isInitial: true,
      status: "PASSED",
      scheduled: formatScheduleDate(application.appliedAt || application.createdAt),
      feedback: (application.stageHistory?.[0]?.feedback || application.stageHistory?.[0]?.remarks || "").trim() || null,
      isPassed: true,
      isActive: false,
    },
    ...configuredStages.map((stg, idx) => {
      // History record
      const historyEntry = (application.stageHistory || []).find(
        (sh) =>
          sh.stageIndex === idx ||
          (sh.stageId && stg._id && sh.stageId.toString() === stg._id.toString()) ||
          (sh.stageName && sh.stageName.toLowerCase() === stg.name.toLowerCase())
      );

      // Matching interview
      const matchingInterview =
        application.activeInterview &&
        (application.activeInterview.roundNumber === idx + 1 ||
          (application.activeInterview.roundName &&
            application.activeInterview.roundName
              .toLowerCase()
              .includes(stg.name.toLowerCase())))
          ? application.activeInterview
          : null;

      let status = "PENDING";
      let isPassed = false;
      let isActive = false;
      let isFailed = false;

      if (isWithdrawn) {
        status = "WITHDRAWN";
      } else if (historyEntry?.status) {
        const s = historyEntry.status.toUpperCase();
        if (s.includes("PASS") || s.includes("SELECT") || s.includes("COMPLET")) {
          status = "PASSED";
          isPassed = true;
        } else if (s.includes("FAIL") || s.includes("REJECT")) {
          status = "FAILED";
          isFailed = true;
        } else if (s.includes("SCHEDULE")) {
          status = "SCHEDULED";
          isActive = true;
        } else if (s.includes("PROGRESS")) {
          status = "IN PROGRESS";
          isActive = true;
        } else {
          status = s;
        }
      } else if (isSelected || idx < currentIdx) {
        status = "PASSED";
        isPassed = true;
      } else if (idx === currentIdx) {
        if (isRejected) {
          status = "FAILED";
          isFailed = true;
        } else if (
          matchingInterview &&
          matchingInterview.status?.toLowerCase() === "scheduled"
        ) {
          status = "SCHEDULED";
          isActive = true;
        } else {
          status = "IN PROGRESS";
          isActive = true;
        }
      } else {
        status = "PENDING";
      }

      // Subtitle
      const subtitle =
        stg.subtitle ||
        (stg.type?.toLowerCase().includes("resume")
          ? "AI Resume screening"
          : stg.type?.toLowerCase().includes("aptitude") ||
            stg.type?.toLowerCase().includes("test")
          ? "Online coding and aptitude test"
          : stg.type?.toLowerCase().includes("interview")
          ? "In-depth coding and systems discussion"
          : "Candidate evaluation round");

      // Scheduled timestamp
      const scheduledDate =
        historyEntry?.scheduledDate ||
        matchingInterview?.scheduledDate ||
        (isPassed ? historyEntry?.completedAt || application.updatedAt : null);
      const scheduledTime =
        historyEntry?.scheduledTime || matchingInterview?.scheduledTime;
      const scheduled = formatScheduleDate(scheduledDate, scheduledTime);

      // Real employer feedback only (never default/mock)
      const actualEmployerFeedback = (
        historyEntry?.feedback ||
        historyEntry?.remarks ||
        matchingInterview?.feedback ||
        matchingInterview?.interviewerFeedback ||
        ""
      ).trim();
      const feedback = actualEmployerFeedback || null;

      return {
        id: stg._id || `step-${idx}`,
        name: stg.name,
        subtitle,
        type: stg.type ? stg.type.toUpperCase() : "ONLINE ROUND",
        status,
        scheduled,
        feedback,
        meetingLink: matchingInterview?.meetingLink || historyEntry?.meetingLink,
        testLink: stg.configuration?.testLink,
        isCurrent: idx === currentIdx && !isSelected && !isRejected && !isWithdrawn,
        isPassed,
        isActive,
        isFailed,
      };
    }),
    {
      id: "step-decision",
      name: "Decision",
      subtitle: "Final Selection Status",
      type: "FINAL STAGE",
      isFinal: true,
      status: isSelected ? "PASSED" : isRejected ? "FAILED" : isWithdrawn ? "WITHDRAWN" : "PENDING",
      scheduled:
        isSelected || isRejected
          ? formatScheduleDate(application.updatedAt)
          : null,
      feedback: (
        application.decisionRemarks ||
        application.selectionRemarks ||
        (application.stageHistory || []).find((s) => s.stageName === "Decision")?.feedback ||
        (application.stageHistory || []).find((s) => s.stageName === "Decision")?.remarks ||
        ""
      ).trim() || null,
      isPassed: isSelected,
      isActive: isSelected || isRejected,
      isFailed: isRejected,
    },
  ];

  // Active step index on the stepper
  let activeStepIndex = 0;
  if (isSelected || isRejected) {
    activeStepIndex = allSteps.length - 1;
  } else {
    activeStepIndex = Math.min(1 + currentIdx, allSteps.length - 2);
  }

  // Filter cards to show:
  // "jo ho gya h use ek agle wala dikha do"
  // Completed rounds + the single next active/in-progress round
  const maxVisibleIndex = Math.min(activeStepIndex + 1, allSteps.length);
  const visibleCards = showAllUpcoming ? allSteps : allSteps.slice(0, maxVisibleIndex);
  const hiddenFutureCount = allSteps.length - maxVisibleIndex;

  return (
    <div className="mt-5 pt-5 border-t border-slate-100 space-y-6 animate-fade-in">
      {/* ========================================================================= */}
      {/* 1. TOP PROGRESS STEPPER (DESKTOP HORIZONTAL + MOBILE RESPONSIVE ADAPTIVE) */}
      {/* ========================================================================= */}
      
      {/* Desktop Stepper */}
      <div className="hidden md:block w-full overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[560px] px-2 flex items-start justify-between">
          {allSteps.map((step, idx) => {
            const isCompleted = idx < activeStepIndex || (step.isFinal && isSelected) || step.isPassed;
            const isActive = idx === activeStepIndex && !isCompleted;
            const showLineBefore = idx > 0;
            const isLineGreen = idx <= activeStepIndex || (allSteps[idx - 1] && allSteps[idx - 1].isPassed);

            return (
              <React.Fragment key={step.id}>
                {/* Connecting Line */}
                {showLineBefore && (
                  <div className="flex-1 flex items-center px-1 sm:px-2 pt-5">
                    <div
                      className={`w-full h-0.5 transition-all duration-300 ${
                        isLineGreen ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}

                {/* Node */}
                <div className="flex flex-col items-center text-center max-w-[110px] shrink-0">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center transition-all duration-300 shrink-0 ${
                      isCompleted
                        ? "border-2 border-emerald-500 shadow-xs"
                        : isActive
                        ? "border-2 border-emerald-500 ring-4 ring-emerald-100 shadow-sm"
                        : "border-2 border-slate-300 shadow-2xs"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5 text-emerald-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <p className={`text-xs font-bold leading-tight ${isCompleted || isActive ? "text-emerald-700" : "text-slate-700"}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight line-clamp-1">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile-First Clean Stepper (Compact Horizontal Snap or Clean Vertical Flow) */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none px-1">
          {allSteps.map((step, idx) => {
            const isCompleted = idx < activeStepIndex || (step.isFinal && isSelected) || step.isPassed;
            const isActive = idx === activeStepIndex && !isCompleted;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border shrink-0 transition-all ${
                  isActive
                    ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-100 shadow-xs"
                    : isCompleted
                    ? "bg-white border-emerald-300 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200 opacity-60"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div>
                  <p className={`text-xs font-bold leading-tight ${isActive ? "text-emerald-800" : isCompleted ? "text-slate-900" : "text-slate-500"}`}>
                    {step.name}
                  </p>
                  <p className="text-[9.5px] text-slate-400 font-medium">
                    {step.status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROUND-BY-ROUND STATUS CARDS (CLEAN & MOBILE-FIRST)                     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7M5 18l2 2 4-4" />
            </svg>
            <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              ROUND-BY-ROUND EVALUATION STATUS
            </h4>
          </div>

          {/* Toggle for remaining upcoming rounds */}
          {hiddenFutureCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
              className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllUpcoming ? "Hide upcoming rounds" : `+${hiddenFutureCount} Upcoming rounds`}</span>
              <span>{showAllUpcoming ? "▲" : "▼"}</span>
            </button>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleCards.map((round) => {
            const isPassed = round.status === "PASSED";
            const isScheduled = round.status === "SCHEDULED";
            const isInProgress = round.status === "IN PROGRESS";
            const isFailed = round.status === "FAILED";

            return (
              <div
                key={round.id}
                className={`p-4 sm:p-4.5 rounded-2xl bg-white transition-all shadow-xs flex flex-col justify-between ${
                  isPassed
                    ? "border-2 border-emerald-400 shadow-emerald-50/40"
                    : isInProgress || round.isActive
                    ? "border-2 border-emerald-500/80 ring-2 ring-emerald-50"
                    : isScheduled
                    ? "border border-indigo-200"
                    : isFailed
                    ? "border border-rose-200"
                    : "border border-slate-200/90"
                }`}
              >
                <div>
                  {/* Top Header: Round Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 leading-tight">
                        {round.name}
                      </h5>
                      <span className="inline-block mt-1 text-[9.5px] font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {round.type}
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                        isPassed
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : isInProgress || round.isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : isScheduled
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : isFailed
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {round.status}
                    </span>
                  </div>

                  {/* Scheduled Line (Only if date exists or is active/completed) */}
                  {round.scheduled && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">
                        Scheduled: {round.scheduled}
                      </span>
                    </div>
                  )}
                </div>

                {/* Feedback Box & Action Buttons */}
                <div>
                  {/* Employer Feedback (ONLY shown when employer has submitted real feedback) */}
                  {round.feedback && (
                    <div className="mt-3 pt-1">
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-[11px] leading-relaxed">
                        <span className="font-bold text-slate-700 not-italic">
                          Feedback:{" "}
                        </span>
                        <span className="italic text-slate-600">
                          {round.feedback}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Live Meeting / Assessment Action Buttons */}
                  {((round.meetingLink && isScheduled) || (round.testLink && !isPassed)) && (
                    <div className="mt-3 space-y-1.5">
                      {round.meetingLink && isScheduled && (
                        <a
                          href={round.meetingLink.startsWith("http") ? round.meetingLink : `https://${round.meetingLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>🎥</span>
                          <span>Join Live Meeting</span>
                        </a>
                      )}

                      {round.testLink && !isPassed && (
                        <a
                          href={round.testLink.startsWith("http") ? round.testLink : `https://${round.testLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>🚀</span>
                          <span>Start Assessment</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
