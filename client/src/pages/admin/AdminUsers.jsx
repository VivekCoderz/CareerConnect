import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminUsers, updateUserStatus } from "../../services/adminService";
import { useLocation } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  GraduationCap,
  Building2,
  Briefcase,
  Sparkles,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const AdminUsers = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get("userType") || "all";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await getAdminUsers({
        userType,
        search,
        status: statusFilter,
        page,
        limit,
      });

      if (res?.success) {
        setUsers(res.users || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setActionError(err.response?.data?.message || "Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [userType, search, statusFilter, limit]);

  useEffect(() => {
    fetchUsers();
  }, [userType, search, statusFilter, page, limit]);

  const handleStatusToggle = async (targetUser) => {
    const newStatus = targetUser.status === "active" || targetUser.isActive ? "inactive" : "active";
    try {
      setActionError(null);
      setActionSuccess(null);
      const res = await updateUserStatus(targetUser._id, newStatus);
      if (res?.success) {
        setActionSuccess(`User ${targetUser.fullName || targetUser.email} marked as ${newStatus}.`);
        setUsers((prev) =>
          prev.map((u) =>
            u._id === targetUser._id
              ? { ...u, status: newStatus, isActive: newStatus === "active" }
              : u
          )
        );
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update user status";
      setActionError(errorMsg);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const getRoleBadge = (u) => {
    if (u.role === "SUPER_ADMIN") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          SUPER_ADMIN
        </span>
      );
    }
    if (u.role === "COMPANY_ADMIN") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          COMPANY_ADMIN
        </span>
      );
    }
    if (u.role === "employer" || u.userType === "employer") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          EMPLOYER
        </span>
      );
    }
    if (u.userType === "student") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          STUDENT
        </span>
      );
    }
    if (u.userType === "fresher") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          FRESHER
        </span>
      );
    }
    if (u.userType === "professional") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          PROFESSIONAL
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {u.userType?.toUpperCase() || u.role?.toUpperCase() || "USER"}
      </span>
    );
  };

  const startRecord = totalCount === 0 ? 0 : (page - 1) * (limit === "all" ? totalCount : Number(limit)) + 1;
  const endRecord = limit === "all" ? totalCount : Math.min(page * Number(limit), totalCount);

  return (
    <AdminLayout onRefresh={fetchUsers} isRefreshing={loading}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalCount} Total Database Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dynamic real-time query of MongoDB users with RBAC security & tenant isolation.
            </p>
          </div>

          {/* User Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {[
              { label: "All Users", value: "all" },
              { label: "Students", value: "student" },
              { label: "Employers", value: "employer" },
              { label: "Freshers", value: "fresher" },
              { label: "Professionals", value: "professional" },
              { label: "Admins", value: "admin" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setUserType(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  userType === tab.value
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Security / Action Alerts */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Search, Status & Page Size Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-400">Show:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer hover:bg-slate-100 font-semibold"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value="all">All Records</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User Profile</th>
                  <th className="px-5 py-3.5">Category / Role</th>
                  <th className="px-5 py-3.5">Tenant Association</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5">Registered Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span>Querying real database records...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      0 users found matching your query criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isUserActive = u.status === "active" || (u.status === undefined && u.isActive !== false);
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {u.profileImage ? (
                              <img
                                src={u.profileImage}
                                alt={u.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                                {u.fullName?.charAt(0).toUpperCase() || "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="block font-bold text-slate-900 truncate">
                                {u.fullName || "Unnamed User"}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">{getRoleBadge(u)}</td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {u.companyId?.name ? (
                            <span className="font-semibold text-slate-700">
                              {u.companyId.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Platform Wide</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(u)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              isUserActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            {isUserActive ? "Active" : "Inactive"}
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(u)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            {isUserActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Dynamic Pagination Bar */}
          {!loading && totalCount > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-slate-700">{startRecord}</span> to{" "}
                <span className="font-bold text-slate-700">{endRecord}</span> of{" "}
                <span className="font-bold text-slate-700">{totalCount}</span> users
              </div>

              {limit !== "all" && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 1)
                    .map((pNum, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={pNum}>
                          {prev && pNum - prev > 1 && (
                            <span className="px-1 text-slate-400">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPage(pNum)}
                            className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                              page === pNum
                                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {pNum}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
