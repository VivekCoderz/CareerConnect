import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  Search,
  X,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  RotateCcw,
  FileText,
  Star,
  Plus,
  Award,
  XCircle,
} from "lucide-react";
import recruitmentService from "../../services/recruitmentService";
import InterviewScheduleModal from "./InterviewScheduleModal";
import InterviewCancelModal from "./InterviewCancelModal";

const TABS = [
  { id: "All", label: "All" },
  { id: "Scheduled", label: "Scheduled" },
  { id: "Completed", label: "Completed" },
  { id: "Rescheduled", label: "Rescheduled" },
  { id: "Cancelled", label: "Cancelled" },
];

const InterviewManagementHub = ({
  interviews: initialInterviews = [],
  stats: initialStats = null,
  jobs = [],
  onRefresh,
  showToast = () => {},
  onOpenOfferModal = null,
}) => {
  // Data State
  const [interviews, setInterviews] = useState(initialInterviews);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter States (synchronized activeTab & statusFilter)
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roundFilter, setRoundFilter] = useState("All");
  const [dateSort, setDateSort] = useState("desc"); // "desc" | "asc"
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals & Drawer States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [drawerInterview, setDrawerInterview] = useState(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Drawer Scorecard Editing State
  const [scorecardForm, setScorecardForm] = useState({
    technicalSkills: 4,
    problemSolving: 4,
    communication: 4,
    roleKnowledge: 4,
    cultureFit: 4,
    recommendation: "Hire",
    feedback: "",
    isFinalRound: false,
  });
  const [isSavingScorecard, setIsSavingScorecard] = useState(false);

  const actionMenuRef = useRef(null);

  // Dynamic Statistics and Tab Counts computed live from real MongoDB data
  const { displayStats, displayTabCounts } = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    let rescheduled = 0;
    let cancelled = 0;
    let pendingEvaluation = 0;

    (interviews || []).forEach((item) => {
      const s = (item?.status || "").toLowerCase();
      if (s === "scheduled") {
        scheduled++;
      } else if (s === "rescheduled") {
        rescheduled++;
      } else if (s === "completed") {
        completed++;
        const hasScorecard =
          (item.scorecard && item.scorecard.submittedAt) ||
          (item.feedback && item.feedback.submittedAt) ||
          (Number(item.scorecard?.overallScore) > 0);
        if (!hasScorecard) {
          pendingEvaluation++;
        }
      } else if (s === "cancelled") {
        cancelled++;
      }
    });

    const upcoming = scheduled + rescheduled;
    const total = (interviews || []).length;

    return {
      displayStats: {
        upcoming,
        completed,
        pendingEvaluation,
        total,
      },
      displayTabCounts: {
        All: total,
        Scheduled: scheduled,
        Completed: completed,
        Rescheduled: rescheduled,
        Cancelled: cancelled,
      },
    };
  }, [interviews]);

  // Debounce search input
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close action dropdown menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch interviews dynamically from MongoDB backend
  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton && (!interviews || interviews.length === 0)) setLoading(true);
    setError(null);
    try {
      const res = await recruitmentService.getInterviews();
      if (res?.interviews) {
        setInterviews(res.interviews);
      }
    } catch (err) {
      console.error("Failed to load interviews:", err);
      setError("Unable to load interviews. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [interviews?.length]);

  useEffect(() => {
    loadData(!interviews || interviews.length === 0);
  }, []);

  // Sync initialInterviews if parent passes them
  useEffect(() => {
    if (initialInterviews && initialInterviews.length > 0) {
      setInterviews(initialInterviews);
    }
  }, [initialInterviews]);

  // Close Drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (drawerInterview) setDrawerInterview(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerInterview]);

  // Two-way synchronization between Status Dropdown and Status Tabs
  const handleStatusChange = (val) => {
    setStatusFilter(val);
    const matchedTab = TABS.find((t) => t.id.toLowerCase() === val.toLowerCase());
    if (matchedTab) {
      setActiveTab(matchedTab.id);
    } else {
      setActiveTab("All");
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setStatusFilter(tabId === "All" ? "All" : tabId.toLowerCase());
  };

  // Dynamically filtered and sorted interviews list
  const filteredInterviews = useMemo(() => {
    return (interviews || [])
      .filter((item) => {
        // 1. Status Filter (activeTab and statusFilter in sync)
        const active = (statusFilter !== "All" ? statusFilter : activeTab).toLowerCase();
        if (active !== "all") {
          const s = (item?.status || "").toLowerCase();
          if (active === "upcoming") {
            if (s !== "scheduled" && s !== "rescheduled") return false;
          } else if (s !== active) {
            return false;
          }
        }

        // 2. Round Filter
        if (roundFilter !== "All") {
          const rNum = Number(roundFilter);
          const itemRound = Number(item?.roundNumber) || 1;
          if (rNum === 3) {
            if (itemRound < 3) return false;
          } else {
            if (itemRound !== rNum) return false;
          }
        }

        // 3. Search Query
        const term = debouncedSearch || searchQuery.trim();
        if (term) {
          const q = term.toLowerCase();
          const cName = (
            item?.candidateId?.fullName ||
            item?.candidateName ||
            item?.applicationId?.studentName ||
            ""
          ).toLowerCase();
          const cEmail = (
            item?.candidateId?.email ||
            item?.applicationId?.studentEmail ||
            ""
          ).toLowerCase();
          const jTitle = (
            item?.jobId?.title ||
            item?.internshipId?.title ||
            item?.applicationId?.opportunityTitle ||
            ""
          ).toLowerCase();
          const roundName = (item?.roundName || "").toLowerCase();
          const interviewer = (item?.interviewerName || "").toLowerCase();

          const matches =
            cName.includes(q) ||
            cEmail.includes(q) ||
            jTitle.includes(q) ||
            roundName.includes(q) ||
            interviewer.includes(q);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a?.scheduledDate || a?.createdAt || 0).getTime();
        const dateB = new Date(b?.scheduledDate || b?.createdAt || 0).getTime();
        return dateSort === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [interviews, statusFilter, activeTab, roundFilter, debouncedSearch, searchQuery, dateSort]);

  // Open Drawer and initialize scorecard form
  const openDrawer = (interview) => {
    setDrawerInterview(interview);
    const sc = interview.scorecard || {};
    const fb = interview.feedback || {};
    setScorecardForm({
      technicalSkills: sc.technicalSkills || fb.technicalScore || 4,
      problemSolving: sc.problemSolving || 4,
      communication: sc.communication || fb.communicationScore || 4,
      roleKnowledge: sc.roleKnowledge || 4,
      cultureFit: sc.cultureFit || 4,
      recommendation: sc.recommendation || fb.recommendation || "Hire",
      feedback: sc.feedback || fb.comments || interview.interviewerFeedback || "",
      isFinalRound: interview.roundNumber >= 3,
    });
  };

  // Status Badge Formatter
  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "scheduled":
        return { label: "Scheduled", classes: "bg-blue-50 text-blue-700 border-blue-200" };
      case "completed":
        return { label: "Completed", classes: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold" };
      case "rescheduled":
        return { label: "Rescheduled", classes: "bg-amber-50 text-amber-800 border-amber-200" };
      case "cancelled":
        return { label: "Cancelled", classes: "bg-rose-50 text-rose-700 border-rose-200" };
      default:
        return { label: status || "Pending", classes: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  // Helper to get candidate and job display names
  const getInterviewDisplay = (interview) => {
    const cName =
      interview.candidateId?.fullName ||
      interview.candidateName ||
      interview.applicationId?.studentName ||
      "Candidate";

    const jTitle =
      interview.jobId?.title ||
      interview.internshipId?.title ||
      interview.applicationId?.opportunityTitle ||
      "Position";

    const roundName = interview.roundName || `Round ${interview.roundNumber || 1} - Technical`;
    const date = interview.scheduledDate || "Date TBD";
    const time = interview.scheduledTime || interview.startTime || "Time TBD";
    const interviewer = interview.interviewerName || "Hiring Team Lead";
    const status = interview.status || "scheduled";
    const meetingLink = interview.meetingLink || "";

    return {
      cName,
      jTitle,
      roundName,
      date,
      time,
      interviewer,
      status,
      meetingLink,
    };
  };

  // Quick Action: Mark as Completed
  const handleMarkCompleted = async (interviewId) => {
    setActionLoadingId(interviewId);
    try {
      const res = await recruitmentService.completeInterview(interviewId);
      if (res?.success) {
        showToast("Interview marked as completed!");
        setInterviews((prev) =>
          prev.map((i) => (i._id === interviewId ? { ...i, status: "completed" } : i))
        );
        if (drawerInterview && drawerInterview._id === interviewId) {
          setDrawerInterview((prev) => ({ ...prev, status: "completed" }));
        }
        loadData(false);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to mark interview completed", "error");
    } finally {
      setActionLoadingId(null);
      setActionMenuOpenId(null);
    }
  };

  // Quick Action: Submit Scorecard
  const handleSaveScorecard = async (e) => {
    e?.preventDefault();
    if (!drawerInterview) return;
    setIsSavingScorecard(true);
    try {
      const payload = {
        scorecard: {
          technicalSkills: Number(scorecardForm.technicalSkills),
          problemSolving: Number(scorecardForm.problemSolving),
          communication: Number(scorecardForm.communication),
          roleKnowledge: Number(scorecardForm.roleKnowledge),
          cultureFit: Number(scorecardForm.cultureFit),
          recommendation: scorecardForm.recommendation,
          feedback: scorecardForm.feedback,
        },
        feedback: scorecardForm.feedback,
        recommendation: scorecardForm.recommendation,
        isFinalRound: scorecardForm.isFinalRound,
        markSelected: scorecardForm.recommendation === "Strong Hire" || scorecardForm.recommendation === "Hire",
      };

      const res = await recruitmentService.submitScorecard(drawerInterview._id, payload);
      if (res?.success) {
        showToast("Scorecard recorded successfully!");
        setDrawerInterview(res.interview || { ...drawerInterview, scorecard: payload.scorecard, status: "completed" });
        setInterviews((prev) =>
          prev.map((i) =>
            i._id === drawerInterview._id ? (res.interview ? res.interview : { ...i, scorecard: payload.scorecard, status: "completed" }) : i
          )
        );
        loadData(false);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save scorecard", "error");
    } finally {
      setIsSavingScorecard(false);
    }
  };

  // Handle Confirmed Cancellation
  const handleConfirmCancel = async (cancellationData) => {
    if (!cancelModalItem) return;
    setActionLoadingId(cancelModalItem._id);
    try {
      const res = await recruitmentService.cancelInterview(cancelModalItem._id, cancellationData);
      if (res?.success) {
        showToast("Interview cancelled. Candidate remains Shortlisted.");
        setInterviews((prev) =>
          prev.map((i) =>
            i._id === cancelModalItem._id ? { ...i, status: "cancelled", ...cancellationData } : i
          )
        );
        if (drawerInterview && drawerInterview._id === cancelModalItem._id) {
          setDrawerInterview((prev) => ({ ...prev, status: "cancelled", ...cancellationData }));
        }
        setCancelModalItem(null);
        loadData(false);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to cancel interview", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setActiveTab("All");
    setRoundFilter("All");
    setDateSort("desc");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "All" ||
    activeTab !== "All" ||
    roundFilter !== "All" ||
    dateSort !== "desc";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======================================================== */}
      {/* 1. COMPACT HEADER                                        */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interview Scheduling</h2>
          <p className="text-xs text-slate-500">Schedule and manage candidate interviews.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRescheduleItem(null);
            setIsScheduleModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Interview</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. THREE COMPACT STATISTICS (Upcoming, Completed, Pending)*/}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Upcoming */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Upcoming</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{displayStats.upcoming}</span>
            <span className="text-[11px] text-blue-600 font-semibold">Active slots</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled & rescheduled</p>
        </div>

        {/* Card 2: Completed */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{displayStats.completed}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">Conducted</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Finished interview rounds</p>
        </div>

        {/* Card 3: Pending Evaluation */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Evaluation</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{displayStats.pendingEvaluation}</span>
            <span className="text-[11px] text-purple-600 font-semibold">Needs scorecard</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting recruiter feedback</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEARCH + COMPACT FILTERS                              */}
      {/* ======================================================== */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or job..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Round Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="All">All Rounds</option>
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
              <option value="3">Round 3+</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Sort */}
          <div className="relative min-w-[130px]">
            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              title="Reset all filters"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. INTERVIEW STATUS TABS (Dynamic Counts)                */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((tab) => {
          const isActive = activeTab.toLowerCase() === tab.id.toLowerCase();
          const count = displayTabCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 5. INTERVIEW LIST (Compact Cards)                        */}
      {/* ======================================================== */}
      {loading ? (
        // Skeleton Loaders
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-white border border-slate-200/60 animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-1/2">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
              <div className="w-24 h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-10 rounded-3xl bg-white border border-rose-100 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Unable to load interviews</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            {hasActiveFilters
              ? statusFilter !== "All"
                ? `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Interviews`
                : "No matching interviews found"
              : "No interviews scheduled yet."}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? `There are currently no interviews matching your criteria (${
                  statusFilter !== "All" ? `Status: ${statusFilter}` : ""
                }${roundFilter !== "All" ? ` | Round: ${roundFilter}` : ""}${
                  searchQuery ? ` | Search: "${searchQuery}"` : ""
                }). Try changing filters or reset.`
              : "Click '+ Schedule Interview' above to schedule an interview with any shortlisted candidate."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((item) => {
            const { cName, jTitle, roundName, date, time, interviewer, status, meetingLink } =
              getInterviewDisplay(item);
            const badge = getStatusBadge(status);
            const isMenuOpen = actionMenuOpenId === item._id;
            const isActionLoading = actionLoadingId === item._id;
            const isScheduledOrRescheduled =
              status.toLowerCase() === "scheduled" || status.toLowerCase() === "rescheduled";
            const isCompleted = status.toLowerCase() === "completed";

            return (
              <div
                key={item._id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Compact Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Candidate Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                    {cName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Candidate Name + Status Pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className="text-sm font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer truncate"
                        onClick={() => openDrawer(item)}
                      >
                        {cName}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Job Title & Round Name */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-800">{jTitle}</span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">{roundName}</span>
                    </div>

                    {/* Date • Time • Interviewer */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {time}
                      </span>
                      <span>•</span>
                      <span className="truncate">Interviewer: {interviewer}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions [View Interview] + [⋮] */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {/* Primary Action Button */}
                  <button
                    type="button"
                    onClick={() => openDrawer(item)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Interview</span>
                  </button>

                  {/* [⋮] Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuOpenId(isMenuOpen ? null : item._id);
                      }}
                      className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 py-1.5 animate-scale-in text-xs"
                      >
                        {/* Join Meeting link if online and scheduled */}
                        {isScheduledOrRescheduled && meetingLink && (
                          <a
                            href={meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-blue-700 font-medium flex items-center gap-2 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Join Interview</span>
                          </a>
                        )}

                        {/* Mark Completed (for active interviews) */}
                        {isScheduledOrRescheduled && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleMarkCompleted(item._id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}

                        {/* Reschedule */}
                        {isScheduledOrRescheduled && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpenId(null);
                              setRescheduleItem(item);
                              setIsScheduleModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 font-medium flex items-center gap-2 cursor-pointer transition"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </button>
                        )}

                        {/* Cancel Interview */}
                        {isScheduledOrRescheduled && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpenId(null);
                              setCancelModalItem(item);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-2 cursor-pointer transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Interview</span>
                          </button>
                        )}

                        {/* Record Scorecard (if completed) */}
                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpenId(null);
                              openDrawer(item);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-purple-700 font-medium flex items-center gap-2 cursor-pointer transition"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>Record Scorecard</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SLIDE-OVER INTERVIEW DETAILS & SCORECARD DRAWER        */}
      {/* ======================================================== */}
      {drawerInterview && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerInterview(null)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-10 animate-slide-left">
            {/* Drawer Header */}
            {(() => {
              const { cName, jTitle, roundName, date, time, interviewer, status, meetingLink } =
                getInterviewDisplay(drawerInterview);
              const badge = getStatusBadge(status);
              const isScheduled =
                status.toLowerCase() === "scheduled" || status.toLowerCase() === "rescheduled";
              const isCompleted = status.toLowerCase() === "completed";

              return (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                        {cName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 truncate">{cName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.classes}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Applied for <strong className="text-slate-700">{jTitle}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDrawerInterview(null)}
                      className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Scrollable Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Schedule Overview Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{roundName}</span>
                        <span className="text-slate-500 font-medium">Round {drawerInterview.roundNumber || 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Date:</span>
                          <p className="font-semibold text-slate-800">{date}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Time:</span>
                          <p className="font-semibold text-slate-800">{time}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Interviewer:</span>
                          <p className="font-semibold text-slate-800 truncate">{interviewer}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Mode:</span>
                          <p className="font-semibold text-slate-800">{drawerInterview.interviewType || "Online"}</p>
                        </div>
                      </div>

                      {meetingLink && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {meetingLink}
                          </span>
                          <a
                            href={meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <span>Join Meeting</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Multi-Round Progress Indicator */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Interview Round Progress
                      </h4>
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                          <span className="font-semibold text-slate-800">Round 1 Technical</span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              (drawerInterview.roundNumber || 1) >= 2
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {(drawerInterview.roundNumber || 1) >= 2 ? "✓" : "●"}
                          </span>
                          <span className="font-semibold text-slate-700">Round 2 Coding</span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              (drawerInterview.roundNumber || 1) >= 3
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {(drawerInterview.roundNumber || 1) >= 3 ? "✓" : "○"}
                          </span>
                          <span className="font-semibold text-slate-700">Round 3 HR</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stage Progression Actions for Active Interviews */}
                    {isScheduled && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Interview Actions
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMarkCompleted(drawerInterview._id)}
                            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark Completed</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleItem(drawerInterview);
                              setIsScheduleModalOpen(true);
                            }}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <span>Reschedule</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCancelModalItem(drawerInterview)}
                          className="w-full py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                        >
                          Cancel This Interview Slot
                        </button>
                      </div>
                    )}

                    {/* Scorecard Form (Always available or when completed) */}
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500" />
                          Candidate Scorecard
                        </h4>
                        {drawerInterview.scorecard?.overallScore > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Score: {drawerInterview.scorecard.overallScore} / 5.0
                          </span>
                        )}
                      </div>

                      <form onSubmit={handleSaveScorecard} className="space-y-3.5">
                        {/* Technical Skills */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Technical Skills</span>
                            <span className="font-mono font-bold text-amber-700">
                              {scorecardForm.technicalSkills} / 5
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={scorecardForm.technicalSkills}
                            onChange={(e) =>
                              setScorecardForm({ ...scorecardForm, technicalSkills: Number(e.target.value) })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Problem Solving */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Problem Solving</span>
                            <span className="font-mono font-bold text-amber-700">
                              {scorecardForm.problemSolving} / 5
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={scorecardForm.problemSolving}
                            onChange={(e) =>
                              setScorecardForm({ ...scorecardForm, problemSolving: Number(e.target.value) })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Communication */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Communication</span>
                            <span className="font-mono font-bold text-amber-700">
                              {scorecardForm.communication} / 5
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            value={scorecardForm.communication}
                            onChange={(e) =>
                              setScorecardForm({ ...scorecardForm, communication: Number(e.target.value) })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Overall Calculated Score */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Overall Rating:</span>
                          <span className="text-sm font-extrabold text-slate-900 font-mono">
                            {(
                              (Number(scorecardForm.technicalSkills) +
                                Number(scorecardForm.problemSolving) +
                                Number(scorecardForm.communication)) /
                              3
                            ).toFixed(1)}{" "}
                            / 5.0
                          </span>
                        </div>

                        {/* Recommendation */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Hiring Recommendation
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                            {["Next Round", "Hire", "Hold", "Reject"].map((rec) => {
                              const isSel = scorecardForm.recommendation === rec;
                              return (
                                <button
                                  key={rec}
                                  type="button"
                                  onClick={() => setScorecardForm({ ...scorecardForm, recommendation: rec })}
                                  className={`py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                                    isSel
                                      ? rec === "Reject"
                                        ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                                        : "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {rec}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Feedback / Comments */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Evaluator Notes & Feedback
                          </label>
                          <textarea
                            rows={3}
                            value={scorecardForm.feedback}
                            onChange={(e) =>
                              setScorecardForm({ ...scorecardForm, feedback: e.target.value })
                            }
                            placeholder="Add evaluation summary, key strengths, or concerns..."
                            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                          />
                        </div>

                        {/* Save Scorecard Button */}
                        <button
                          type="submit"
                          disabled={isSavingScorecard}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingScorecard ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Award className="w-4 h-4" />
                          )}
                          <span>Save Scorecard</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SCHEDULE / RESCHEDULE MODAL                           */}
      {/* ======================================================== */}
      {isScheduleModalOpen && (
        <InterviewScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setRescheduleItem(null);
          }}
          onSchedule={async (payload) => {
            const res = await recruitmentService.scheduleInterview(payload);
            if (res?.success) {
              showToast("Interview scheduled successfully!");
              setIsScheduleModalOpen(false);
              loadData(false);
            }
          }}
          onReschedule={async (id, payload) => {
            const res = await recruitmentService.rescheduleInterview(id, payload);
            if (res?.success) {
              showToast("Interview rescheduled successfully!");
              setIsScheduleModalOpen(false);
              setRescheduleItem(null);
              loadData(false);
            }
          }}
          interviewToReschedule={rescheduleItem}
          jobs={jobs}
        />
      )}

      {/* ======================================================== */}
      {/* 8. CANCEL INTERVIEW MODAL                                */}
      {/* ======================================================== */}
      {cancelModalItem && (
        <InterviewCancelModal
          isOpen={Boolean(cancelModalItem)}
          onClose={() => setCancelModalItem(null)}
          interview={cancelModalItem}
          onConfirmCancel={handleConfirmCancel}
          loading={actionLoadingId === cancelModalItem?._id}
        />
      )}
    </div>
  );
};

export default InterviewManagementHub;
