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
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers({
        userType,
        search,
        status: statusFilter,
        page,
        limit: 15,
      });

      if (res?.success) {
        setUsers(res.users || []);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userType, search, statusFilter, page]);

  const handleStatusToggle = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await updateUserStatus(user._id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user status");
    }
  };

  const getRoleBadge = (u) => {
    if (u.role === "SUPER_ADMIN") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">SUPER_ADMIN</span>;
    }
    if (u.role === "COMPANY_ADMIN") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">COMPANY_ADMIN</span>;
    }
    if (u.userType === "employer") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">EMPLOYER</span>;
    }
    if (u.userType === "student") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">STUDENT</span>;
    }
    if (u.userType === "fresher") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">FRESHER</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{u.userType?.toUpperCase() || "USER"}</span>;
  };

  return (
    <AdminLayout onRefresh={fetchUsers} isRefreshing={loading}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalCount} Real Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dynamic real MongoDB users query. Scoped to company for Company Admins, global for Super Admins.
            </p>
          </div>

          {/* User Type Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {[
              { label: "All Users", value: "all" },
              { label: "Students", value: "student" },
              { label: "Employers", value: "employer" },
              { label: "Freshers", value: "fresher" },
              { label: "Professionals", value: "professional" },
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

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-3">User Profile</th>
                  <th className="px-5 py-3">Category / Role</th>
                  <th className="px-5 py-3">Tenant Association</th>
                  <th className="px-5 py-3">Account Status</th>
                  <th className="px-5 py-3">Registered Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      Querying real database records...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      0 users found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                            {u.fullName?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{u.fullName}</span>
                            <span className="text-[11px] text-slate-400">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">{getRoleBadge(u)}</td>

                      <td className="px-5 py-3.5">
                        {u.companyId?.name ? (
                          <span className="font-semibold text-slate-700">{u.companyId.name}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Platform Wide</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleStatusToggle(u)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            u.status === "active" || (u.status === undefined && u.isActive !== false)
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {u.status === "active" || (u.status === undefined && u.isActive !== false) ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleStatusToggle(u)}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          Toggle Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
