import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminEmployers, updateEmployerStatus } from "../../services/adminService";
import {
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  Globe,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const AdminEmployers = () => {
  const [employers, setEmployers] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchEmployers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminEmployers({
        search,
        status,
        page,
        limit: 12,
      });
      if (res?.success) {
        setEmployers(res.data.employers || []);
        setStats(res.data.stats || { total: 0, verified: 0, pending: 0 });
        setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load employers:", err);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchEmployers(1);
  }, [fetchEmployers]);

  const handleToggleVerification = async (employer) => {
    const nextVerified = !employer.isPublished;
    const confirmMsg = nextVerified
      ? `Verify employer "${employer.companyName}"? Their company profile and opportunities will be visible to all candidates.`
      : `Unverify employer "${employer.companyName}"? Their listings will be paused.`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(employer._id);
    try {
      const res = await updateEmployerStatus(employer._id, { isPublished: nextVerified });
      if (res?.success) {
        setEmployers((prev) =>
          prev.map((e) => (e._id === employer._id ? { ...e, isPublished: nextVerified } : e))
        );
        setStats((prev) => ({
          ...prev,
          verified: nextVerified ? prev.verified + 1 : Math.max(0, prev.verified - 1),
          pending: nextVerified ? Math.max(0, prev.pending - 1) : prev.pending + 1,
        }));
      }
    } catch (err) {
      console.error("Failed to update employer verification:", err);
      alert("Failed to update employer status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout onRefresh={() => fetchEmployers(pagination.page)} isRefreshing={loading}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Employer & Organization Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Page 26
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify corporate recruiters, moderate organization profiles, and oversee job posting privileges.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Organizations</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.total || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Recruiting partners registered</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Verified & Active</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{stats.verified || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Approved to post jobs & hire</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Pending Verification</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-2">{stats.pending || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting admin review</p>
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
              placeholder="Search company name, email, industry..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Organizations</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Verification Only</option>
            </select>
          </div>
        </div>

        {/* Employers Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-semibold">Loading employer accounts...</p>
            </div>
          ) : employers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No employers found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Industry</th>
                    <th className="py-3.5 px-4">Recruiter</th>
                    <th className="py-3.5 px-4">Opportunities</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {employers.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.logo ? (
                              <img src={emp.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              emp.companyName ? emp.companyName[0].toUpperCase() : "C"
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{emp.companyName}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {emp.officialEmail || "no-email@company.com"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {emp.industry || "General"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">
                          {emp.recruiter?.name || emp.userId?.fullName || "Company Admin"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {emp.recruiter?.designation || "HR Lead"}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-slate-800">
                            {emp.totalOpportunities || 0}
                          </span>
                          <span className="text-slate-400">
                            ({emp.postedJobsCount || 0} jobs, {emp.postedInternshipsCount || 0} interns)
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {emp.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployer(emp)}
                            title="View Profile Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleVerification(emp)}
                            disabled={updatingId === emp._id}
                            title={emp.isPublished ? "Revoke Verification" : "Approve & Verify Organization"}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              emp.isPublished
                                ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {updatingId === emp._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                            ) : emp.isPublished ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </button>
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employers
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchEmployers(pagination.page - 1)}
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
                  onClick={() => fetchEmployers(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Employer Details Modal */}
        {selectedEmployer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold flex items-center justify-center text-sm">
                    {selectedEmployer.companyName ? selectedEmployer.companyName[0].toUpperCase() : "C"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedEmployer.companyName}</h3>
                    <p className="text-xs text-slate-400">{selectedEmployer.industry || "Information Technology"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmployer(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3" /> Official Email
                    </span>
                    <p className="font-semibold text-slate-800 break-all">{selectedEmployer.officialEmail || "N/A"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3" /> Website
                    </span>
                    <p className="font-semibold text-slate-800 truncate">
                      {selectedEmployer.website ? (
                        <a
                          href={selectedEmployer.website.startsWith("http") ? selectedEmployer.website : `https://${selectedEmployer.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          {selectedEmployer.website} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-400 block mb-1">About Company</span>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedEmployer.description || selectedEmployer.tagline || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Recruiter Contact</span>
                    <p className="font-semibold text-slate-800">
                      {selectedEmployer.recruiter?.name || "Company Admin"}
                    </p>
                    <p className="text-[11px] text-slate-400">{selectedEmployer.recruiter?.email || selectedEmployer.officialEmail}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 block mb-1">Total Postings</span>
                    <p className="font-semibold text-slate-800">
                      {selectedEmployer.totalOpportunities || 0} Total Listings
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {selectedEmployer.postedJobsCount || 0} Jobs, {selectedEmployer.postedInternshipsCount || 0} Internships
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleVerification(selectedEmployer);
                    setSelectedEmployer((prev) => ({ ...prev, isPublished: !prev.isPublished }));
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedEmployer.isPublished
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {selectedEmployer.isPublished ? "Revoke Verification" : "Approve & Verify Organization"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployer(null)}
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

export default AdminEmployers;
