import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAdminCompanies,
  createAdminCompany,
  updateAdminCompanyStatus,
  updateAdminCompany,
  deleteAdminCompany,
} from "../../services/adminService";
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Users,
  Briefcase,
  Layers,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

const AdminCompanies = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

  if (!isSuperAdmin) {
    return <Navigate to="/admin/company" replace />;
  }
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const initialForm = {
    name: "",
    industry: "Information Technology",
    email: "",
    phone: "",
    website: "",
    location: "",
    description: "",
    status: "active",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await getAdminCompanies({ search, status: statusFilter, page, limit: 12 });
      if (res?.success) {
        setCompanies(res.companies || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter, page]);

  const validate = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = "Company name is required";
    }

    if (!editCompany) {
      const emailToUse = (formData.adminEmail || formData.email || "").trim();
      if (!emailToUse) {
        errors.adminEmail = "Admin login email or Official email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
        errors.adminEmail = "Please enter a valid email address";
      }

      if (!formData.adminPassword || !formData.adminPassword.trim()) {
        errors.adminPassword = "Password is required for Company Admin login";
      } else if (formData.adminPassword.trim().length < 6) {
        errors.adminPassword = "Password must be at least 6 characters long";
      }
    }

    return errors;
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      setSubmitting(true);
      if (editCompany) {
        await updateAdminCompany(editCompany._id, formData);
      } else {
        const res = await createAdminCompany(formData);
        if (res?.admin) {
          alert(`Company and Company Admin (${res.admin.email}) provisioned successfully!`);
        }
      }
      setShowCreateModal(false);
      setEditCompany(null);
      setFormData(initialForm);
      setFormErrors({});
      setShowAdminPassword(false);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (company) => {
    const newStatus = company.status === "active" ? "inactive" : "active";
    try {
      await updateAdminCompanyStatus(company._id, newStatus);
      setCompanies((prev) =>
        prev.map((c) => (c._id === company._id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm("Are you sure you want to remove this company?")) return;
    try {
      await deleteAdminCompany(companyId);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete company");
    }
  };

  return (
    <AdminLayout onRefresh={fetchCompanies} isRefreshing={loading}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Management</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalCount} Real Tenants
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SUPER_ADMIN Level: Manage client companies, active tenants, and company isolation limits.
            </p>
          </div>

          <button
            onClick={() => {
              setEditCompany(null);
              setFormData(initialForm);
              setFormErrors({});
              setShowAdminPassword(false);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Company</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, industry, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

        {/* Companies Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Querying live MongoDB company records...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Companies Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No registered companies match your query. Click "Onboard New Company" to create your first tenant.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div
                key={c._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 leading-tight">{c.name}</h2>
                        <span className="text-[11px] text-slate-500">{c.industry || "General"}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStatusToggle(c)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                        c.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      }`}
                    >
                      {c.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                    {c.description || "No company description provided yet."}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center mb-4">
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{c.adminCount || 0}</span>
                      <span className="text-[10px] text-slate-400">Admins</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{c.opportunitiesCount || 0}</span>
                      <span className="text-[10px] text-slate-400">Opportunities</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{c.applicationsCount || 0}</span>
                      <span className="text-[10px] text-slate-400">Applications</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400">
                    Created {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditCompany(c);
                        setFormData({
                          ...initialForm,
                          name: c.name,
                          industry: c.industry || "",
                          email: c.email || "",
                          phone: c.phone || "",
                          website: c.website || "",
                          location: c.location || "",
                          description: c.description || "",
                          status: c.status || "active",
                        });
                        setFormErrors({});
                        setShowAdminPassword(false);
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Company"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Company"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  {editCompany ? "Edit Company Tenant" : "Onboard New Company Tenant"}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdate} autoComplete="off" noValidate className="space-y-3">
                {/* Browser autofill decoy inputs */}
                <input
                  type="text"
                  name="fake_prevent_autofill_username"
                  style={{ position: "absolute", top: "-9999px", left: "-9999px" }}
                  tabIndex="-1"
                  readOnly
                  autoComplete="off"
                />
                <input
                  type="password"
                  name="fake_prevent_autofill_password"
                  style={{ position: "absolute", top: "-9999px", left: "-9999px" }}
                  tabIndex="-1"
                  readOnly
                  autoComplete="new-password"
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    name="company_tenant_legal_name"
                    autoComplete="off"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Acme Corporation"
                    className={`w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 outline-none transition ${
                      formErrors.name
                        ? "border-rose-400 focus:ring-rose-500/20 text-rose-900 bg-rose-50/20"
                        : "border-slate-200 focus:ring-indigo-500/20"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      name="company_industry_category"
                      autoComplete="off"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. Information Technology"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      name="company_hq_location"
                      autoComplete="off"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Bangalore, India"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      name="company_official_contact_email"
                      autoComplete="off"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (formErrors.adminEmail) setFormErrors((prev) => ({ ...prev, adminEmail: "" }));
                      }}
                      placeholder="contact@acme.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      name="company_official_web_address"
                      autoComplete="off"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://acme.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows="2"
                    name="company_summary_details"
                    autoComplete="off"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the company..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  />
                </div>

                {/* Primary Company Admin Credentials (When creating a company) */}
                {!editCompany && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Company Admin Login Credentials</span>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        Required for Admin Login
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80 leading-snug">
                      Yahan naya password set karein. Company Admin apne is email aur password se seedha <strong>/admin/login</strong> par login karega.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Admin Full Name</label>
                        <input
                          type="text"
                          name="company_admin_display_name"
                          autoComplete="off"
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          placeholder={formData.name ? `${formData.name} Admin` : "Admin Full Name"}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Admin Login Email *</label>
                        <input
                          type="email"
                          name="company_admin_login_identity"
                          autoComplete="off"
                          value={formData.adminEmail}
                          onChange={(e) => {
                            setFormData({ ...formData, adminEmail: e.target.value });
                            if (formErrors.adminEmail) setFormErrors((prev) => ({ ...prev, adminEmail: "" }));
                          }}
                          placeholder={formData.email || "admin@company.com"}
                          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:ring-2 outline-none transition ${
                            formErrors.adminEmail
                              ? "border-rose-400 focus:ring-rose-500/20 text-rose-900 bg-rose-50/20"
                              : "border-slate-200 focus:ring-indigo-500/20"
                          }`}
                        />
                        {formErrors.adminEmail ? (
                          <p className="text-[11px] text-rose-600 font-medium mt-0.5">{formErrors.adminEmail}</p>
                        ) : (
                          <span className="text-[10px] text-slate-400">Defaults to Official Email if left empty</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Admin Login Password * <span className="text-rose-500 font-bold">(Required)</span>
                        </label>
                        {formData.adminPassword && (
                          <span
                            className={`text-[10px] font-bold ${
                              formData.adminPassword.length >= 6 ? "text-emerald-600" : "text-rose-500"
                            }`}
                          >
                            {formData.adminPassword.length >= 6
                              ? "✓ Valid length (minimum 6 characters met)"
                              : `${formData.adminPassword.length}/6 characters`}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showAdminPassword ? "text" : "password"}
                          name="company_admin_passkey_fresh"
                          id="company_admin_passkey_fresh"
                          autoComplete="new-password"
                          value={formData.adminPassword}
                          onChange={(e) => {
                            setFormData({ ...formData, adminPassword: e.target.value });
                            if (formErrors.adminPassword) setFormErrors((prev) => ({ ...prev, adminPassword: "" }));
                          }}
                          placeholder="Enter password (minimum 6 characters)"
                          className={`w-full pl-2.5 pr-8 py-1.5 text-xs bg-white border rounded-lg focus:ring-2 outline-none transition ${
                            formErrors.adminPassword
                              ? "border-rose-400 focus:ring-rose-500/20 text-rose-900 bg-rose-50/20"
                              : "border-slate-200 focus:ring-indigo-500/20"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          tabIndex="-1"
                        >
                          {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {formErrors.adminPassword ? (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.adminPassword}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Minimum 6 characters. Company Admin will use this password to log in.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editCompany ? "Update Company" : "Create Company & Admin"}
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

export default AdminCompanies;
