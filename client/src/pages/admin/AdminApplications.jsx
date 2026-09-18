import JourneyLoader from "../../components/common/JourneyLoader";
import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminApplications, updateApplicationStatus } from "../../services/adminService";
import { getResumeHref } from "../../utils/resumeAccess";
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  CalendarCheck,
  Award,
  XCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Building2,
  X,
  FileText,
} from "lucide-react";

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    applied: 0,
    reviewing: 0,
    shortlisted: 0,
    interview: 0,
    hired: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchApplications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminApplications({
        status,
        type,
        search,
        page,
        limit: 12,
      });
      if (res?.success) {
        setApplications(res.data.applications || []);
        setStats(res.data.stats || {});
        setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  }, [status, type, search]);

  useEffect(() => {
    fetchApplications(1);
  }, [fetchApplications]);

  const handleStageChange = async (appId, nextStatus) => {
    setUpdatingId(appId);
    try {
      const res = await updateApplicationStatus(appId, nextStatus);
      if (res?.success) {
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, status: nextStatus } : a))
        );
      }
    } catch (err) {
      console.error("Failed to update application stage:", err);
      alert("Failed to update stage. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStageBadge = (st) => {
    const s = (st || "").toLowerCase();
    if (s.includes("applied")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes("review")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("shortlist")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (s.includes("interview")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (s.includes("hire")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("reject") || s.includes("withdraw")) return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <AdminLayout onRefresh={() => fetchApplications(pagination.page)} isRefreshing={loading}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Application Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Page 28
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Global overview of candidate submissions, interview pipeline advancement, and placement outcomes.
            </p>
          </div>
        </div>

        {/* Funnel Pipeline KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500">Total</span>
            <p className="text-xl font-black text-slate-900 mt-1">{stats.total || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">All Submissions</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-amber-600">In Review</span>
            <p className="text-xl font-black text-amber-600 mt-1">{stats.reviewing || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Under Assessment</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-indigo-600">Shortlisted</span>
            <p className="text-xl font-black text-indigo-600 mt-1">{stats.shortlisted || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Qualified Talent</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-purple-600">Interviews</span>
            <p className="text-xl font-black text-purple-600 mt-1">{stats.interview || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Scheduled / Conducted</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-600">Placed / Hired</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{stats.hired || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Successful Offers</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-rose-600">Rejected</span>
            <p className="text-xl font-black text-rose-600 mt-1">{stats.rejected || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Not Selected</p>
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
              placeholder="Search opportunity, company, candidate..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="Job">Jobs Only</option>
              <option value="Internship">Internships Only</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Stages</option>
              <option value="Applied">Applied</option>
              <option value="Under Review">Under Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <JourneyLoader variant="admin" size="sm" className="mb-2" />
              <p className="text-xs font-semibold">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No applications found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Applied Opportunity</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Applied Date</th>
                    <th className="py-3.5 px-4">Stage</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {app.candidateId?.fullName ? app.candidateId.fullName[0].toUpperCase() : "C"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {app.candidateId?.fullName || "Candidate"}
                            </p>
                            <p className="text-[11px] text-slate-400">{app.candidateId?.email || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {app.opportunityType === "Internship" ? (
                            <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : (
                            <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                            {app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Role"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {app.companyName || app.employerId?.companyName || "Organization"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStageBadge(
                            app.status
                          )}`}
                        >
                          {app.status || "Applied"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedApplication(app)}
                            title="View Application Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <select
                            value={app.status || "Applied"}
                            onChange={(e) => handleStageChange(app._id, e.target.value)}
                            disabled={updatingId === app._id}
                            className="text-[11px] py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview</option>
                            <option value="Hired">Hired</option>
                            <option value="Rejected">Rejected</option>
                          </select>
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchApplications(pagination.page - 1)}
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
                  onClick={() => fetchApplications(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedApplication.opportunityTitle || "Application Record"}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedApplication.companyName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-400 block mb-1">Candidate</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedApplication.candidateId?.fullName}</p>
                  <p className="text-slate-500">{selectedApplication.candidateId?.email}</p>
                  <p className="text-slate-500">{selectedApplication.candidateId?.phone || "No phone"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Opportunity Type</span>
                    <p className="font-semibold text-slate-800">{selectedApplication.opportunityType}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Current Stage</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadge(
                        selectedApplication.status
                      )}`}
                    >
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>

                {selectedApplication.coverNote && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Candidate Cover Note</span>
                    <p className="text-slate-700 leading-relaxed max-h-28 overflow-y-auto">
                      {selectedApplication.coverNote}
                    </p>
                  </div>
                )}

                {selectedApplication.candidateId?.resumeUrl && (
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Attached Resume</p>
                        <p className="text-[11px] text-slate-400">PDF Document</p>
                      </div>
                    </div>
                    <a
                      href={getResumeHref(selectedApplication.candidateId.resumeUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
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

export default AdminApplications;
