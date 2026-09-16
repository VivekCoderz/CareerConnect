import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getCompanyAdmins,
  createCompanyAdmin,
  updateCompanyAdmin,
  updateCompanyAdminStatus,
  getAdminCompanies,
} from "../../services/adminService";
import {
  ShieldCheck,
  Plus,
  Search,
  Building2,
  Mail,
  UserCheck,
  UserX,
  Edit2,
  KeyRound,
} from "lucide-react";

const AdminCompanyAdmins = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

  if (!isSuperAdmin) {
    return <Navigate to="/admin/company" replace />;
  }
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    companyId: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsRes, compRes] = await Promise.all([
        getCompanyAdmins({ search, companyId: companyFilter, page, limit: 15 }),
        getAdminCompanies({ limit: 100 }),
      ]);

      if (adminsRes?.success) {
        setAdmins(adminsRes.admins || []);
        setTotalCount(adminsRes.total || 0);
      }
      if (compRes?.success) {
        setCompanies(compRes.companies || []);
      }
    } catch (err) {
      console.error("Failed to load company admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, companyFilter, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editAdmin) {
        await updateCompanyAdmin(editAdmin._id, formData);
      } else {
        await createCompanyAdmin(formData);
      }
      setShowModal(false);
      setEditAdmin(null);
      setFormData({ fullName: "", email: "", password: "", companyId: "" });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save Company Admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (admin) => {
    const newStatus = admin.status === "active" ? "inactive" : "active";
    try {
      await updateCompanyAdminStatus(admin._id, newStatus);
      setAdmins((prev) =>
        prev.map((a) => (a._id === admin._id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  return (
    <AdminLayout onRefresh={fetchData} isRefreshing={loading}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Admins</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalCount} Delegated Admins
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SUPER_ADMIN Level: Create and assign Company Administrators strictly isolated to their companyId.
            </p>
          </div>

          <button
            onClick={() => {
              setEditAdmin(null);
              setFormData({ fullName: "", email: "", password: "", companyId: companies[0]?._id || "" });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Company Admin</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin name or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-5 py-3">Assigned Company</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      Loading Company Administrators...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No Company Administrators found. Click "Create Company Admin" above to provision one.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {admin.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{admin.fullName}</span>
                            <span className="text-[11px] text-slate-400">{admin.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {admin.companyId?.name || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          COMPANY_ADMIN
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleStatusToggle(admin)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            admin.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {admin.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setEditAdmin(admin);
                            setFormData({
                              fullName: admin.fullName,
                              email: admin.email,
                              password: "",
                              companyId: admin.companyId?._id || admin.companyId || "",
                            });
                            setShowModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          title="Edit Admin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  {editAdmin ? "Edit Company Admin" : "Create New Company Admin"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@company.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editAdmin ? "Reset Password (leave blank to keep current)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editAdmin}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Company Tenant *</label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white cursor-pointer"
                  >
                    <option value="">Select a company...</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editAdmin ? "Update Admin" : "Provision Admin"}
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

export default AdminCompanyAdmins;
