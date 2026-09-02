import React, { useState, useMemo } from "react";
import OfferLetterPreviewModal from "./OfferLetterPreviewModal";
import OfferAuditTrailModal from "./OfferAuditTrailModal";
import OfferModal from "./OfferModal";
import recruitmentService from "../../services/recruitmentService";

const OfferManagementHub = ({
  offers = [],
  stats = null,
  jobs = [],
  onRefresh,
  showToast,
  companyName = "CareerConnect Partner Organization",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modal states
  const [previewOffer, setPreviewOffer] = useState(null);
  const [auditOffer, setAuditOffer] = useState(null);
  const [editOffer, setEditOffer] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Status badges & color themes
  const getStatusBadge = (status) => {
    switch (status) {
      case "Draft":
        return { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-300", icon: "📝" };
      case "Pending Approval":
        return { label: "Pending Approval", bg: "bg-amber-100 text-amber-900 border-amber-300", icon: "⏳" };
      case "Approved":
        return { label: "Approved (Ready)", bg: "bg-teal-50 text-teal-700 border-teal-200", icon: "✅" };
      case "Sent":
        return { label: "Sent (Awaiting)", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: "📨" };
      case "Viewed":
        return { label: "Viewed by Candidate", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: "👁️" };
      case "Accepted":
        return { label: "Accepted 🎉", bg: "bg-green-100 text-green-800 border-green-300", icon: "🎉" };
      case "Rejected":
        return { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: "❌" };
      case "Expired":
        return { label: "Expired", bg: "bg-stone-100 text-stone-700 border-stone-300", icon: "⌛" };
      case "Withdrawn":
        return { label: "Withdrawn", bg: "bg-red-50 text-red-700 border-red-200", icon: "🚫" };
      default:
        return { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200", icon: "📌" };
    }
  };

  // Summary Metrics
  const calculatedStats = useMemo(() => {
    if (stats) return stats;
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return {
      total: offers.length,
      pendingApproval: offers.filter((o) => o.status === "Pending Approval").length,
      pendingCandidate: offers.filter((o) => ["Sent", "Viewed"].includes(o.status)).length,
      accepted: offers.filter((o) => o.status === "Accepted").length,
      rejected: offers.filter((o) => o.status === "Rejected").length,
      expired: offers.filter((o) => o.status === "Expired").length,
      expiringSoon: offers.filter(
        (o) =>
          ["Sent", "Viewed"].includes(o.status) &&
          new Date(o.expiryDate) > now &&
          new Date(o.expiryDate) <= threeDays
      ).length,
    };
  }, [offers, stats]);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const deps = new Set(["All"]);
    offers.forEach((o) => {
      if (o.department) deps.add(o.department);
    });
    return Array.from(deps);
  }, [offers]);

  // Filtered & Sorted Offers
  const filteredOffers = useMemo(() => {
    return offers
      .filter((o) => {
        // Status filter
        if (statusFilter === "Pending") {
          if (!["Pending Approval", "Sent", "Viewed"].includes(o.status)) return false;
        } else if (statusFilter !== "All" && o.status !== statusFilter) {
          return false;
        }

        // Department filter
        if (departmentFilter !== "All" && o.department !== departmentFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const candName = o.candidateId?.fullName?.toLowerCase() || "";
          const candEmail = o.candidateId?.email?.toLowerCase() || "";
          const desig = o.designation?.toLowerCase() || "";
          const ref = o.offerLetterRefNo?.toLowerCase() || "";
          return candName.includes(q) || candEmail.includes(q) || desig.includes(q) || ref.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        } else if (sortBy === "expiringSoon") {
          return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
        } else if (sortBy === "salaryHigh") {
          return (b.salary || 0) - (a.salary || 0);
        } else if (sortBy === "joiningDate") {
          return new Date(a.joiningDate || 0) - new Date(b.joiningDate || 0);
        }
        return 0;
      });
  }, [offers, statusFilter, departmentFilter, searchQuery, sortBy]);

  // Quick Action Handlers
  const handleSubmitForApproval = async (offerId) => {
    try {
      setActionLoading(true);
      await recruitmentService.submitOfferForApproval(offerId);
      if (showToast) showToast("Offer submitted for HR Manager approval!");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to submit offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndSend = async (offerId) => {
    try {
      setActionLoading(true);
      await recruitmentService.approveOffer(offerId, { sendDirectly: true });
      if (showToast) showToast("Offer approved and dispatched to candidate!");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to approve offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOffer = async (offerId) => {
    try {
      setActionLoading(true);
      await recruitmentService.sendOffer(offerId);
      if (showToast) showToast("Offer letter released to candidate!");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to send offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    if (!window.confirm("Are you sure you want to withdraw this formal job offer?")) return;
    try {
      setActionLoading(true);
      await recruitmentService.withdrawOffer(offerId, { reason: "Position closed / terms revised" });
      if (showToast) showToast("Offer letter has been withdrawn.");
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to withdraw offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOffer = async (payload) => {
    await recruitmentService.createOffer(payload);
    if (showToast) showToast("Offer created successfully!");
    if (onRefresh) onRefresh();
  };

  const handleUpdateOffer = async (offerId, payload) => {
    await recruitmentService.updateOffer(offerId, payload);
    if (showToast) showToast("Offer letter updated successfully!");
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Offer Letter Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, approve, dispatch, track, and audit candidate job offers with official letterhead
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
        >
          <span className="text-sm font-black">+</span> Create Formal Offer
        </button>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Offers */}
        <div
          onClick={() => setStatusFilter("All")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "All" ? "border-slate-800 ring-2 ring-slate-800/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Offers</span>
            <span className="text-sm">📁</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{calculatedStats.total}</p>
          <span className="text-[10px] text-slate-400 font-medium">All recorded offers</span>
        </div>

        {/* Pending Approval */}
        <div
          onClick={() => setStatusFilter("Pending Approval")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Pending Approval" ? "border-amber-500 ring-2 ring-amber-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approval</span>
            <span className="text-sm">⏳</span>
          </div>
          <p className="text-2xl font-black text-amber-700">{calculatedStats.pendingApproval}</p>
          <span className="text-[10px] text-amber-600 font-medium">Needs HR review</span>
        </div>

        {/* Awaiting Candidate */}
        <div
          onClick={() => setStatusFilter("Sent")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Sent" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Response</span>
            <span className="text-sm">📨</span>
          </div>
          <p className="text-2xl font-black text-blue-700">{calculatedStats.pendingCandidate}</p>
          <span className="text-[10px] text-blue-600 font-medium">Sent to candidate</span>
        </div>

        {/* Accepted */}
        <div
          onClick={() => setStatusFilter("Accepted")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Accepted" ? "border-green-600 ring-2 ring-green-600/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-green-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Accepted</span>
            <span className="text-sm">🎉</span>
          </div>
          <p className="text-2xl font-black text-green-700">{calculatedStats.accepted}</p>
          <span className="text-[10px] text-green-600 font-medium">Ready for onboarding</span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setStatusFilter("Rejected")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            statusFilter === "Rejected" ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
            <span className="text-sm">❌</span>
          </div>
          <p className="text-2xl font-black text-rose-700">{calculatedStats.rejected}</p>
          <span className="text-[10px] text-rose-600 font-medium">Declined by candidate</span>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => {
            setSortBy("expiringSoon");
            setStatusFilter("Sent");
          }}
          className={`p-4 rounded-3xl bg-amber-500/5 border cursor-pointer transition hover:shadow-sm ${
            calculatedStats.expiringSoon > 0 ? "border-amber-400 bg-amber-50/40" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring Soon</span>
            <span className="text-sm">⚡</span>
          </div>
          <p className="text-2xl font-black text-amber-800">{calculatedStats.expiringSoon}</p>
          <span className="text-[10px] text-amber-700 font-medium">≤ 3 days remaining</span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3.5">
        {/* Top Controls */}
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
              placeholder="Search candidate name, email, position, or ref number..."
              className="w-full h-10 pl-9 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#f59e0b] transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-[#f59e0b]"
            >
              {departmentsList.map((dep) => (
                <option key={dep} value={dep}>
                  {dep === "All" ? "All Departments" : dep}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-[#f59e0b]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="expiringSoon">Sort: Expiring Soonest</option>
              <option value="salaryHigh">Sort: Highest CTC</option>
              <option value="joiningDate">Sort: Joining Date</option>
            </select>

            {/* View Mode Toggle */}
            <div className="h-10 p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                ⊞ Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Compact Table View"
              >
                ☰ Table
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          {[
            { id: "All", label: "All Offers" },
            { id: "Draft", label: "📝 Drafts" },
            { id: "Pending Approval", label: "⏳ Pending Approval" },
            { id: "Sent", label: "📨 Sent / Active" },
            { id: "Viewed", label: "👁️ Viewed" },
            { id: "Accepted", label: "🎉 Accepted" },
            { id: "Rejected", label: "❌ Rejected" },
            { id: "Expired", label: "⌛ Expired" },
            { id: "Withdrawn", label: "🚫 Withdrawn" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                statusFilter === pill.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* OFFERS DISPLAY SECTION */}
      {filteredOffers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl font-bold">
            📜
          </div>
          <h4 className="text-base font-bold text-slate-900">No Job Offers Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== "All"
              ? "No offers matching your selected filters or search query."
              : "No formal job offers have been generated yet. Select a candidate from ATS or click 'Create Formal Offer' to begin."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition inline-block mt-2"
          >
            + Create New Offer
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((off) => {
            const badge = getStatusBadge(off.status);
            const cand = off.candidateId || {};
            const isExpiringSoon =
              ["Sent", "Viewed"].includes(off.status) &&
              off.expiryDate &&
              new Date(off.expiryDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            return (
              <div
                key={off._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center">
                        {cand.fullName ? cand.fullName.charAt(0) : "C"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {cand.fullName || "Candidate"}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {off.offerLetterRefNo || "OFF-2026"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1 ${badge.bg}`}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Position & Department */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{off.designation}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {off.employmentType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {off.department} • {off.workLocationType || "Hybrid"}
                    </p>
                  </div>

                  {/* Compensation & Dates */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/60">
                      <span className="text-[10px] text-amber-800 font-medium block">Total CTC</span>
                      <span className="text-xs font-black text-amber-900 font-mono">
                        ₹{off.salary?.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-amber-700 block">{off.salaryPeriod}</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 font-medium block">Expected Joining</span>
                      <span className="text-xs font-bold text-slate-800">
                        {off.joiningDate ? new Date(off.joiningDate).toLocaleDateString() : "Immediate"}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Expires: {off.expiryDate ? new Date(off.expiryDate).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Expiring Soon Alert */}
                  {isExpiringSoon && (
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[10.5px] font-semibold flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Response deadline is approaching!</span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewOffer(off)}
                      className="flex-1 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>📄</span>
                      <span>View Letter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuditOffer(off)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      title="View Audit Trail"
                    >
                      ⏱️
                    </button>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {off.status === "Draft" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditOffer(off)}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition text-center"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleSubmitForApproval(off._id)}
                          className="flex-1 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10.5px] font-bold transition text-center"
                        >
                          Request Approval
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleSendOffer(off._id)}
                          className="flex-1 py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10.5px] font-bold transition text-center"
                        >
                          Send Now
                        </button>
                      </>
                    )}

                    {off.status === "Pending Approval" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditOffer(off)}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition text-center"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApproveAndSend(off._id)}
                          className="flex-2 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold transition text-center"
                        >
                          ✓ Approve & Send
                        </button>
                      </>
                    )}

                    {["Sent", "Viewed"].includes(off.status) && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleWithdrawOffer(off._id)}
                        className="w-full py-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10.5px] font-bold transition text-center"
                      >
                        🚫 Withdraw Offer
                      </button>
                    )}

                    {["Expired", "Withdrawn"].includes(off.status) && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleSendOffer(off._id)}
                        className="w-full py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-bold transition text-center"
                      >
                        🔄 Re-issue / Send Again
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
                  <th className="py-3 px-4">Position / Department</th>
                  <th className="py-3 px-4">Compensation (CTC)</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOffers.map((off) => {
                  const badge = getStatusBadge(off.status);
                  const cand = off.candidateId || {};
                  return (
                    <tr key={off._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cand.fullName || "Candidate"}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{off.offerLetterRefNo || "OFF-2026"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{off.designation}</div>
                        <div className="text-[11px] text-slate-500">{off.department} • {off.employmentType}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">₹{off.salary?.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">{off.salaryPeriod}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {off.joiningDate ? new Date(off.joiningDate).toLocaleDateString() : "Immediate"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {off.expiryDate ? new Date(off.expiryDate).toLocaleDateString() : "N/A"}
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
                            onClick={() => setPreviewOffer(off)}
                            className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] text-white text-[11px] font-bold hover:bg-[#1e40af] transition"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuditOffer(off)}
                            className="p-1 px-2 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition"
                            title="Audit Log"
                          >
                            ⏱️
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
      {/* 1. Official Offer Letter Preview & Print PDF */}
      <OfferLetterPreviewModal
        isOpen={Boolean(previewOffer)}
        onClose={() => setPreviewOffer(null)}
        offer={previewOffer}
        companyName={companyName}
      />

      {/* 2. Audit Trail History Modal */}
      <OfferAuditTrailModal
        isOpen={Boolean(auditOffer)}
        onClose={() => setAuditOffer(null)}
        offer={auditOffer}
      />

      {/* 3. Create Offer Modal */}
      <OfferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOffer={handleCreateOffer}
        jobs={jobs}
      />

      {/* 4. Edit Offer Modal */}
      <OfferModal
        isOpen={Boolean(editOffer)}
        onClose={() => setEditOffer(null)}
        offerToEdit={editOffer}
        onUpdateOffer={handleUpdateOffer}
        jobs={jobs}
      />
    </div>
  );
};

export default OfferManagementHub;
