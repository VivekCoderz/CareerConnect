import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ApplicantExportModal from "./ApplicantExportModal";

// Helper for professional role casing
const formatRoleTitle = (str) => {
  if (!str) return "Candidate Role";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const DEFAULT_STAGES = [
  { name: "Resume Screening", type: "Resume Screening", order: 0 },
  { name: "Technical Interview", type: "Technical Interview", order: 1 },
  { name: "HR Interview", type: "HR Interview", order: 2 },
];

const ATSPipelineView = ({
  applications = [],
  jobs = [],
  onUpdateStage,
  onMoveNextStage,
  onSelectCandidate,
  onRejectCandidate,
  onMarkStageFailed,
  onScheduleInterview,
  onCreateOffer,
  onAddNote,
}) => {
  // State
  const [selectedJobId, setSelectedJobId] = useState("All");
  const [activeStageFilter, setActiveStageFilter] = useState("All");
  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewingApp, setViewingApp] = useState(null);
  const [viewingHistoryApp, setViewingHistoryApp] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type: 'move'|'select'|'reject'|'fail', app: Object, targetStage: Object }
  const [actionRemarks, setActionRemarks] = useState("");
  const [noteText, setNoteText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Determine currently selected job object
  const currentJob = useMemo(() => {
    if (selectedJobId === "All") return null;
    return jobs.find((j) => (j._id || j.id)?.toString() === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // Determine active recruitment stages for the current view
  const activeStages = useMemo(() => {
    if (currentJob && Array.isArray(currentJob.recruitmentStages) && currentJob.recruitmentStages.length > 0) {
      return [...currentJob.recruitmentStages].sort((a, b) => a.order - b.order);
    }
    return DEFAULT_STAGES;
  }, [currentJob]);

  // Filter applications by selected Job
  const jobFilteredApps = useMemo(() => {
    if (selectedJobId === "All") return applications;
    return applications.filter((app) => {
      const jId = (app.jobId?._id || app.jobId)?.toString();
      return jId === selectedJobId;
    });
  }, [applications, selectedJobId]);

  // Helper to extract student display data
  const getStudentInfo = (app) => {
    const cand = app.candidateId || {};
    const appData = app.applicationData || {};

    const name = app.studentName || appData.fullName || cand.fullName || "Candidate";
    const email = app.studentEmail || appData.email || cand.email || "N/A";
    const phone = app.studentPhone || appData.phone || cand.phone || "N/A";
    const address = appData.address || "N/A";
    const education = app.education || appData.education || appData.degree || "B.Tech CSE";
    const college = appData.college || "CareerConnect";
    const graduationYear = appData.graduationYear || "";

    let skillsList = [];
    if (Array.isArray(app.skills) && app.skills.length > 0) {
      skillsList = app.skills;
    } else if (Array.isArray(appData.skills)) {
      skillsList = appData.skills;
    } else if (typeof appData.skills === "string" && appData.skills.trim()) {
      skillsList = appData.skills.split(",").map((s) => s.trim());
    } else if (typeof app.skills === "string" && app.skills.trim()) {
      skillsList = app.skills.split(",").map((s) => s.trim());
    }

    const experience = app.experience || appData.experience || "Fresher";
    const portfolioUrl = app.portfolioUrl || appData.portfolioUrl || "";
    const resumeUrl = app.resumeUrl || appData.resumeUrl || "";
    const coverLetter = app.coverLetter || app.coverNote || appData.coverLetter || appData.coverNote || "";
    const positionTitle = app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Position";
    const positionType = app.opportunityType || (app.internshipId ? "Internship" : "Job");
    const appliedDate = app.appliedAt || app.createdAt
      ? new Date(app.appliedAt || app.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Recently";

    return {
      name,
      email,
      phone,
      address,
      education,
      college,
      graduationYear,
      skillsList,
      experience,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      positionTitle,
      positionType,
      appliedDate,
    };
  };

  // Helper to determine candidate stage index & current stage object
  const getCandidateStageData = (app) => {
    let stages = DEFAULT_STAGES;
    if (app.jobId?.recruitmentStages && app.jobId.recruitmentStages.length > 0) {
      stages = [...app.jobId.recruitmentStages].sort((a, b) => a.order - b.order);
    }

    let currentIndex = -1;
    if (app.currentStageId) {
      currentIndex = stages.findIndex(
        (s) => s._id && s._id.toString() === app.currentStageId.toString()
      );
    }
    if (currentIndex === -1 && (app.currentStageName || app.stage)) {
      const stName = (app.currentStageName || app.stage || "").toLowerCase();
      currentIndex = stages.findIndex((s) => s.name.toLowerCase() === stName);
    }
    if (currentIndex === -1 && typeof app.currentStageIndex === "number") {
      currentIndex = app.currentStageIndex;
    }
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    const currentStage = stages[currentIndex] || stages[0];
    const isFinalStage = currentIndex >= stages.length - 1;
    const nextStage = !isFinalStage ? stages[currentIndex + 1] : null;

    const isSelected = app.overallStatus === "Selected" || app.status === "Selected";
    const isRejected = app.overallStatus === "Rejected" || app.status === "Rejected";

    return {
      stages,
      currentIndex,
      currentStage,
      isFinalStage,
      nextStage,
      isSelected,
      isRejected,
    };
  };

  // Filter applications by search query and active stage
  const filteredApps = useMemo(() => {
    return jobFilteredApps.filter((app) => {
      const info = getStudentInfo(app);
      const stageData = getCandidateStageData(app);

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = info.name.toLowerCase().includes(q);
        const matchEmail = info.email.toLowerCase().includes(q);
        const matchCollege = info.college.toLowerCase().includes(q);
        const matchSkill = info.skillsList.some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchCollege && !matchSkill) return false;
      }

      // Stage matching
      if (activeStageFilter === "All") return true;
      if (activeStageFilter === "Selected") return stageData.isSelected;
      if (activeStageFilter === "Rejected") return stageData.isRejected;

      // Stage name matching
      return (
        !stageData.isSelected &&
        !stageData.isRejected &&
        (stageData.currentStage?.name === activeStageFilter ||
          stageData.currentStage?._id?.toString() === activeStageFilter ||
          app.stage === activeStageFilter)
      );
    });
  }, [jobFilteredApps, activeStageFilter, searchQuery]);

  // Stage counts for tab badges
  const stageCounts = useMemo(() => {
    const counts = { All: jobFilteredApps.length, Selected: 0, Rejected: 0 };
    activeStages.forEach((s) => {
      counts[s.name] = 0;
    });

    jobFilteredApps.forEach((app) => {
      const stageData = getCandidateStageData(app);
      if (stageData.isSelected) {
        counts.Selected = (counts.Selected || 0) + 1;
      } else if (stageData.isRejected) {
        counts.Rejected = (counts.Rejected || 0) + 1;
      } else if (stageData.currentStage) {
        const name = stageData.currentStage.name;
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    return counts;
  }, [jobFilteredApps, activeStages]);

  // Execute Action Confirmations
  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { type, app, targetStage } = actionModal;
    setActionLoading(true);
    try {
      if (type === "move") {
        if (onMoveNextStage) {
          await onMoveNextStage(app._id, actionRemarks);
        }
      } else if (type === "select") {
        if (onSelectCandidate) {
          await onSelectCandidate(app._id, actionRemarks);
        }
      } else if (type === "reject") {
        if (onRejectCandidate) {
          await onRejectCandidate(app._id, actionRemarks);
        }
      } else if (type === "fail") {
        if (onMarkStageFailed) {
          await onMarkStageFailed(app._id, actionRemarks, false);
        }
      }
      setActionModal(null);
      setActionRemarks("");
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedApp) return;
    await onAddNote(selectedApp._id, noteText.trim());
    setNoteText("");
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP CONTROLS: JOB SELECTOR, SEARCH, EXPORT & VIEW     */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Left: Job Filter */}
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Job Vacancy:</span>
          </div>

          <div className="relative">
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setActiveStageFilter("All");
              }}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 transition cursor-pointer outline-none shadow-2xs"
            >
              <option value="All">All Jobs & Vacancies ({applications.length})</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} ({j.employmentType || "Job"})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {currentJob && (
            <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hidden sm:inline-block">
              {activeStages.length} Pipeline Stages
            </span>
          )}
        </div>

        {/* Right: Search, Export & View Mode Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, skill, college..."
              className="h-9 w-44 sm:w-56 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Export Applicants Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download Excel / CSV spreadsheet or PDF report"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Roster</span>
          </button>

          {/* View Mode */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CLEAN DYNAMIC PIPELINE STAGES BAR / METRICS           */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveStageFilter("All")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 cursor-pointer ${
            activeStageFilter === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span>All Applicants</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeStageFilter === "All" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {stageCounts.All || 0}
          </span>
        </button>

        {activeStages.map((stage, sIdx) => {
          const count = stageCounts[stage.name] || 0;
          const isActive = activeStageFilter === stage.name;
          return (
            <button
              key={sIdx}
              type="button"
              onClick={() => setActiveStageFilter(stage.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <span className="opacity-70 text-[10px]">{sIdx + 1}.</span>
              <span>{stage.name}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setActiveStageFilter("Selected")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 cursor-pointer ${
            activeStageFilter === "Selected"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          <span>Selected</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeStageFilter === "Selected" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {stageCounts.Selected || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStageFilter("Rejected")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 cursor-pointer ${
            activeStageFilter === "Rejected"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white border border-rose-200 text-rose-800 hover:bg-rose-50"
          }`}
        >
          <span>Rejected</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeStageFilter === "Rejected" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
            }`}
          >
            {stageCounts.Rejected || 0}
          </span>
        </button>
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#b45309] flex items-center justify-center mx-auto mb-3 text-xl">
            📑
          </div>
          <h4 className="text-sm font-bold text-slate-900">No applicants match this criteria</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No applicants found matching "${searchQuery}".`
              : "Candidates who apply for your postings will appear in their assigned recruitment stage."}
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. KANBAN BOARD VIEW                                     */}
      {/* ======================================================== */}
      {viewMode === "kanban" && filteredApps.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin items-start">
          {activeStages.map((stage, sIdx) => {
            const stageApps = jobFilteredApps.filter((app) => {
              const stageData = getCandidateStageData(app);
              return (
                !stageData.isSelected &&
                !stageData.isRejected &&
                (stageData.currentStage?.name === stage.name ||
                  stageData.currentStage?._id?.toString() === stage._id?.toString() ||
                  app.stage === stage.name)
              );
            });

            return (
              <div
                key={sIdx}
                className="w-72 flex-shrink-0 bg-slate-100/70 rounded-3xl border border-slate-200/80 p-3.5 space-y-3 flex flex-col max-h-[78vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]" title={stage.name}>
                      {stage.name}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-white text-slate-700 shadow-2xs">
                    {stageApps.length}
                  </span>
                </div>

                {/* Candidate Cards Column */}
                <div className="space-y-2.5 overflow-y-auto flex-1 scrollbar-thin pr-1">
                  {stageApps.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No candidates in this round
                    </div>
                  ) : (
                    stageApps.map((app) => {
                      const info = getStudentInfo(app);
                      const stageData = getCandidateStageData(app);

                      return (
                        <div
                          key={app._id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-2xs space-y-2.5 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-bold flex items-center justify-center text-xs">
                                {info.name[0] || "C"}
                              </div>
                              <div>
                                <Link
                                  to={`/employer/applications/${app._id}`}
                                  className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition"
                                >
                                  {info.name}
                                </Link>
                                <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{info.education}</p>
                              </div>
                            </div>
                            <span className="text-[9.5px] font-semibold text-slate-400">
                              {info.appliedDate}
                            </span>
                          </div>

                          {/* Skills badges */}
                          {info.skillsList.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {info.skillsList.slice(0, 3).map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9.5px] font-semibold"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Interview alert if scheduled */}
                          {app.latestInterview && app.latestInterview.status === "scheduled" && (
                            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-800 font-semibold flex items-center gap-1">
                              <span>📅</span>
                              <span className="truncate">
                                {app.latestInterview.scheduledDate} {app.latestInterview.startTime}
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            <Link
                              to={`/employer/applications/${app._id}`}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold transition flex items-center gap-1"
                            >
                              Manage ↗
                            </Link>

                            <div className="flex items-center gap-1">
                              {stage.type.includes("Interview") && (
                                <button
                                  type="button"
                                  onClick={() => onScheduleInterview && onScheduleInterview(app)}
                                  className="p-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px]"
                                  title="Schedule Interview"
                                >
                                  📅
                                </button>
                              )}

                              {!stageData.isFinalStage ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "move",
                                      app,
                                      targetStage: stageData.nextStage,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-[10.5px] font-bold shadow-2xs"
                                >
                                  Next ➔
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "select",
                                      app,
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold shadow-2xs"
                                >
                                  Select ★
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setActionModal({
                                    type: "reject",
                                    app,
                                  })
                                }
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold"
                                title="Reject candidate"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Kanban Selected Column */}
          <div className="w-72 flex-shrink-0 bg-emerald-50/60 rounded-3xl border border-emerald-200 p-3.5 space-y-3 flex flex-col max-h-[78vh]">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold text-xs">★ Selected Candidates</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-600 text-white">
                {stageCounts.Selected || 0}
              </span>
            </div>
            <div className="space-y-2.5 overflow-y-auto flex-1 scrollbar-thin pr-1">
              {jobFilteredApps
                .filter((a) => getCandidateStageData(a).isSelected)
                .map((app) => {
                  const info = getStudentInfo(app);
                  return (
                    <div key={app._id} className="p-3 bg-white rounded-2xl border border-emerald-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/employer/applications/${app._id}`}
                          className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition"
                        >
                          {info.name}
                        </Link>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Selected
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500">{info.education}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          to={`/employer/applications/${app._id}`}
                          className="text-[10.5px] font-bold text-emerald-700 hover:underline"
                        >
                          View Details ↗
                        </Link>
                        {onCreateOffer && (
                          <button
                            type="button"
                            onClick={() => onCreateOffer(app)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10.5px] font-bold"
                          >
                            Create Offer 📜
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. LIST VIEW: COMPLETE PIPELINE PER CANDIDATE            */}
      {/* ======================================================== */}
      {viewMode === "list" && filteredApps.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main List of Candidates */}
          <div className={`${selectedApp ? "lg:col-span-7" : "lg:col-span-12"} space-y-3.5`}>
            {filteredApps.map((app) => {
              const info = getStudentInfo(app);
              const stageData = getCandidateStageData(app);
              const isSelectedCard = selectedApp?._id === app._id;

              return (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white space-y-4 ${
                    isSelectedCard
                      ? "border-indigo-500 ring-4 ring-indigo-50 shadow-sm"
                      : "border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs"
                  }`}
                >
                  {/* Candidate Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Sleek Initial Avatar */}
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-indigo-100 shadow-2xs">
                        {info.name[0]?.toUpperCase() || "C"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/employer/applications/${app._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition"
                          >
                            {info.name}
                          </Link>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60 uppercase tracking-wide">
                            {info.positionType}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">
                          Applied for: <span className="font-semibold text-slate-900">{formatRoleTitle(info.positionTitle)}</span>
                        </p>

                        {/* Contact Info with SVG icons */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-slate-700">{info.email}</span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-slate-700">{info.phone}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stage Status Badge */}
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${
                          stageData.isSelected
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : stageData.isRejected
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stageData.isSelected
                              ? "bg-emerald-500"
                              : stageData.isRejected
                              ? "bg-rose-500"
                              : "bg-blue-500 animate-pulse"
                          }`}
                        />
                        <span>
                          {stageData.isSelected
                            ? "Selected"
                            : stageData.isRejected
                            ? "Rejected"
                            : `Round: ${stageData.currentStage?.name || app.stage}`}
                        </span>
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1.5 font-medium">Applied: {info.appliedDate}</p>
                    </div>
                  </div>

                  {/* Visual Dynamic Recruitment Pipeline Stepper */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span className="uppercase tracking-wider text-[10px] font-bold text-slate-400">
                        Pipeline Evaluation Flow
                      </span>
                      <span className="text-indigo-600 font-bold">
                        {stageData.isSelected
                          ? "Cleared All Stages"
                          : stageData.isRejected
                          ? "Pipeline Concluded"
                          : `Stage ${stageData.currentIndex + 1} of ${stageData.stages.length}`}
                      </span>
                    </div>

                    {/* Stepper bar */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                      {stageData.stages.map((stg, idx) => {
                        const isCompleted = idx < stageData.currentIndex || stageData.isSelected;
                        const isCurrent = idx === stageData.currentIndex && !stageData.isSelected && !stageData.isRejected;

                        return (
                          <React.Fragment key={idx}>
                            <div
                              className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isCurrent
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs ring-2 ring-blue-100"
                                  : "bg-white text-slate-400 border-slate-200"
                              }`}
                            >
                              <span>{isCompleted ? "✓" : isCurrent ? "●" : "○"}</span>
                              <span>{stg.name}</span>
                            </div>
                            {idx < stageData.stages.length - 1 && (
                              <span
                                className={`text-xs font-bold ${
                                  isCompleted ? "text-emerald-500" : "text-slate-300"
                                }`}
                              >
                                →
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })}

                      <span className="text-slate-300 font-bold text-xs">→</span>

                      <div
                        className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs font-semibold border ${
                          stageData.isSelected
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                            : stageData.isRejected
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        {stageData.isSelected ? "Selected" : stageData.isRejected ? "Rejected" : "Decision"}
                      </div>
                    </div>
                  </div>

                  {/* Candidate background info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-sm">🎓</span>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Education</span>
                        <span className="font-semibold text-slate-800">{info.education} · {info.college}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 text-sm">💼</span>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Experience</span>
                        <span className="font-semibold text-slate-800">{info.experience}</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills badges */}
                  {info.skillsList.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Skills:</span>
                      {info.skillsList.slice(0, 6).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold border border-slate-200/60"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Active Interview Notice if scheduled */}
                  {app.latestInterview && (
                    <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">📅</span>
                        <div>
                          <p className="font-bold text-blue-950">
                            {app.latestInterview.roundName || "Interview Round"} Scheduled
                          </p>
                          <p className="text-[11px] text-blue-700">
                            {app.latestInterview.scheduledDate} at {app.latestInterview.startTime} ({app.latestInterview.meetingMode || "Online"})
                          </p>
                        </div>
                      </div>
                      {app.latestInterview.meetingLink && (
                        <a
                          href={app.latestInterview.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs"
                        >
                          Join Meeting ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* STAGE-SPECIFIC ACTIONS ROW                               */}
                  {/* ======================================================== */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/employer/applications/${app._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Manage Application</span>
                        <span className="text-[10px]">↗</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingHistoryApp(app);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Round History</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {!stageData.isSelected && !stageData.isRejected && (
                        <>
                          {/* Interview Specific Action */}
                          {stageData.currentStage?.type.includes("Interview") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onScheduleInterview && onScheduleInterview(app);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>📅</span>
                              <span>{app.latestInterview ? "Reschedule" : "Schedule Interview"}</span>
                            </button>
                          )}

                          {/* Move to Next Stage (Unless at Final Stage) */}
                          {!stageData.isFinalStage ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModal({
                                  type: "move",
                                  app,
                                  targetStage: stageData.nextStage,
                                });
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Advance ➔</span>
                              <span>{stageData.nextStage?.name || "Next Stage"}</span>
                            </button>
                          ) : (
                            /* Final Stage Actions: Select Candidate */
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModal({
                                  type: "select",
                                  app,
                                });
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Select Candidate</span>
                            </button>
                          )}

                          {/* Reject Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({
                                type: "reject",
                                app,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {stageData.isSelected && onCreateOffer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateOffer(app);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Generate Offer Letter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side Panel: Selected Applicant Quick Info */}
          {selectedApp && (
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4 sticky top-20 h-fit">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {getStudentInfo(selectedApp).name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {getStudentInfo(selectedApp).positionTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Active Stage</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {getCandidateStageData(selectedApp).currentStage?.name || selectedApp.stage}
                </span>
              </div>

              <div className="space-y-2">
                <Link
                  to={`/employer/applications/${selectedApp._id}`}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Application Page ↗</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingHistoryApp(selectedApp)}
                  className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Full Round History & Notes</span>
                </button>
              </div>

              {/* Internal Recruiter Notes */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Private Recruiter Notes</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(selectedApp.notes || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400">No notes yet.</p>
                  ) : (
                    (selectedApp.notes || []).map((n, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600">
                        {n.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendNote} className="flex gap-1.5">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add private note..."
                    className="flex-1 h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 h-8 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Save
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ACTION REMARKS & CONFIRMATION MODAL                   */}
      {/* ======================================================== */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {actionModal.type === "move" && <span>🚀 Move to Next Stage</span>}
                {actionModal.type === "select" && <span>🎉 Final Candidate Selection</span>}
                {actionModal.type === "reject" && <span>✕ Reject Application</span>}
                {actionModal.type === "fail" && <span>⚠️ Mark Stage Failed</span>}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                Candidate: <strong className="text-slate-900">{getStudentInfo(actionModal.app).name}</strong>
              </p>
              {actionModal.type === "move" && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold">
                  Advancing to: <strong className="text-indigo-700">{actionModal.targetStage?.name || "Next Stage"}</strong>
                </div>
              )}
              {actionModal.type === "select" && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 font-semibold">
                  This will mark the candidate as officially <strong>SELECTED</strong>.
                </div>
              )}
              {actionModal.type === "reject" && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-900">
                  This candidate will be marked as Rejected and cannot progress further.
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Private Remarks / Evaluation Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="e.g. Cleared problem solving with distinction; good communication..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                  actionModal.type === "select"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {actionLoading ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. STAGE HISTORY AUDIT TRAIL MODAL                       */}
      {/* ======================================================== */}
      {viewingHistoryApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>📜</span> Recruitment Stage Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  {getStudentInfo(viewingHistoryApp).name} · {getStudentInfo(viewingHistoryApp).positionTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryApp(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {(viewingHistoryApp.stageHistory || []).length === 0 ? (
                <p className="text-slate-400 text-center py-6">No historical records found.</p>
              ) : (
                (viewingHistoryApp.stageHistory || []).map((sh, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs">
                        Round {idx + 1}: {sh.stageName || sh.stage || `Stage ${idx + 1}`}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sh.status === "Passed" || sh.status === "Selected"
                            ? "bg-emerald-100 text-emerald-800"
                            : sh.status === "Failed" || sh.status === "Rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sh.status || "In Progress"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      {sh.startedAt && (
                        <span>
                          Started: {new Date(sh.startedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {sh.completedAt && (
                        <span>
                          Completed: {new Date(sh.completedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {sh.remarks && (
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px]">
                        <strong className="text-slate-900">Private Remarks:</strong> {sh.remarks}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingHistoryApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. COMPLETE APPLICATION VIEW MODAL                       */}
      {/* ======================================================== */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            {(() => {
              const info = getStudentInfo(viewingApp);
              const stageData = getCandidateStageData(viewingApp);

              return (
                <>
                  <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white relative">
                    <button
                      type="button"
                      onClick={() => setViewingApp(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-sm font-bold"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {info.positionType}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-white border border-white/20">
                        Current Stage: {stageData.currentStage?.name || viewingApp.stage}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{info.name}</h2>
                    <p className="text-xs font-medium text-blue-200 mt-1">
                      Applied for: <strong className="text-white">{info.positionTitle}</strong> · {info.appliedDate}
                    </p>
                  </div>

                  <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
                    {/* Personal Info */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                          <span className="font-semibold text-slate-800">{info.name}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                          <a href={`mailto:${info.email}`} className="font-semibold text-blue-600 hover:underline">{info.email}</a>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                          <span className="font-semibold text-slate-800">{info.phone}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Address</span>
                          <span className="font-semibold text-slate-800">{info.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Education */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Academic Background
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Degree</span>
                          <span className="font-semibold text-slate-800">{info.education}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">College</span>
                          <span className="font-semibold text-slate-800">{info.college}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Graduation Year</span>
                          <span className="font-semibold text-slate-800">{info.graduationYear || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Skills & Qualifications
                      </h4>
                      <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                        {info.skillsList.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Resume & Portfolio */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Documents & Links
                      </h4>
                      <div className="flex items-center gap-3 flex-wrap">
                        {info.resumeUrl ? (
                          <a
                            href={info.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <span>📄</span> View Student Resume ↗
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No resume attached</span>
                        )}

                        {info.portfolioUrl && (
                          <a
                            href={info.portfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <span>🔗</span> Portfolio / GitHub ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingApp(null)}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                    >
                      Close Form
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. APPLICANT EXPORT MODAL (EXCEL/CSV & PDF)              */}
      {/* ======================================================== */}
      <ApplicantExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        jobs={jobs}
        applications={jobFilteredApps}
        initialJobId={selectedJobId}
        initialStage={activeStageFilter}
      />
    </div>
  );
};

export default ATSPipelineView;
