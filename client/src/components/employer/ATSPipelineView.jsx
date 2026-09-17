import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Award,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Download,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  getEmployerApplications,
  updateApplicationStatus,
  addApplicationNote,
} from "../../services/recruitmentService";
import { getApplicationById } from "../../services/applicationService";

// Canonical ATS Stages (Never include "Approved")
export const ATS_STAGES = [
  { id: "Applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Shortlisted", label: "Shortlisted", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Assessment", label: "Assessment", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Interview", label: "Interview", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Offer", label: "Offer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Hired", label: "Hired", color: "bg-teal-50 text-teal-800 border-teal-300" },
  { id: "Rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "Withdrawn", label: "Withdrawn", color: "bg-slate-100 text-slate-600 border-slate-200" },
];

export const PIPELINE_TABS = [
  { id: "All", label: "All Candidates" },
  ...ATS_STAGES,
];

// Helper to normalize stage name
const normalizeStage = (status) => {
  if (!status) return "Applied";
  const s = String(status).trim();
  if (s === "Approved" || s === "Screening" || s === "Under Review") return "Applied";
  if (s === "Interview Scheduled" || s === "Interview Completed") return "Interview";
  if (s === "Offered" || s === "Selected") return "Offer";
  return s;
};

// Stage badge color helper
const getStageBadgeClasses = (status) => {
  const norm = normalizeStage(status);
  switch (norm) {
    case "Shortlisted":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Assessment":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Interview":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Offer":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Hired":
      return "bg-teal-50 text-teal-800 border-teal-300 font-semibold";
    case "Rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Withdrawn":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "Applied":
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
};

// Extract safe candidate summary info
const getCandidateDisplayInfo = (app) => {
  if (!app) return {};
  const cand = app.candidateId || {};
  const appData = app.applicationData || {};

  const name =
    app.studentName ||
    appData.fullName ||
    cand.fullName ||
    cand.name ||
    (cand.userId && (cand.userId.fullName || cand.userId.name)) ||
    "Candidate";

  const email =
    app.studentEmail ||
    appData.email ||
    cand.email ||
    (cand.userId && cand.userId.email) ||
    "";

  const phone =
    app.studentPhone ||
    appData.phone ||
    cand.phone ||
    (cand.userId && cand.userId.phone) ||
    "";

  const location =
    appData.address ||
    cand.location?.city ||
    cand.location ||
    appData.city ||
    "Not specified";

  const education =
    app.education ||
    appData.education ||
    appData.degree ||
    (cand.education && cand.education[0]?.degree) ||
    "B.Tech Computer Science";

  const college =
    appData.college ||
    (cand.education && cand.education[0]?.institution) ||
    "Geeta University";

  const graduationYear =
    appData.graduationYear ||
    (cand.education && cand.education[0]?.yearOfPassing) ||
    "";

  let skillsList = [];
  if (Array.isArray(app.skills) && app.skills.length > 0) {
    skillsList = app.skills;
  } else if (Array.isArray(appData.skills) && appData.skills.length > 0) {
    skillsList = appData.skills;
  } else if (Array.isArray(cand.skills) && cand.skills.length > 0) {
    skillsList = cand.skills.map((s) => (typeof s === "string" ? s : s.name || s.skill || ""));
  } else if (typeof appData.skills === "string" && appData.skills.trim()) {
    skillsList = appData.skills.split(",").map((s) => s.trim());
  } else if (typeof app.skills === "string" && app.skills.trim()) {
    skillsList = app.skills.split(",").map((s) => s.trim());
  }

  const experience =
    app.experience ||
    appData.experience ||
    (cand.experience && cand.experience[0]?.title ? `${cand.experience[0].title}` : "Fresher");

  const portfolioUrl =
    app.portfolioUrl ||
    appData.portfolioUrl ||
    cand.links?.portfolio ||
    cand.portfolio ||
    "";

  const linkedinUrl =
    appData.linkedinUrl ||
    cand.links?.linkedin ||
    cand.linkedin ||
    "";

  const githubUrl =
    appData.githubUrl ||
    cand.links?.github ||
    cand.github ||
    "";

  const resumeUrl =
    app.resumeUrl ||
    appData.resumeUrl ||
    cand.resumeUrl ||
    cand.resume ||
    "";

  const coverLetter =
    app.coverLetter ||
    app.coverNote ||
    appData.coverLetter ||
    appData.coverNote ||
    "";

  const jobTitle =
    app.opportunityTitle ||
    app.jobId?.title ||
    app.internshipId?.title ||
    "Role / Position";

  const jobType =
    app.opportunityType ||
    (app.internshipId ? "Internship" : "Full-time");

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
    location,
    education,
    college,
    graduationYear,
    skillsList,
    experience,
    portfolioUrl,
    linkedinUrl,
    githubUrl,
    resumeUrl,
    coverLetter,
    jobTitle,
    jobType,
    appliedDate,
  };
};

const ATSPipelineView = ({
  jobs = [],
  onScheduleInterview,
  onCreateOffer,
}) => {
  // State
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Dynamic Metrics & Pipeline Counts
  const [stats, setStats] = useState({
    totalApplications: 0,
    shortlisted: 0,
    interviews: 0,
    offers: 0,
  });

  const [pipelineCounts, setPipelineCounts] = useState({
    All: 0,
    Applied: 0,
    Shortlisted: 0,
    Assessment: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
    Withdrawn: 0,
  });

  // Filter & Search States
  const [activeStage, setActiveStage] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("All");
  const [selectedExperience, setSelectedExperience] = useState("All");
  const [dateSort, setDateSort] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Slide-over Drawer State
  const [drawerAppId, setDrawerAppId] = useState(null);
  const [drawerApp, setDrawerApp] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState("profile"); // profile | hiring | notes
  const [previewResumeData, setPreviewResumeData] = useState(null); // { url, candidateName, jobTitle }

  // Recruiter Note Form inside Drawer
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Quick Action Dropdown State for Candidate Cards
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // Debounce search input (skip first render)
  const isSearchFirstRender = useRef(true);
  useEffect(() => {
    if (isSearchFirstRender.current) {
      isSearchFirstRender.current = false;
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Close card action menu on outside click & handle Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewResumeData) {
          setPreviewResumeData(null);
        } else if (drawerAppId) {
          closeDrawer();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewResumeData, drawerAppId]);

  // Fetch applications from server
  const loadApplications = useCallback(
    async (showSkeleton = true) => {
      if (showSkeleton) setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit,
          search: debouncedSearch || undefined,
          stage: activeStage !== "All" ? activeStage : undefined,
          jobId: selectedJobId !== "All" ? selectedJobId : undefined,
          experience: selectedExperience !== "All" ? selectedExperience : undefined,
          dateSort: dateSort,
        };

        const res = await getEmployerApplications(params);
        if (res && res.applications) {
          setApplications(res.applications);
          if (res.stats) setStats(res.stats);
          if (res.pipelineCounts) setPipelineCounts(res.pipelineCounts);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages || 1);
            setTotalCount(res.pagination.totalCount || res.applications.length);
          }
        } else if (Array.isArray(res)) {
          setApplications(res);
        }
      } catch (err) {
        console.error("Failed to load ATS applications:", err);
        setError("Failed to load applications. Please verify your connection.");
      } finally {
        if (showSkeleton) setLoading(false);
      }
    },
    [
      page,
      limit,
      debouncedSearch,
      activeStage,
      selectedJobId,
      selectedExperience,
      dateSort,
    ]
  );

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Load single application details for drawer
  const openDrawer = async (appId) => {
    setDrawerAppId(appId);
    setDrawerLoading(true);
    // Find initial app data from current list as fallback
    const fallback = applications.find((a) => a._id === appId);
    setDrawerApp(fallback || null);
    try {
      const fullApp = await getApplicationById(appId);
      if (fullApp && (fullApp.application || fullApp._id)) {
        setDrawerApp(fullApp.application || fullApp);
      }
    } catch (err) {
      console.warn("Could not fetch detailed application via getApplicationById:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerAppId(null);
    setDrawerApp(null);
    setNewNote("");
  };

  // Handle stage change
  const handleStageUpdate = async (appId, nextStage) => {
    const canonical = normalizeStage(nextStage);
    setActionLoading((prev) => ({ ...prev, [appId]: true }));
    try {
      const res = await updateApplicationStatus(appId, canonical);
      if (res?.success || res?.application) {
        // Update local state smoothly
        setApplications((prev) =>
          prev.map((app) =>
            app._id === appId
              ? { ...app, status: canonical, stage: canonical }
              : app
          )
        );
        if (drawerApp && drawerApp._id === appId) {
          setDrawerApp((prev) => ({
            ...prev,
            status: canonical,
            stage: canonical,
          }));
        }
        // Refresh pipeline stats quietly
        loadApplications(false);
      }
    } catch (err) {
      console.error("Error updating stage:", err);
      alert(err?.response?.data?.message || "Could not update candidate stage.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: false }));
      setOpenActionMenuId(null);
    }
  };

  // Handle adding a recruiter note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !drawerApp) return;
    setIsSubmittingNote(true);
    try {
      const res = await addApplicationNote(drawerApp._id, newNote.trim());
      if (res?.success) {
        const updatedNotes = res.notes || [
          ...(drawerApp.notes || []),
          {
            text: newNote.trim(),
            addedAt: new Date().toISOString(),
            addedByName: "You",
          },
        ];
        setDrawerApp((prev) => ({
          ...prev,
          notes: updatedNotes,
        }));
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note:", err);
      alert(err?.response?.data?.message || "Failed to add recruiter note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Clear all filters
  const resetFilters = () => {
    setSearchQuery("");
    setActiveStage("All");
    setSelectedJobId("All");
    setSelectedExperience("All");
    setDateSort("desc");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    activeStage !== "All" ||
    selectedJobId !== "All" ||
    selectedExperience !== "All" ||
    dateSort !== "desc";

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. COMPACT RECRUITMENT STATISTICS (4 Minimal Cards)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Applications */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.totalApplications ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">in database</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active candidate pool</p>
        </div>

        {/* Card 2: Shortlisted */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Shortlisted</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.shortlisted ?? 0}
            </span>
            <span className="text-[11px] text-purple-600 font-medium font-semibold">
              Qualified
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Passed initial screening</p>
        </div>

        {/* Card 3: Interviews */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Interviews</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.interviews ?? 0}
            </span>
            <span className="text-[11px] text-amber-600 font-medium font-semibold">
              Scheduled
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Technical & HR rounds</p>
        </div>

        {/* Card 4: Offers */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Offers Extended</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.offers ?? 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium font-semibold">
              Pending / Hired
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Formal employment offers</p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SEARCH & FILTER BAR                                   */}
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
              placeholder="Search candidate name, role, or skill..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Job Filter Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="All">All Job Postings</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Stage Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={activeStage}
              onChange={(e) => {
                setActiveStage(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="All">All Stages</option>
              {ATS_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Experience Filter Dropdown */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedExperience}
              onChange={(e) => {
                setSelectedExperience(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="All">All Experience</option>
              <option value="0-1">Fresher (0-1 yrs)</option>
              <option value="1-3">Junior (1-3 yrs)</option>
              <option value="3-5">Mid-level (3-5 yrs)</option>
              <option value="5+">Senior (5+ yrs)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Sort Dropdown */}
          <div className="relative min-w-[130px]">
            <select
              value={dateSort}
              onChange={(e) => {
                setDateSort(e.target.value);
                setPage(1);
              }}
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
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. HORIZONTAL APPLICATION PIPELINE TABS                   */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {PIPELINE_TABS.map((tab) => {
          const isActive = activeStage === tab.id;
          const count = pipelineCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveStage(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
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
      {/* 4. CANDIDATE LIST (Compact Summary Cards)                 */}
      {/* ======================================================== */}
      {loading ? (
        // Skeleton Loaders
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-white border border-slate-200/60 animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-2/3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="w-24 h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-10 rounded-3xl bg-white border border-rose-100 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Connection Error</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => loadApplications(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No candidate applications found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? "No candidate applications match the selected stage, job, or search filters. Try clearing your filters."
              : "When students apply to your active job or internship postings, their applications will appear here dynamically."}
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
          {applications.map((app) => {
            const info = getCandidateDisplayInfo(app);
            const normStage = normalizeStage(app.status || app.stage);
            const badgeClasses = getStageBadgeClasses(normStage);
            const isMenuOpen = openActionMenuId === app._id;
            const isCurrentActionLoading = Boolean(actionLoading[app._id]);

            return (
              <div
                key={app._id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Summary Candidate Information */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Candidate Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                    {info.name
                      ? info.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "CA"}
                  </div>

                  {/* Candidate Info Details */}
                  <div className="min-w-0 space-y-1">
                    {/* Name & Stage Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer truncate" onClick={() => openDrawer(app._id)}>
                        {info.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClasses}`}>
                        {normStage}
                      </span>
                    </div>

                    {/* Applied Job & Experience • Education */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-medium text-slate-700">{info.jobTitle}</span>
                      <span>•</span>
                      <span className="truncate">{info.experience}</span>
                      <span>•</span>
                      <span className="truncate">{info.education}</span>
                    </div>

                    {/* Top 2-3 Skills & Applied Date */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      {info.skillsList.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {info.skillsList.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{info.skillsList.length - 3} more
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 ml-1">
                        Applied {info.appliedDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {/* [View Application] Button */}
                  <button
                    type="button"
                    onClick={() => openDrawer(app._id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Application</span>
                  </button>

                  {/* Quick Action [⋮] Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionMenuId(isMenuOpen ? null : app._id);
                      }}
                      className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl z-20 py-1.5 animate-scale-in text-xs"
                      >
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Move to Stage
                        </div>

                        {ATS_STAGES.filter((s) => s.id !== normStage && s.id !== "Withdrawn").map(
                          (stage) => (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => handleStageUpdate(app._id, stage.id)}
                              disabled={isCurrentActionLoading}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer disabled:opacity-50"
                            >
                              <span>{stage.label}</span>
                              <span className="text-[10px] text-slate-400">→</span>
                            </button>
                          )
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        {onScheduleInterview && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              onScheduleInterview(app);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800 font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Schedule Interview</span>
                          </button>
                        )}

                        {onCreateOffer && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              onCreateOffer(app);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Generate Offer</span>
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
      {/* 5. MINIMAL PAGINATION                                    */}
      {/* ======================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {(page - 1) * limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(page * limit, totalCount)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{totalCount}</span> candidates
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SLIDE-OVER CANDIDATE DETAILS DRAWER                   */}
      {/* ======================================================== */}
      {drawerAppId && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col z-10 animate-slide-left">
            {drawerLoading && !drawerApp ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Loading candidate details...</p>
                </div>
              </div>
            ) : drawerApp ? (
              (() => {
                const info = getCandidateDisplayInfo(drawerApp);
                const currentStage = normalizeStage(drawerApp.status || drawerApp.stage);
                const isStageLoading = Boolean(actionLoading[drawerApp._id]);
                const scheduledInterviews = drawerApp.interviews || [];
                const offerDetails = drawerApp.offer || null;

                return (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Drawer Header */}
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                          {info.name
                            ? info.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()
                            : "CA"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900">{info.name}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStageBadgeClasses(
                                currentStage
                              )}`}
                            >
                              {currentStage}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Applied for <span className="font-medium text-slate-700">{info.jobTitle}</span> •{" "}
                            {info.appliedDate}
                          </p>
                        </div>
                      </div>

                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={closeDrawer}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Drawer Subnavigation Tabs */}
                    <div className="px-5 border-b border-slate-100 flex items-center gap-6 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setActiveDrawerTab("profile")}
                        className={`py-3 border-b-2 transition cursor-pointer ${
                          activeDrawerTab === "profile"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Candidate Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDrawerTab("hiring")}
                        className={`py-3 border-b-2 transition cursor-pointer ${
                          activeDrawerTab === "hiring"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Hiring Pipeline & Actions
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDrawerTab("notes")}
                        className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                          activeDrawerTab === "notes"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>Recruiter Notes</span>
                        {drawerApp.notes && drawerApp.notes.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                            {drawerApp.notes.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Drawer Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* ======================================================== */}
                      {/* TAB A: CANDIDATE PROFILE                                 */}
                      {/* ======================================================== */}
                      {activeDrawerTab === "profile" && (
                        <div className="space-y-6">
                          {/* Contact Info Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email Address
                              </span>
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {info.email ? (
                                  <a
                                    href={`mailto:${info.email}`}
                                    className="hover:underline text-blue-600"
                                  >
                                    {info.email}
                                  </a>
                                ) : (
                                  "Not provided"
                                )}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Contact Phone
                              </span>
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {info.phone ? (
                                  <a
                                    href={`tel:${info.phone}`}
                                    className="hover:underline text-blue-600"
                                  >
                                    {info.phone}
                                  </a>
                                ) : (
                                  "Not provided"
                                )}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Location
                              </span>
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {info.location}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> College / University
                              </span>
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {info.college} {info.graduationYear ? `(${info.graduationYear})` : ""}
                              </p>
                            </div>
                          </div>

                          {/* External Links */}
                          {(info.linkedinUrl || info.githubUrl || info.portfolioUrl) && (
                            <div className="flex items-center gap-3 flex-wrap">
                              {info.linkedinUrl && (
                                <a
                                  href={info.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                  <span>LinkedIn</span>
                                </a>
                              )}
                              {info.githubUrl && (
                                <a
                                  href={info.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-800" />
                                  <span>GitHub</span>
                                </a>
                              )}
                              {info.portfolioUrl && (
                                <a
                                  href={info.portfolioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Portfolio</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Resume & Documents */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              Resume / Curriculum Vitae
                            </h4>
                            {info.resumeUrl ? (
                              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                                      Candidate Resume Document
                                    </p>
                                    <p className="text-[11px] text-slate-500">PDF / Document File</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewResumeData({
                                        url: info.resumeUrl,
                                        candidateName: info.name,
                                        jobTitle: info.jobTitle,
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview</span>
                                  </button>
                                  <a
                                    href={info.resumeUrl}
                                    download
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                    title="Download resume"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                No resume attached to this application.
                              </div>
                            )}
                          </div>

                          {/* Skills Badges */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              Key Candidate Skills ({info.skillsList.length})
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {info.skillsList.length > 0 ? (
                                info.skillsList.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700 text-xs font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">No skills specified</span>
                              )}
                            </div>
                          </div>

                          {/* Cover Note */}
                          {info.coverLetter && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                Cover Note / Statement
                              </h4>
                              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                {info.coverLetter}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ======================================================== */}
                      {/* TAB B: HIRING PIPELINE & ACTIONS                         */}
                      {/* ======================================================== */}
                      {activeDrawerTab === "hiring" && (
                        <div className="space-y-6">
                          {/* Visual Step Progression */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              Recruitment Pipeline Progress
                            </h4>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {["Applied", "Shortlisted", "Assessment", "Interview", "Offer", "Hired"].map(
                                (stageKey) => {
                                  const isCurrent = currentStage === stageKey;
                                  return (
                                    <button
                                      key={stageKey}
                                      type="button"
                                      disabled={isStageLoading}
                                      onClick={() => handleStageUpdate(drawerApp._id, stageKey)}
                                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer disabled:opacity-50 ${
                                        isCurrent
                                          ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50 text-xs"
                                      }`}
                                    >
                                      <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                                        Stage
                                      </div>
                                      <div className="font-semibold text-xs truncate">{stageKey}</div>
                                      {isCurrent && <Check className="w-3.5 h-3.5 mx-auto mt-1" />}
                                    </button>
                                  );
                                }
                              )}
                            </div>

                            {/* Rejection / Withdrawal Quick Buttons */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isStageLoading || currentStage === "Rejected"}
                                onClick={() => handleStageUpdate(drawerApp._id, "Rejected")}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                              >
                                Reject Candidate
                              </button>
                              <button
                                type="button"
                                disabled={isStageLoading || currentStage === "Withdrawn"}
                                onClick={() => handleStageUpdate(drawerApp._id, "Withdrawn")}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                              >
                                Mark Withdrawn
                              </button>
                            </div>
                          </div>

                          {/* Interviews Section */}
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-amber-600" />
                                Scheduled Interviews
                              </h4>
                              {onScheduleInterview && (
                                <button
                                  type="button"
                                  onClick={() => onScheduleInterview(drawerApp)}
                                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                                >
                                  Schedule Interview
                                </button>
                              )}
                            </div>

                            {scheduledInterviews.length > 0 ? (
                              <div className="space-y-2">
                                {scheduledInterviews.map((interview, idx) => (
                                  <div
                                    key={interview._id || idx}
                                    className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-1.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900">
                                        {interview.roundName || interview.title || "Interview Round"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                        {interview.status || "Scheduled"}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 flex items-center gap-2">
                                      <span>📅 {interview.scheduledDate || "Date TBD"}</span>
                                      <span>⏰ {interview.scheduledTime || ""}</span>
                                    </p>
                                    {interview.meetingLink && (
                                      <a
                                        href={interview.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1 pt-1"
                                      >
                                        <span>Join Meeting</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No interviews scheduled for this candidate yet.
                              </p>
                            )}
                          </div>

                          {/* Offer Letter Section */}
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-600" />
                                Employment Offer
                              </h4>
                              {onCreateOffer && (
                                <button
                                  type="button"
                                  onClick={() => onCreateOffer(drawerApp)}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                                >
                                  Generate Offer
                                </button>
                              )}
                            </div>

                            {offerDetails ? (
                              <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">
                                    {offerDetails.designation || "Offered Position"}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {offerDetails.status || "Offer Extended"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase">Annual CTC:</span>
                                    <p className="font-semibold text-slate-800">
                                      {offerDetails.salary ? `₹${Number(offerDetails.salary).toLocaleString("en-IN")}` : "As discussed"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase">Joining Date:</span>
                                    <p className="font-semibold text-slate-800">
                                      {offerDetails.joiningDate ? new Date(offerDetails.joiningDate).toLocaleDateString("en-IN") : "TBD"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No offer letter has been generated for this candidate.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ======================================================== */}
                      {/* TAB C: PRIVATE RECRUITER NOTES                           */}
                      {/* ======================================================== */}
                      {activeDrawerTab === "notes" && (
                        <div className="space-y-5">
                          {/* Note Warning */}
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] flex items-start gap-2">
                            <span>🔒</span>
                            <span>
                              Recruiter notes are strictly private to your hiring team and are never visible to candidates.
                            </span>
                          </div>

                          {/* Add Note Input */}
                          <form onSubmit={handleAddNote} className="space-y-2">
                            <textarea
                              rows={3}
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Write a private assessment note, interview feedback, or scorecard summary..."
                              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                            />
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={!newNote.trim() || isSubmittingNote}
                                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                {isSubmittingNote ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                <span>Post Note</span>
                              </button>
                            </div>
                          </form>

                          {/* Notes History */}
                          <div className="space-y-2.5 pt-2 border-t border-slate-100">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              Note History
                            </h4>
                            {drawerApp.notes && drawerApp.notes.length > 0 ? (
                              <div className="space-y-2">
                                {drawerApp.notes.map((n, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1 text-xs"
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                      <span className="font-semibold text-slate-700">
                                        {n.addedByName || n.addedBy?.fullName || "Recruiter"}
                                      </span>
                                      <span>
                                        {n.addedAt || n.createdAt
                                          ? new Date(n.addedAt || n.createdAt).toLocaleString("en-IN", {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                            })
                                          : "Recent"}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                      {n.text || n.note}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                No private notes recorded for this applicant yet.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. IN-PAGE RESUME PREVIEW MODAL WITH CROSS BUTTON        */}
      {/* ======================================================== */}
      {previewResumeData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          {/* Modal Container */}
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    Resume - {previewResumeData.candidateName}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Applied for {previewResumeData.jobTitle || "Position"}
                  </p>
                </div>
              </div>

              {/* Action Buttons & Cross (✕) to Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewResumeData.url}
                  download
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center gap-1 transition"
                  title="Download Resume"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <a
                  href={previewResumeData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center gap-1 transition"
                  title="Open in new tab fallback"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                {/* Cross Button (X) */}
                <button
                  type="button"
                  onClick={() => setPreviewResumeData(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                  title="Close resume preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={previewResumeData.url}
                title={`Resume of ${previewResumeData.candidateName}`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSPipelineView;
