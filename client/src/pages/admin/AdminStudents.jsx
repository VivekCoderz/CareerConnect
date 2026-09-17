import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminStudents, updateStudentStatus } from "../../services/adminService";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  UserCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  FileText,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";

const AdminStudents = () => {
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    students: 0,
    freshers: 0,
    professionals: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchCandidates = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminStudents({
        search,
        userType,
        status,
        page,
        limit: 12,
      });
      if (res?.success) {
        setCandidates(res.data.candidates || []);
        setStats(res.data.stats || {});
        setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  }, [search, userType, status]);

  useEffect(() => {
    fetchCandidates(1);
  }, [fetchCandidates]);

  const handleToggleStatus = async (candidate) => {
    const nextStatus = !candidate.isActive;
    const confirmMsg = nextStatus
      ? `Are you sure you want to activate candidate ${candidate.fullName}?`
      : `Are you sure you want to suspend candidate ${candidate.fullName}? They will not be able to log in.`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(candidate._id);
    try {
      const res = await updateStudentStatus(candidate._id, nextStatus);
      if (res?.success) {
        setCandidates((prev) =>
          prev.map((c) => (c._id === candidate._id ? { ...c, isActive: nextStatus } : c))
        );
        setStats((prev) => ({
          ...prev,
          active: nextStatus ? prev.active + 1 : Math.max(0, prev.active - 1),
          suspended: nextStatus ? Math.max(0, prev.suspended - 1) : prev.suspended + 1,
        }));
      }
    } catch (err) {
      console.error("Failed to update candidate status:", err);
      alert("Failed to update candidate status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getUserTypeBadge = (type) => {
    switch (type) {
      case "student":
        return {
          label: "Student",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: GraduationCap,
        };
      case "fresher":
        return {
          label: "Fresher",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: UserCheck,
        };
      case "professional":
        return {
          label: "Professional",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Briefcase,
        };
      default:
        return {
          label: "Candidate",
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Users,
        };
    }
  };

  return (
    <AdminLayout onRefresh={() => fetchCandidates(pagination.page)} isRefreshing={loading}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Student & Candidate Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Page 25
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Global directory of registered students, freshers, and working professionals across the platform.
            </p>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Candidates</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.total || 0}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
              <span>{stats.students || 0} Students</span>
              <span>•</span>
              <span>{stats.freshers || 0} Freshers</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Accounts</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{stats.active || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Eligible to apply & interview</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Suspended / Inactive</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-2">{stats.suspended || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Restricted from login</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Working Professionals</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-purple-700 mt-2">{stats.professionals || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Experienced talent</p>
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
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Type and Status Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Profiles</option>
              <option value="student">Student</option>
              <option value="fresher">Fresher</option>
              <option value="professional">Working Professional</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-semibold">Loading platform candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No candidates found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Profile</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {candidates.map((cand) => {
                    const badge = getUserTypeBadge(cand.userType);
                    const Icon = badge.icon;
                    return (
                      <tr key={cand._id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {cand.fullName ? cand.fullName[0].toUpperCase() : "U"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{cand.fullName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">@{cand.username || "candidate"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                          >
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{cand.email}</p>
                          <p className="text-[11px] text-slate-400">
                            {cand.phone ? `${cand.countryCode || "+91"} ${cand.phone}` : "No phone provided"}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <div className="w-24">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span>Complete</span>
                              <span className="font-bold">{cand.profileCompletion || 0}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${cand.profileCompletion || 0}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {cand.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> Suspended
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString() : "N/A"}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCandidate(cand)}
                              title="View Details"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cand)}
                              disabled={updatingId === cand._id}
                              title={cand.isActive ? "Suspend Account" : "Activate Account"}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                cand.isActive
                                  ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {updatingId === cand._id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                              ) : cand.isActive ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} candidates
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCandidates(pagination.page - 1)}
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
                  onClick={() => fetchCandidates(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Candidate Details Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center">
                    {selectedCandidate.fullName ? selectedCandidate.fullName[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedCandidate.fullName}</h3>
                    <p className="text-xs text-slate-400">@{selectedCandidate.username || "candidate"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3" /> Email
                    </span>
                    <p className="font-semibold text-slate-800 break-all">{selectedCandidate.email}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3" /> Phone
                    </span>
                    <p className="font-semibold text-slate-800">
                      {selectedCandidate.phone
                        ? `${selectedCandidate.countryCode || "+91"} ${selectedCandidate.phone}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3" /> Candidate Category
                    </span>
                    <p className="font-semibold text-slate-800 capitalize">
                      {selectedCandidate.userType || "Student"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-400 flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3" /> Join Date
                    </span>
                    <p className="font-semibold text-slate-800">
                      {selectedCandidate.createdAt
                        ? new Date(selectedCandidate.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {selectedCandidate.resumeUrl && (
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Resume on Record</p>
                        <p className="text-[11px] text-slate-400">
                          {selectedCandidate.resumeName || "candidate_resume.pdf"}
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedCandidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(selectedCandidate);
                    setSelectedCandidate((prev) => ({ ...prev, isActive: !prev.isActive }));
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedCandidate.isActive
                      ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {selectedCandidate.isActive ? "Suspend Account" : "Activate Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
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

export default AdminStudents;
