import React, { useState, useEffect, useCallback } from "react";
import JourneyLoader from "../../components/common/JourneyLoader";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAdminReports,
  getAdminReportById,
  updateAdminReportStatus,
  updateAdminReportPriority,
  addAdminReportNote,
  resolveAdminReport,
  dismissAdminReport,
} from "../../services/adminService";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Building2,
  Briefcase,
  User,
  Calendar,
  MessageSquare,
  Plus,
  Send,
  History,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  Eye,
} from "lucide-react";

const CATEGORIES = [
  "All Categories",
  "Opportunity",
  "Company / Employer",
  "User / Profile",
  "Application",
  "Interview",
  "Spam / Fraud",
  "Technical Issue",
  "Other",
];

const PRIORITIES = ["All Priorities", "Critical", "High", "Medium", "Low"];

const STATUSES = ["All Statuses", "Open", "Investigating", "Resolved", "Dismissed"];

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
];

const AdminReports = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Data States
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    investigating: 0,
    resolved: 0,
    dismissed: 0,
    critical: 0,
  });
  const [attentionItems, setAttentionItems] = useState([]);
  const [activity, setActivity] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  // Filter States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");

  // Detailed Review Modal States
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [relatedHistory, setRelatedHistory] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Action Inputs
  const [newNote, setNewNote] = useState("");
  const [resolutionNoteInput, setResolutionNoteInput] = useState("");
  const [dismissalReasonInput, setDismissalReasonInput] = useState("");
  const [actionTab, setActionTab] = useState("notes"); // 'notes' | 'resolve' | 'dismiss'
  const [actionError, setActionError] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Main Data Fetch
  const fetchReportsData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 12,
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          category: categoryFilter !== "all" && categoryFilter !== "All Categories" ? categoryFilter : undefined,
          priority: priorityFilter !== "all" && priorityFilter !== "All Priorities" ? priorityFilter : undefined,
          companyId: companyFilter !== "all" ? companyFilter : undefined,
          datePreset: datePreset !== "all" ? datePreset : undefined,
        };

        const res = await getAdminReports(params);
        if (res?.success) {
          setReports(res.reports || []);
          setStats(
            res.stats || {
              total: 0,
              open: 0,
              investigating: 0,
              resolved: 0,
              dismissed: 0,
              critical: 0,
            }
          );
          setAttentionItems(res.requiresAttention || []);
          setActivity(res.activity || []);
          if (res.companies?.length) {
            setCompaniesList(res.companies);
          }
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        console.error("Failed to load platform reports:", err);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, categoryFilter, priorityFilter, companyFilter, datePreset]
  );

  useEffect(() => {
    fetchReportsData(1);
  }, [fetchReportsData]);

  // Load single report details when selected
  const openReportModal = async (reportId) => {
    setSelectedReportId(reportId);
    setModalLoading(true);
    setActionError("");
    setNewNote("");
    setResolutionNoteInput("");
    setDismissalReasonInput("");
    setActionTab("notes");

    try {
      const res = await getAdminReportById(reportId);
      if (res?.success) {
        setDetailReport(res.report);
        setRelatedHistory(res.relatedReports || []);
      }
    } catch (err) {
      console.error("Failed to fetch report details:", err);
      setActionError("Failed to fetch report details. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedReportId(null);
    setDetailReport(null);
    setRelatedHistory([]);
    setActionError("");
  };

  // Status changes
  const handleQuickStatusChange = async (reportId, newStatus) => {
    try {
      const res = await updateAdminReportStatus(reportId, newStatus);
      if (res?.success) {
        fetchReportsData(pagination.page);
        if (detailReport?._id === reportId) {
          setDetailReport((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  // Priority change
  const handlePriorityChange = async (reportId, newPriority) => {
    try {
      setActionLoading(true);
      const res = await updateAdminReportPriority(reportId, newPriority);
      if (res?.success) {
        setDetailReport((prev) => ({ ...prev, priority: newPriority }));
        fetchReportsData(pagination.page);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update priority");
    } finally {
      setActionLoading(false);
    }
  };

  // Add investigation note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setActionLoading(true);
      setActionError("");
      const res = await addAdminReportNote(detailReport._id, newNote.trim());
      if (res?.success) {
        setDetailReport(res.report);
        setNewNote("");
        fetchReportsData(pagination.page);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to add investigation note");
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve report
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNoteInput.trim()) {
      setActionError("A detailed resolution note is required before resolving a report.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError("");
      const res = await resolveAdminReport(detailReport._id, resolutionNoteInput.trim());
      if (res?.success) {
        setDetailReport(res.report);
        setResolutionNoteInput("");
        fetchReportsData(pagination.page);
        setActionTab("notes");
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to resolve report");
    } finally {
      setActionLoading(false);
    }
  };

  // Dismiss report
  const handleDismiss = async (e) => {
    e.preventDefault();
    if (!dismissalReasonInput.trim()) {
      setActionError("A dismissal rationale is required to explain why this flag was dismissed.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError("");
      const res = await dismissAdminReport(detailReport._id, dismissalReasonInput.trim());
      if (res?.success) {
        setDetailReport(res.report);
        setDismissalReasonInput("");
        fetchReportsData(pagination.page);
        setActionTab("notes");
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to dismiss report");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setCompanyFilter("all");
    setDatePreset("all");
  };

  const isFilterActive =
    search ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    priorityFilter !== "all" ||
    companyFilter !== "all" ||
    datePreset !== "all";

  // Helpers for styling badges
  const getStatusBadge = (status) => {
    switch (status) {
      case "Open":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Investigating":
      case "Under Review":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Dismissed":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse";
      case "High":
        return "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-200 font-medium";
      case "Low":
        return "bg-slate-100 text-slate-600 border-slate-200 font-medium";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "Opportunity":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Company / Employer":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "User / Profile":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Spam / Fraud":
        return "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      case "Application":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "Interview":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <AdminLayout onRefresh={() => fetchReportsData(pagination.page)} isRefreshing={loading}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Platform Reports & Trust
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {stats.total} Total
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform moderation & dispute resolution. Review user complaints, track repeat offenders, and enforce safety policies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {stats.critical > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.critical} Critical Reports</span>
              </div>
            )}
            <button
              onClick={() => fetchReportsData(pagination.page)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5 Dynamic Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total */}
          <button
            onClick={() => setStatusFilter("all")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "all"
                ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Reports</span>
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">All complaints logged</p>
          </button>

          {/* Card 2: Open */}
          <button
            onClick={() => setStatusFilter("Open")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "Open"
                ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Open</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-2">{stats.open}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting triage</p>
          </button>

          {/* Card 3: In Review */}
          <button
            onClick={() => setStatusFilter("Investigating")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "Investigating"
                ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Investigating</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{stats.investigating}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Under admin review</p>
          </button>

          {/* Card 4: Resolved */}
          <button
            onClick={() => setStatusFilter("Resolved")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "Resolved"
                ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.resolved}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Resolved with action</p>
          </button>

          {/* Card 5: Dismissed */}
          <button
            onClick={() => setStatusFilter("Dismissed")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "Dismissed"
                ? "bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Dismissed</span>
              <XCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-700 mt-2">{stats.dismissed}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Invalid or rejected</p>
          </button>
        </div>

        {/* Requires Immediate Attention Alerts (Critical / Repeat / Fraud) */}
        {attentionItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-linear-to-r from-rose-50/80 to-amber-50/80 border border-rose-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Requires Immediate Moderation Attention ({attentionItems.length})</span>
              </div>
              <span className="text-[11px] text-rose-600 font-medium">High Risk & Repeat Violations</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {attentionItems.slice(0, 3).map((item) => (
                <div
                  key={item._id}
                  className="p-3 bg-white rounded-xl border border-rose-200/60 shadow-xs flex flex-col justify-between hover:border-rose-300 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {item.priority === "Critical"
                          ? "CRITICAL"
                          : item.repeatCount >= 2
                          ? `REPEAT (${item.repeatCount}x)`
                          : "FRAUD / SPAM"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {item.opportunityId?.title ||
                        item.companyId?.name ||
                        item.reportedUserId?.name ||
                        item.reason ||
                        "Flagged Item"}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{item.details || item.reason}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">By: {item.reportedByName || "User"}</span>
                    <button
                      onClick={() => openReportModal(item._id)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg transition"
                    >
                      Review Now ΓåÆ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search details, reasons, complainants, target entities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder-slate-400 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-2xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-2xs"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-2xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s === "All Statuses" ? "all" : s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Company Filter (Super Admin only) */}
              {isSuperAdmin && (
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-2xs max-w-[160px] truncate"
                >
                  <option value="all">All Companies</option>
                  {companiesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Preset Filter */}
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-2xs"
              >
                {DATE_PRESETS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>

              {/* Clear Filters Button */}
              {isFilterActive && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Report Details</th>
                  <th className="px-4 py-3">Target / Subject</th>
                  <th className="px-4 py-3">Reported By</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <JourneyLoader variant="admin" size="sm" />
                        <span className="text-xs font-medium">Loading reports from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <ShieldCheck className="w-10 h-10 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-700">No Reports Found</span>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {isFilterActive
                            ? "No reports match your current filter parameters. Try clearing or relaxing filters."
                            : "Platform is running safely. Zero active complaints or trust flags filed."}
                        </p>
                        {isFilterActive && (
                          <button
                            onClick={resetFilters}
                            className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const repeatBadge =
                      r.repeatCount > 1 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          {r.repeatCount} Reports
                        </span>
                      ) : null;

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition">
                        {/* Report Details & Priority */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(
                                  r.category
                                )}`}
                              >
                                {r.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadge(
                                  r.priority
                                )}`}
                              >
                                {r.priority}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900 truncate" title={r.reason}>
                              {r.reason}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1" title={r.details}>
                              {r.details}
                            </p>
                          </div>
                        </td>

                        {/* Target Subject & Repeat Count */}
                        <td className="px-4 py-3.5 max-w-[220px]">
                          <div className="space-y-1">
                            {r.opportunityId ? (
                              <div>
                                <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{r.opportunityId.title}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  {r.opportunityId.type || "Opportunity"}
                                </span>
                              </div>
                            ) : r.reportedUserId ? (
                              <div>
                                <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{r.reportedUserId.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">{r.reportedUserId.email}</span>
                              </div>
                            ) : r.companyId ? (
                              <div>
                                <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{r.companyId.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">Company</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Platform / General</span>
                            )}
                            {repeatBadge}
                          </div>
                        </td>

                        {/* Reported By */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800">
                              {r.reportedBy?.name || r.reportedByName || "Anonymous"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {r.reportedBy?.email || r.reportedByEmail || "No email"}
                            </div>
                          </div>
                        </td>

                        {/* Company / Tenant */}
                        <td className="px-4 py-3.5 text-slate-600">
                          {r.companyId?.name || "Global / CareerConnect"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openReportModal(r._id)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-lg transition"
                            >
                              Review
                            </button>

                            {/* Quick Status Dropdown */}
                            <select
                              value={r.status}
                              onChange={(e) => handleQuickStatusChange(r._id, e.target.value)}
                              className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                            >
                              <option value="Open">Open</option>
                              <option value="Investigating">In Review</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Dismissed">Dismissed</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReportsData(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-800">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchReportsData(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Review & Moderation Modal */}
        {selectedReportId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Moderation Case #{selectedReportId.slice(-6).toUpperCase()}
                      </h2>
                      {detailReport && (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              detailReport.status
                            )}`}
                          >
                            {detailReport.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] border ${getCategoryBadge(
                              detailReport.category
                            )}`}
                          >
                            {detailReport.category}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Filed on{" "}
                      {detailReport
                        ? new Date(detailReport.createdAt).toLocaleString()
                        : "..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {detailReport && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400 text-[11px]">Priority:</span>
                      <select
                        value={detailReport.priority}
                        onChange={(e) => handlePriorityChange(detailReport._id, e.target.value)}
                        disabled={actionLoading}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getPriorityBadge(
                          detailReport.priority
                        )}`}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={closeModal}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {modalLoading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                    <JourneyLoader variant="admin" size="sm" />
                    <span className="text-xs font-semibold">Loading report details and history...</span>
                  </div>
                ) : detailReport ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (Subject & Complaint Details) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Reason & Full Details */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Complaint Reason
                          </span>
                          <span className="text-xs font-bold text-slate-900">{detailReport.reason}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-700">Full Description:</div>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                          {detailReport.details || "No extended details provided."}
                        </p>
                      </div>

                      {/* Complainant Info Card */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Reported By (Complainant)
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {(detailReport.reportedBy?.name || detailReport.reportedByName || "U")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {detailReport.reportedBy?.name || detailReport.reportedByName || "Anonymous User"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {detailReport.reportedBy?.email || detailReport.reportedByEmail || "No email available"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Role: {detailReport.reportedBy?.role || "User"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reported Target / Subject Entity Details */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Reported Entity (Target)
                        </span>

                        {detailReport.opportunityId ? (
                          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                {detailReport.opportunityId.type || "Opportunity"}
                              </span>
                              <span className="text-xs text-slate-500">
                                Status: <strong>{detailReport.opportunityId.status}</strong>
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-900">
                              {detailReport.opportunityId.title}
                            </div>
                            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                              <span>Company: {detailReport.companyId?.name || "Unassigned"}</span>
                              <span>Location: {detailReport.opportunityId.location || "Remote"}</span>
                              {detailReport.opportunityId.salary && (
                                <span>Salary: {detailReport.opportunityId.salary}</span>
                              )}
                              {detailReport.opportunityId.stipend && (
                                <span>Stipend: {detailReport.opportunityId.stipend}</span>
                              )}
                            </div>
                          </div>
                        ) : detailReport.reportedUserId ? (
                          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-1">
                            <div className="text-xs font-bold text-slate-900">
                              {detailReport.reportedUserId.name}
                            </div>
                            <div className="text-xs text-slate-600">{detailReport.reportedUserId.email}</div>
                            <div className="text-[11px] text-slate-500">
                              Role: {detailReport.reportedUserId.role} ΓÇó Status: {detailReport.reportedUserId.status || "Active"}
                            </div>
                          </div>
                        ) : detailReport.companyId ? (
                          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                            <div className="text-xs font-bold text-slate-900">{detailReport.companyId.name}</div>
                            <div className="text-xs text-slate-600">
                              Industry: {detailReport.companyId.industry || "General"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            No external database record attached. Report filed as general platform flag.
                          </div>
                        )}
                      </div>

                      {/* Related Past Complaints against same target */}
                      {relatedHistory.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <History className="w-4 h-4 text-amber-600" />
                            <span>Repeat Complaint History ({relatedHistory.length} Previous Reports)</span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {relatedHistory.map((rh) => (
                              <div
                                key={rh._id}
                                className="p-2 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">{rh.reason}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">
                                    {new Date(rh.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(
                                    rh.status
                                  )}`}
                                >
                                  {rh.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column (Investigation Notes & Resolution Workflow) */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Action Error Alert */}
                      {actionError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{actionError}</span>
                        </div>
                      )}

                      {/* Workflow Tabs */}
                      <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                        <button
                          type="button"
                          onClick={() => setActionTab("notes")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            actionTab === "notes" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"
                          }`}
                        >
                          Notes ({detailReport.adminNotes?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTab("resolve")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            actionTab === "resolve" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "hover:text-slate-900"
                          }`}
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTab("dismiss")}
                          className={`flex-1 py-1.5 rounded-lg transition ${
                            actionTab === "dismiss" ? "bg-slate-700 text-white shadow-2xs font-bold" : "hover:text-slate-900"
                          }`}
                        >
                          Dismiss
                        </button>
                      </div>

                      {/* TAB 1: Admin Notes & Investigation Timeline */}
                      {actionTab === "notes" && (
                        <div className="space-y-4">
                          {/* Existing Notes Timeline */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Investigation Timeline
                            </span>

                            {(!detailReport.adminNotes || detailReport.adminNotes.length === 0) ? (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                                No investigation notes recorded yet. Add initial assessment below.
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {detailReport.adminNotes.map((note, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                      <span className="font-bold text-slate-700">
                                        {note.adminId?.name || "Admin"}
                                      </span>
                                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-slate-800 whitespace-pre-wrap">{note.note}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Add Note Form */}
                          <form onSubmit={handleAddNote} className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-700">
                              Add Internal Investigation Note
                            </label>
                            <textarea
                              rows="3"
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Record findings, communications with employer, verification steps..."
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-800"
                            />
                            <div className="flex items-center justify-between pt-1">
                              {detailReport.status === "Open" && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => handleQuickStatusChange(detailReport._id, "Investigating")}
                                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition"
                                >
                                  Mark Investigating
                                </button>
                              )}
                              <button
                                type="submit"
                                disabled={actionLoading || !newNote.trim()}
                                className="ml-auto px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Add Note</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* TAB 2: Resolve Report Form */}
                      {actionTab === "resolve" && (
                        <form onSubmit={handleResolve} className="space-y-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                          <div>
                            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Resolve Platform Report</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 mt-1">
                              Resolving confirms corrective action has been taken (e.g. fraudulent listing removed, employer suspended, warning issued). Complainant will be notified.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Resolution Summary Note <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows="4"
                              required
                              value={resolutionNoteInput}
                              onChange={(e) => setResolutionNoteInput(e.target.value)}
                              placeholder="Detail the actions taken: e.g., Opportunity was removed, employer verified, candidate refunded..."
                              className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none text-slate-800 bg-white"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={actionLoading || !resolutionNoteInput.trim()}
                            className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirm & Resolve Report</span>
                          </button>
                        </form>
                      )}

                      {/* TAB 3: Dismiss Report Form */}
                      {actionTab === "dismiss" && (
                        <form onSubmit={handleDismiss} className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <div>
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                              <XCircle className="w-4 h-4 text-slate-600" />
                              <span>Dismiss Report as Invalid</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Dismiss if the complaint does not violate platform guidelines, was filed in error, or has insufficient evidence.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Dismissal Rationale <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows="4"
                              required
                              value={dismissalReasonInput}
                              onChange={(e) => setDismissalReasonInput(e.target.value)}
                              placeholder="Explain rationale: e.g., Verified opportunity meets CareerConnect terms, no spam detected..."
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-slate-500/20 resize-none text-slate-800 bg-white"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={actionLoading || !dismissalReasonInput.trim()}
                            className="w-full py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <X className="w-4 h-4" />
                            <span>Confirm & Dismiss Report</span>
                          </button>
                        </form>
                      )}

                      {/* Existing Resolution or Dismissal Info */}
                      {detailReport.status === "Resolved" && detailReport.resolutionNote && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                          <span className="font-bold text-emerald-800">Resolution on Record:</span>
                          <p className="text-emerald-900">{detailReport.resolutionNote}</p>
                          <span className="text-[10px] text-emerald-600">
                            Resolved by {detailReport.resolvedBy?.name || "Admin"} on{" "}
                            {new Date(detailReport.resolvedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {detailReport.status === "Dismissed" && detailReport.dismissalReason && (
                        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-1">
                          <span className="font-bold text-slate-800">Dismissal Rationale on Record:</span>
                          <p className="text-slate-700">{detailReport.dismissalReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  CareerConnect Trust & Safety Moderation Protocol
                </span>
                <button
                  onClick={closeModal}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Moderation Activity Feed (Audit Trail) */}
        {activity.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Recent Platform Moderation Activity (Audit Trail)</span>
              </div>
              <span className="text-[11px] text-slate-400">System Logs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {activity.map((act) => (
                <div
                  key={act._id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-indigo-600 truncate max-w-[120px]">
                      {act.userId?.name || "Super Admin"}
                    </span>
                    <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate">{act.action}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{act.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
