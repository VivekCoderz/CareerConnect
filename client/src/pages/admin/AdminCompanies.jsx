import JourneyLoader from "../../components/common/JourneyLoader";
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
  getOrganizationRequests,
  reviewOrganizationRequest,
  approveOrganizationRequest,
  rejectOrganizationRequest,
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
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  Copy,
  Check,
  UserCheck,
  Filter,
} from "lucide-react";

const AdminCompanies = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

  if (!isSuperAdmin) {
    return <Navigate to="/admin/company" replace />;
  }

  // Active Tab: "companies" | "requests"
  const [activeTab, setActiveTab] = useState("companies");

  // Companies State
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Organization Requests State
  const [orgRequests, setOrgRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState("PENDING");
  const [reqPage, setReqPage] = useState(1);
  const [reqTotalPages, setReqTotalPages] = useState(1);
  const [reqTotalCount, setReqTotalCount] = useState(0);
  const [pendingReqCount, setPendingReqCount] = useState(0);

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Review & Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [approvalResult, setApprovalResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Fetch Companies
  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const res = await getAdminCompanies({ search, status: statusFilter, page, limit: 12 });
      if (res?.success) {
        setCompanies(res.companies || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch Organization Requests
  const fetchOrgRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await getOrganizationRequests({
        search: reqSearch,
        status: reqStatusFilter,
        page: reqPage,
        limit: 10,
      });
      if (res?.success) {
        setOrgRequests(res.requests || []);
        setReqTotalPages(res.totalPages || 1);
        setReqTotalCount(res.total || 0);
      }
      // Also get total pending count
      const pendingRes = await getOrganizationRequests({ status: "PENDING", limit: 1 });
      if (pendingRes?.success) {
        setPendingReqCount(pendingRes.total || 0);
      }
    } catch (err) {
      console.error("Failed to load organization requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchOrgRequests();
  }, [reqSearch, reqStatusFilter, reqPage]);

  // Handle Review Actions
  const handleOpenReview = (reqDoc) => {
    setSelectedRequest(reqDoc);
    setRejectionReason("");
    setActionError(null);
    setApprovalResult(null);
    setShowReviewModal(true);
  };

  const handleMarkReview = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await reviewOrganizationRequest(selectedRequest._id);
      fetchOrgRequests();
      setShowReviewModal(false);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to mark as Under Review.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await approveOrganizationRequest(selectedRequest._id);
      if (res?.success) {
        setApprovalResult(res);
        fetchOrgRequests();
        fetchCompanies();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to approve organization request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      setActionError("Please provide a valid rejection reason.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await rejectOrganizationRequest(selectedRequest._id, rejectionReason.trim());
      setShowRejectModal(false);
      setShowReviewModal(false);
      fetchOrgRequests();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to reject organization request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyActivationLink = (link) => {
    const fullUrl = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStatusToggle = async (c) => {
    const newStatus = c.status === "active" ? "inactive" : "active";
    try {
      await updateAdminCompanyStatus(c._id, newStatus);
      setCompanies((prev) =>
        prev.map((item) => (item._id === c._id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate/remove this company tenant?")) return;
    try {
      await deleteAdminCompany(id);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete company");
    }
  };

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
        await createAdminCompany(formData);
      }
      setShowCreateModal(false);
      setEditCompany(null);
      setFormData(initialForm);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Companies & Organizations</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              SUPER_ADMIN Center: Review organization onboarding requests, manage active corporate tenants, and company permissions.
            </p>
          </div>

          {activeTab === "companies" && (
            <button
              onClick={() => {
                setEditCompany(null);
                setFormData(initialForm);
                setFormErrors({});
                setShowAdminPassword(false);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Company</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "companies"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Registered Companies ({totalCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "requests"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Organization Requests</span>
            {pendingReqCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                {pendingReqCount}
              </span>
            )}
          </button>
        </div>

        {/* =========================================================
            TAB 1: REGISTERED COMPANIES VIEW
        ========================================================= */}
        {activeTab === "companies" && (
          <div className="space-y-4">
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
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Companies Grid */}
            {loadingCompanies ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Querying live MongoDB company records...</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Companies Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No registered companies match your query. Click "Onboard New Company" or approve incoming requests.
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
                            <span className="text-[11px] text-slate-500">{c.industry || c.companyType || "General"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStatusToggle(c)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : c.status === "suspended"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {c.status ? c.status.toUpperCase() : "ACTIVE"}
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
          </div>
        )}

        {/* =========================================================
            TAB 2: ORGANIZATION REQUESTS VIEW
        ========================================================= */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder="Search requests by org name, email, contact..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={reqStatusFilter}
                  onChange={(e) => setReqStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Requests</option>
                  <option value="PENDING">Pending Review Only</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Requests Table / Cards */}
            {loadingRequests ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Retrieving organization requests from MongoDB...</p>
              </div>
            ) : orgRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Organization Requests Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are currently no organization requests matching your filter criteria.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Organization</th>
                        <th className="py-3.5 px-4">Contact Person</th>
                        <th className="py-3.5 px-4">Official Email</th>
                        <th className="py-3.5 px-4">Website</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Requested Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {orgRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{req.organizationName}</div>
                            <span className="text-[10px] text-slate-400">{req.industry || req.organizationType || "Organization"}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{req.requestingEmployeeName || req.contactPerson}</div>
                            <span className="text-[10px] text-slate-400">{req.employeeDesignation || req.designation}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {req.officialEmail}
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={req.website?.startsWith("http") ? req.website : `https://${req.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{req.website?.replace(/^https?:\/\//, "")}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                req.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : req.status === "UNDER_REVIEW"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : req.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenReview(req)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            MODAL: REVIEW ORGANIZATION REQUEST
        ========================================================= */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Review Organization Request</h2>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Approval Success Banner */}
              {approvalResult ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Company Created & Activated Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Organization "{approvalResult.company?.name}" is now ACTIVE. The Company Admin invitation has been prepared.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1.5">
                    <div className="text-slate-500 font-medium">Activation Link:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${approvalResult.activationLink}`}
                        className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyActivationLink(approvalResult.activationLink)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Request Details Grid */}
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Company Details</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          selectedRequest.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedRequest.status === "UNDER_REVIEW"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : selectedRequest.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {selectedRequest.status}
                        </span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{selectedRequest.organizationName}</p>
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-medium">Industry:</span>
                          <span className="ml-1 font-semibold text-slate-700">{selectedRequest.industry || selectedRequest.organizationType || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Company Size:</span>
                          <span className="ml-1 font-semibold text-slate-700">{selectedRequest.companySize || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Company Email:</span>
                          <span className="ml-1 font-semibold text-slate-700">{selectedRequest.officialEmail}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Website:</span>
                          <a
                            href={selectedRequest.website?.startsWith("http") ? selectedRequest.website : `https://${selectedRequest.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 text-indigo-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                          >
                            <span>{selectedRequest.website?.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Requesting Employee Credentials */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                      <span className="text-indigo-900 font-bold text-[11px] uppercase tracking-wider">Requesting Employee</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Name</span>
                          <span className="font-semibold text-slate-800">{selectedRequest.requestingEmployeeName || selectedRequest.contactPerson}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Designation</span>
                          <span className="font-semibold text-slate-800">{selectedRequest.employeeDesignation || selectedRequest.designation}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Official Email</span>
                          <span className="font-semibold text-slate-800 truncate block">{selectedRequest.officialEmployeeEmail || selectedRequest.officialEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Document */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block mb-1.5">
                        Company Registration / Verification Document
                      </span>
                      {selectedRequest.verificationDocument ? (
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-slate-800 text-xs">Official Verification Document</span>
                          </div>
                          <a
                            href={selectedRequest.verificationDocument}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition shadow-2xs"
                          >
                            <span>View Document</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">No document provided.</p>
                      )}
                    </div>

                    {selectedRequest.rejectionReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                        <span className="font-bold">Rejection Reason:</span>
                        <p className="mt-0.5">{selectedRequest.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <div>
                      {selectedRequest.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={handleMarkReview}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                          Mark Under Review
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRequest.status !== "APPROVED" && selectedRequest.status !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                          className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                        >
                          Reject
                        </button>
                      )}

                      {selectedRequest.status !== "APPROVED" && (
                        <button
                          type="button"
                          onClick={handleApproveRequest}
                          disabled={actionLoading}
                          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? "Processing..." : "Approve & Create Company"}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: REJECT REASON
        ========================================================= */}
        {showRejectModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Reject Organization Request</span>
              </div>
              <p className="text-xs text-slate-600">
                Please provide a clear reason for rejecting this access request. This reason will be permanently archived in the audit record.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Official email domain could not be verified; company registration not found."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectRequest}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: CREATE / EDIT COMPANY (Direct)
        ========================================================= */}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. Information Technology"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Bangalore, India"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@acme.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://acme.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {!editCompany && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Primary Company Admin</span>
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="Admin Full Name (e.g. Rahul Sharma)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="Admin Login Email (e.g. admin@acme.com)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        placeholder="Admin Initial Password"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {submitting ? "Saving..." : editCompany ? "Update Company" : "Provision Company"}
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
