import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminOpportunities, updateOpportunityStatus } from "../../services/adminService";
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
} from "lucide-react";

const AdminOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
    closed: 0,
    totalJobs: 0,
    totalInternships: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOpportunities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminOpportunities({
        type,
        status,
        search,
        page,
        limit: 12,
      });
      if (res?.success) {
        setOpportunities(res.data.opportunities || []);
        setStats(res.data.stats || {});
        setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load opportunities:", err);
    } finally {
      setLoading(false);
    }
  }, [type, status, search]);

  useEffect(() => {
    fetchOpportunities(1);
  }, [fetchOpportunities]);

  const handleStatusChange = async (opp, nextStatus) => {
    const oppType = opp.opportunityType?.toLowerCase() || (opp.duration ? "internship" : "job");
    const confirmMsg = `Change status of "${opp.title}" to ${nextStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(opp._id);
    try {
      const res = await updateOpportunityStatus(oppType, opp._id, nextStatus);
      if (res?.success) {
        setOpportunities((prev) =>
          prev.map((o) => (o._id === opp._id ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update opportunity status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case "Published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending Approval":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Closed":
      case "Paused":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
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
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Page 27
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Platform-wide moderation of Job Openings and Internship listings posted by employers.
            </p>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Listings</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.total || 0}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
              <span>{stats.totalJobs || 0} Jobs</span>
              <span>•</span>
              <span>{stats.totalInternships || 0} Internships</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active & Published</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{stats.published || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Accepting candidate applications</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pending Review</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2">{stats.pending || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Requires admin approval</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Closed / Expired</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-2">{stats.closed || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Applications halted</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, company, location..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Type & Status Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Opportunities</option>
              <option value="job">Jobs Only</option>
              <option value="internship">Internships Only</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="Published">Published</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-semibold">Loading opportunities...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No opportunities found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Opportunity</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Mode / Location</th>
                    <th className="py-3.5 px-4">Applicants</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Posted Date</th>
                    <th className="py-3.5 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {opportunities.map((opp) => (
                    <tr key={opp._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{opp.title}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {opp.companyName || "Organization"}
                          </p>
                        </div>
                      </td>

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

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">
                          {opp.workMode || opp.employmentType || "Full-time"}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {opp.location || "Remote"}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                          <FileSpreadsheet className="w-3 h-3 text-slate-500" />
                          {opp.applicationsCount || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            opp.status
                          )}`}
                        >
                          {opp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOpportunity(opp)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {opp.status !== "Published" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(opp, "Published")}
                              disabled={updatingId === opp._id}
                              title="Approve / Publish"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {opp.status === "Published" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(opp, "Closed")}
                              disabled={updatingId === opp._id}
                              title="Close Listing"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} opportunities
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchOpportunities(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-slate-800">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchOpportunities(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Opportunity Details Modal */}
        {selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedOpportunity.title}</h3>
                    <p className="text-xs text-slate-400">{selectedOpportunity.companyName}</p>
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

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Opportunity Type</span>
                    <p className="font-semibold text-slate-800">{selectedOpportunity.opportunityType || "Job"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Current Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        selectedOpportunity.status
                      )}`}
                    >
                      {selectedOpportunity.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Location & Mode</span>
                    <p className="font-semibold text-slate-800">
                      {selectedOpportunity.location || "Remote"} ({selectedOpportunity.workMode || "Hybrid"})
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Applications Received</span>
                    <p className="font-semibold text-slate-800">{selectedOpportunity.applicationsCount || 0} Candidates</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-400 block mb-1">Description</span>
                  <p className="text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedOpportunity.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedOpportunity.status !== "Published" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(selectedOpportunity, "Published");
                        setSelectedOpportunity((prev) => ({ ...prev, status: "Published" }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                  {selectedOpportunity.status === "Published" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange(selectedOpportunity, "Closed");
                        setSelectedOpportunity((prev) => ({ ...prev, status: "Closed" }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition cursor-pointer"
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
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOpportunities;
