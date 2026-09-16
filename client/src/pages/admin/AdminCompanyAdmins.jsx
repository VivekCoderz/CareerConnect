import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getCompanyAdmins,
  inviteCompanyAdmin,
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
  Copy,
  Check,
  Clock,
  Send,
  AlertCircle,
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
    phone: "",
    companyId: "",
    password: "", // Only used for manual reset in edit mode
  });

  // Success Invitation Result Modal
  const [invitationResult, setInvitationResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
        setShowModal(false);
        setEditAdmin(null);
        fetchData();
      } else {
        const res = await inviteCompanyAdmin({
          fullName: formData.fullName,
          officialEmail: formData.email,
          phone: formData.phone,
          companyId: formData.companyId,
        });

        if (res?.success) {
          setShowModal(false);
          const fullLink = `${window.location.origin}${res.activationLink}`;
          setInvitationResult({
            admin: res.admin,
            activationLink: fullLink,
          });
          setFormData({ fullName: "", email: "", phone: "", password: "", companyId: "" });
          fetchData();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process Company Admin request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
              SUPER_ADMIN Level: Invite and assign Company Administrators strictly isolated to their companyId.
            </p>
          </div>

          <button
            onClick={() => {
              setEditAdmin(null);
              setFormData({
                fullName: "",
                email: "",
                phone: "",
                password: "",
                companyId: companies[0]?._id || "",
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Invite Company Admin</span>
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
                      No Company Administrators found. Click "Invite Company Admin" above to send an onboarding invitation.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {admin.fullName ? admin.fullName.charAt(0).toUpperCase() : "A"}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{admin.fullName}</span>
                            <span className="text-[11px] text-slate-400">{admin.email}</span>
                            {admin.phone && <span className="text-[10px] text-slate-400 block">{admin.phone}</span>}
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
                        {admin.status === "invited" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Invited (Pending)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStatusToggle(admin)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              admin.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            {admin.status === "active" ? "Active" : "Inactive"}
                          </button>
                        )}
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
                              phone: admin.phone || "",
                              password: "",
                              companyId: admin.companyId?._id || admin.companyId || "",
                            });
                            setShowModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
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

        {/* Invite / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    {editAdmin ? "Edit Company Admin" : "Invite Company Administrator"}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  ✕
                </button>
              </div>

              {!editAdmin && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-start gap-2 text-xs text-indigo-800">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    A secure, time-limited activation token will be generated. The invited admin will establish their own password via the activation link.
                  </p>
                </div>
              )}

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555-0199"
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
                    <option value="">Select a company tenant...</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.status ? `(${c.status})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {editAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reset Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? (
                      "Processing..."
                    ) : editAdmin ? (
                      "Update Admin"
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invitation Success Dialog */}
        {invitationResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Admin Invitation Generated!</h3>
                  <p className="text-xs text-slate-500">
                    Account created for <strong>{invitationResult.admin?.fullName}</strong> ({invitationResult.admin?.email})
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Activation Link (Single-use, expires in 7 days):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={invitationResult.activationLink}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800 select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopyLink(invitationResult.activationLink)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Share this link with the designated administrator. Upon opening, they will create their password and activate their COMPANY_ADMIN workspace.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setInvitationResult(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCompanyAdmins;
