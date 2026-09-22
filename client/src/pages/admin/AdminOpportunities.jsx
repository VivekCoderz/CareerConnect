import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAdminOpportunities,
  getAdminOpportunitiesCompanies,
  approveAdminOpportunity,
  rejectAdminOpportunity,
  editAdminOpportunity,
  closeAdminOpportunity,
  toggleFeatureOpportunity,
} from "../../services/adminService";
import {
  Briefcase,
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  Calendar,
  X,
  FileSpreadsheet,
  Star,
  Edit3,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  History,
  Check,
  ExternalLink,
} from "lucide-react";

const REJECTION_REASONS = [
  "Fake/Suspicious",
  "Misleading Information",
  "Incomplete Information",
  "Duplicate Opportunity",
  "Inappropriate Content",
  "Other",
];

const AdminOpportunities = () => {
  const navigate = useNavigate();

  // Core Data States
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    totalJobs: 0,
    totalInternships: 0,
    published: 0,
    pending: 0,
    closed: 0,
    rejected: 0,
    featured: 0,
  });
  const [attentionItems, setAttentionItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  // Filter States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals & Action States
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [rejectingOpp, setRejectingOpp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [adminNote, setAdminNote] = useState("");
  const [editingOpp, setEditingOpp] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Load companies list for filter dropdown once
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await getAdminOpportunitiesCompanies();
        if (res?.success) {
          setCompaniesList(res.companies || []);
        }
      } catch (err) {
        console.error("Failed to load companies for filter:", err);
      }
    };
    loadCompanies();
  }, []);

  // Fetch opportunities from server with all filters & real stats
  const fetchOpportunities = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 12,
          type,
          status,
          search: debouncedSearch,
          companyId: selectedCompanyId,
          startDate,
          endDate,
        };
        const res = await getAdminOpportunities(params);
        if (res?.success && res.data) {
          setOpportunities(res.data.opportunities || []);
          setStats(res.data.stats || {});
          setAttentionItems(res.data.attention || []);
          setRecentActivity(res.data.recentActivity || []);
          setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error("Failed to load opportunities:", err);
      } finally {
        setLoading(false);
      }
    },
    [type, status, debouncedSearch, selectedCompanyId, startDate, endDate]
  );

  useEffect(() => {
    fetchOpportunities(1);
  }, [fetchOpportunities]);

  // Moderation: Quick Approve
  const handleApprove = async (opp) => {
    if (!window.confirm(`Approve "${opp.title}" and make it live for candidates?`)) return;
    setActionLoading(true);
    try {
      const oppType = opp.opportunityType?.toLowerCase() || (opp.duration ? "internship" : "job");
      const res = await approveAdminOpportunity(oppType, opp._id);
      if (res?.success) {
        await fetchOpportunities(pagination.page);
        if (selectedOpportunity && selectedOpportunity._id === opp._id) {
          setSelectedOpportunity((prev) => ({ ...prev, status: "Published", approvedAt: new Date() }));
        }
      }
    } catch (err) {
      console.error("Approve error:", err);
      alert(err.response?.data?.message || "Failed to approve opportunity.");
    } finally {
      setActionLoading(false);
    }
  };

  // Moderation: Reject Submit
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingOpp) return;
    setActionLoading(true);
    try {
      const oppType = rejectingOpp.opportunityType?.toLowerCase() || (rejectingOpp.duration ? "internship" : "job");
      const res = await rejectAdminOpportunity(oppType, rejectingOpp._id, {
        rejectionReason,
        adminNote,
      });
      if (res?.success) {
        setRejectingOpp(null);
        setAdminNote("");
        await fetchOpportunities(pagination.page);
        if (selectedOpportunity && selectedOpportunity._id === rejectingOpp._id) {
          setSelectedOpportunity((prev) => ({
            ...prev,
            status: "Rejected",
            rejectionReason,
            adminNote,
          }));
        }
      }
    } catch (err) {
      console.error("Reject error:", err);
      alert(err.response?.data?.message || "Failed to reject opportunity.");
    } finally {
      setActionLoading(false);
    }
  };

  // Moderation: Close
  const handleClose = async (opp) => {
    if (!window.confirm(`Close "${opp.title}"? This halts new applications while preserving candidate records.`)) return;
    setActionLoading(true);
    try {
      const oppType = opp.opportunityType?.toLowerCase() || (opp.duration ? "internship" : "job");
      const res = await closeAdminOpportunity(oppType, opp._id);
      if (res?.success) {
        await fetchOpportunities(pagination.page);
        if (selectedOpportunity && selectedOpportunity._id === opp._id) {
          setSelectedOpportunity((prev) => ({ ...prev, status: "Closed" }));
        }
      }
    } catch (err) {
      console.error("Close error:", err);
      alert(err.response?.data?.message || "Failed to close opportunity.");
    } finally {
      setActionLoading(false);
    }
  };

  // Moderation: Toggle Feature
  const handleToggleFeature = async (opp) => {
    setActionLoading(true);
    try {
      const oppType = opp.opportunityType?.toLowerCase() || (opp.duration ? "internship" : "job");
      const nextFeatured = !opp.isFeatured;
      const res = await toggleFeatureOpportunity(oppType, opp._id, nextFeatured);
      if (res?.success) {
        setOpportunities((prev) =>
          prev.map((o) => (o._id === opp._id ? { ...o, isFeatured: nextFeatured } : o))
        );
        if (selectedOpportunity && selectedOpportunity._id === opp._id) {
          setSelectedOpportunity((prev) => ({ ...prev, isFeatured: nextFeatured }));
        }
      }
    } catch (err) {
      console.error("Feature toggle error:", err);
      alert(err.response?.data?.message || "Failed to update featured state.");
    } finally {
      setActionLoading(false);
    }
  };

  // Moderation: Open Edit Modal
  const openEditModal = (opp) => {
    setEditingOpp(opp);
    setEditFormData({
      title: opp.title || "",
      department: opp.department || "",
      category: opp.category || "",
      workMode: opp.workMode || "Hybrid",
      location: opp.location || "",
      openings: opp.openings || 1,
      deadline: opp.deadline ? new Date(opp.deadline).toISOString().split("T")[0] : "",
      description: opp.description || "",
      requiredSkills: Array.isArray(opp.requiredSkills) ? opp.requiredSkills.join(", ") : "",
      stipend: opp.stipend || "",
      minSalary: opp.salaryRange?.min || "",
      maxSalary: opp.salaryRange?.max || "",
    });
  };

  // Moderation: Save Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOpp) return;
    setActionLoading(true);
    try {
      const oppType = editingOpp.opportunityType?.toLowerCase() || (editingOpp.duration ? "internship" : "job");
      const payload = {
        title: editFormData.title,
        department: editFormData.department,
        category: editFormData.category,
        workMode: editFormData.workMode,
        location: editFormData.location,
        openings: Number(editFormData.openings) || 1,
        deadline: editFormData.deadline || null,
        description: editFormData.description,
        requiredSkills: editFormData.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (oppType === "job") {
        payload.salaryRange = {
          min: Number(editFormData.minSalary) || 0,
          max: Number(editFormData.maxSalary) || 0,
        };
      } else {
        payload.stipend = editFormData.stipend;
      }

      const res = await editAdminOpportunity(oppType, editingOpp._id, payload);
      if (res?.success) {
        setEditingOpp(null);
        await fetchOpportunities(pagination.page);
        if (selectedOpportunity && selectedOpportunity._id === editingOpp._id) {
          setSelectedOpportunity((prev) => ({ ...prev, ...payload }));
        }
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert(err.response?.data?.message || "Failed to update opportunity details.");
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (opp) => {
    if (opp.status === "Pending Approval") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (opp.status === "Rejected") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (opp.status === "Closed") {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }
    if (opp.isExpired) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (opp.status === "Published") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <AdminLayout onRefresh={() => fetchOpportunities(pagination.page)} isRefreshing={loading}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Opportunity Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Super Admin Moderation
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Global moderation, approval, and verification of Job Openings and Internships across all platform organizations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchOpportunities(pagination.page)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ==================================================
            TOP 4 DYNAMIC KPI CARDS (Real MongoDB Data)
        ================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Listings */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs transition hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Listings</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.total || 0}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
              <span>{stats.totalJobs || 0} Jobs</span>
              <span>ΓÇó</span>
              <span>{stats.totalInternships || 0} Internships</span>
            </div>
          </div>

          {/* Card 2: Active & Published */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs transition hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active & Published</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{stats.published || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Live & accepting applications</p>
          </div>

          {/* Card 3: Pending Review */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs transition hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pending Review</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2">{stats.pending || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting admin verification</p>
          </div>

          {/* Card 4: Closed / Expired */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs transition hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Closed / Expired</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-2">{stats.closed || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Halted or past deadline</p>
          </div>
        </div>

        {/* ==================================================
            REQUIRES ATTENTION SECTION (Compact & Dynamic)
        ================================================== */}
        {attentionItems.length > 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                Requires Attention ({attentionItems.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.actionFilter) setStatus(item.actionFilter);
                    if (item.link) navigate(item.link);
                  }}
                  className="p-3 bg-white rounded-xl border border-amber-200/60 hover:border-amber-300 shadow-2xs cursor-pointer transition flex items-start gap-2.5"
                >
                  <div
                    className={`p-1.5 rounded-lg mt-0.5 ${
                      item.severity === "danger"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>No opportunities require urgent attention. Platform moderation queue is clear.</span>
          </div>
        )}

        {/* ==================================================
            SEARCH & FILTERS TOOLBAR
        ================================================== */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, company, location, city..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Type Filter */}
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="job">Jobs Only</option>
                <option value="internship">Internships Only</option>
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="Pending Approval">Pending Review</option>
                <option value="Published">Active & Published</option>
                <option value="Closed">Closed</option>
                <option value="expired">Expired (Past Deadline)</option>
                <option value="Rejected">Rejected</option>
                <option value="featured">Featured Only</option>
              </select>

              {/* Company Filter (from real DB) */}
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 truncate"
              >
                <option value="">All Companies</option>
                {companiesList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(type !== "all" || status !== "all" || selectedCompanyId || search || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setType("all");
                    setStatus("all");
                    setSelectedCompanyId("");
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Optional Date Range Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px] font-bold text-slate-400">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            />
          </div>
        </div>

        {/* ==================================================
            OPPORTUNITIES TABLE (Real MongoDB Records)
        ================================================== */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-bold text-slate-700">Querying database opportunities...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Aggregating live moderation records</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No opportunities found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                There are currently no job or internship listings matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Opportunity</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Applications</th>
                    <th className="py-3.5 px-4">Posted Date</th>
                    <th className="py-3.5 px-4">Deadline</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {opportunities.map((opp) => (
                    <tr key={opp._id} className="hover:bg-slate-50/70 transition group">
                      {/* Column 1: Opportunity Title & Location */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          {opp.isFeatured && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                              {opp.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {opp.location || "Remote"} ({opp.workMode || "Hybrid"})
                              </span>
                              {opp.department && (
                                <>
                                  <span>ΓÇó</span>
                                  <span>{opp.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Company */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 font-bold text-[10px] text-slate-600">
                            {opp.companyId?.logo ? (
                              <img
                                src={opp.companyId.logo}
                                alt={opp.companyName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              opp.companyName?.slice(0, 2).toUpperCase() || "CO"
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              {opp.companyId?.name || opp.companyName || "Organization"}
                              {opp.companyId?.isVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {opp.companyId?.industry || "Tech Industry"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Type */}
                      <td className="py-3 px-4">
                        {opp.opportunityType === "Internship" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <GraduationCap className="w-3 h-3" /> Internship
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Briefcase className="w-3 h-3" /> Job
                          </span>
                        )}
                      </td>

                      {/* Column 4: Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            opp
                          )}`}
                        >
                          {opp.isExpired && opp.status === "Published" ? "Expired" : opp.status}
                        </span>
                      </td>

                      {/* Column 5: Applications Count (clickable) */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/applications?search=${encodeURIComponent(opp.title)}`)}
                          title="View applications in Application Management"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer border border-indigo-200/50"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{opp.applicationsCount || 0}</span>
                        </button>
                      </td>

                      {/* Column 6: Posted Date */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      {/* Column 7: Deadline */}
                      <td className="py-3 px-4 text-[11px]">
                        {opp.deadline ? (
                          <span
                            className={
                              new Date(opp.deadline) < new Date()
                                ? "text-rose-600 font-semibold flex items-center gap-1"
                                : "text-slate-600"
                            }
                          >
                            {new Date(opp.deadline).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">No deadline</span>
                        )}
                      </td>

                      {/* Column 8: Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Review/Manage */}
                          <button
                            type="button"
                            onClick={() => setSelectedOpportunity(opp)}
                            title="Review Opportunity Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Approve (for Pending or Rejected) */}
                          {opp.status !== "Published" && (
                            <button
                              type="button"
                              onClick={() => handleApprove(opp)}
                              disabled={actionLoading}
                              title="Approve & Publish"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reject (for Pending or Published) */}
                          {opp.status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingOpp(opp);
                                setRejectionReason(REJECTION_REASONS[0]);
                                setAdminNote("");
                              }}
                              disabled={actionLoading}
                              title="Reject Opportunity"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(opp)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Feature / Unfeature */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeature(opp)}
                            disabled={actionLoading}
                            title={opp.isFeatured ? "Unfeature" : "Feature on Candidate Discovery"}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              opp.isFeatured
                                ? "text-amber-500 hover:bg-amber-50"
                                : "text-slate-400 hover:text-amber-500 hover:bg-amber-50/50"
                            }`}
                          >
                            <Star className={`w-4 h-4 ${opp.isFeatured ? "fill-amber-500" : ""}`} />
                          </button>

                          {/* Close Listing */}
                          {opp.status === "Published" && (
                            <button
                              type="button"
                              onClick={() => handleClose(opp)}
                              disabled={actionLoading}
                              title="Close Listing"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-Side Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} opportunities
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchOpportunities(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 font-bold text-slate-800">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => fetchOpportunities(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================
            RECENT MODERATION ACTIVITY (Real AuditLog)
        ================================================== */}
        {recentActivity.length > 0 && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Recent Moderation Activity
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentActivity.map((log) => (
                <div
                  key={log._id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{log.target || "Opportunity"}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{log.details || log.action}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold">by {log.actorName || "Admin"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================
            MODAL 1: REVIEW / MANAGE OPPORTUNITY
        ================================================== */}
        {selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                    {selectedOpportunity.opportunityType === "Internship" ? (
                      <GraduationCap className="w-6 h-6" />
                    ) : (
                      <Briefcase className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedOpportunity.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedOpportunity.companyId?.name || selectedOpportunity.companyName}</span>
                      {selectedOpportunity.companyId?.isVerified && (
                        <span className="text-emerald-600 text-[10px] font-bold">Verified Company</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOpportunity(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overview Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Type</span>
                  <p className="font-bold text-slate-800">{selectedOpportunity.opportunityType || "Job"}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Current Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                      selectedOpportunity
                    )}`}
                  >
                    {selectedOpportunity.status}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Applications</span>
                  <p className="font-bold text-indigo-700">
                    {selectedOpportunity.applicationsCount || 0} Candidates
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Openings</span>
                  <p className="font-bold text-slate-800">{selectedOpportunity.openings || 1}</p>
                </div>
              </div>

              {/* Creator & Moderation Audit */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Posted By:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedOpportunity.createdBy?.fullName || "Employer Partner"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedOpportunity.createdBy?.email || "No email available"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Location & Mode:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedOpportunity.location || "Remote"} ({selectedOpportunity.workMode || "Hybrid"})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Deadline:{" "}
                    {selectedOpportunity.deadline
                      ? new Date(selectedOpportunity.deadline).toLocaleDateString()
                      : "No deadline specified"}
                  </p>
                </div>
              </div>

              {/* Rejection / Moderation Notes */}
              {selectedOpportunity.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                  <span className="font-bold text-rose-800">Rejection Reason:</span>
                  <p className="text-rose-700">{selectedOpportunity.rejectionReason}</p>
                  {selectedOpportunity.adminNote && (
                    <p className="text-rose-600 text-[11px]">Note: {selectedOpportunity.adminNote}</p>
                  )}
                </div>
              )}

              {/* Required Skills */}
              {selectedOpportunity.requiredSkills?.length > 0 && (
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-700">Required Skills:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOpportunity.requiredSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <span className="text-slate-400 block mb-1 font-semibold">Job Description</span>
                <p className="text-slate-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
                  {selectedOpportunity.description || "No description provided."}
                </p>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedOpportunity.status !== "Published" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedOpportunity)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                  )}
                  {selectedOpportunity.status !== "Rejected" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setRejectingOpp(selectedOpportunity);
                        setRejectionReason(REJECTION_REASONS[0]);
                        setAdminNote("");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      openEditModal(selectedOpportunity);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {selectedOpportunity.status === "Published" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleClose(selectedOpportunity)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                    >
                      Close Listing
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOpportunity(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            MODAL 2: REJECT OPPORTUNITY (With Reason & Note)
        ================================================== */}
        {rejectingOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold text-slate-900">Reject Opportunity</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingOpp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                You are rejecting <span className="font-bold text-slate-800">"{rejectingOpp.title}"</span>. The opportunity will be set to Rejected and preserved for audit history. The employer will be notified.
              </p>

              <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Administrative Note (Sent to Employer)
                  </label>
                  <textarea
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Provide actionable guidance or explain required corrections..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingOpp(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs transition cursor-pointer"
                  >
                    {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================
            MODAL 3: EDIT OPPORTUNITY (Direct MongoDB Save)
        ================================================== */}
        {editingOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold text-slate-900">Edit Opportunity Information</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOpp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Mode</label>
                    <select
                      value={editFormData.workMode}
                      onChange={(e) => setEditFormData({ ...editFormData, workMode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Openings</label>
                    <input
                      type="number"
                      min={1}
                      value={editFormData.openings}
                      onChange={(e) => setEditFormData({ ...editFormData, openings: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={editFormData.deadline}
                      onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Required Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.requiredSkills}
                    onChange={(e) => setEditFormData({ ...editFormData, requiredSkills: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="React, Node.js, TypeScript"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOpp(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOpportunities;
