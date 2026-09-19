import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  Globe,
  User,
  Briefcase,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { requestOrganizationAccess } from "../../services/adminService";

const OrganizationRequestPage = () => {
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationType: "Private",
    officialEmail: "",
    website: "",
    contactPerson: "",
    designation: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    reason: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const orgTypes = [
    "Private",
    "Public",
    "Startup",
    "Enterprise",
    "Government",
    "Non-Profit",
    "Educational Institution",
    "Other",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic frontend validations
    if (
      !formData.organizationName.trim() ||
      !formData.officialEmail.trim() ||
      !formData.website.trim() ||
      !formData.contactPerson.trim() ||
      !formData.designation.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.reason.trim()
    ) {
      setError("Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }

    try {
      setLoading(true);
      const res = await requestOrganizationAccess(formData);
      if (res?.success) {
        setSuccessData(res);
      } else {
        setError(res?.message || "Failed to submit request. Please try again.");
      }
    } catch (err) {
      console.error("Organization request error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to submit request. Please ensure you are not submitting duplicate organization details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-black text-sm shadow-xs">
              GU
            </div>
            <div className="leading-tight">
              <span className="text-sm font-black text-[#1e3a8a] tracking-tight">CareerConnect</span>
              <p className="text-[10px] font-bold text-[#f59e0b] tracking-wider uppercase">Organizations</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Back to Home
            </Link>
            <Link
              to="/admin/login"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb / Title */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#008bdc] text-[11px] font-bold uppercase tracking-wider mb-3">
              <Building2 className="w-3.5 h-3.5" />
              Corporate & Institution Access
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Request Organization Access
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Partner with CareerConnect to hire top verified talent, launch internships, and streamline your recruitment pipeline.
            </p>
          </div>

          {/* Success State View */}
          {successData ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Request Submitted Successfully!</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                Thank you for your interest in CareerConnect. Your organization access request has been placed in our review queue.
              </p>
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Organization:</span>
                  <span className="font-semibold text-slate-800">{formData.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Official Email:</span>
                  <span className="font-semibold text-slate-800">{formData.officialEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Person:</span>
                  <span className="font-semibold text-slate-800">{formData.contactPerson}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Review Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    PENDING REVIEW
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-slate-400">
                Once reviewed and approved by Platform Administrators, a secure activation link will be sent to the official contact.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link
                  to="/"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* Request Form Card */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Unable to process request</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Organization Details */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#008bdc] mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    1. Organization Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Organization Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Technologies Private Limited"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Organization Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="organizationType"
                        value={formData.organizationType}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      >
                        {orgTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official Work Email <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          name="officialEmail"
                          value={formData.officialEmail}
                          onChange={handleChange}
                          placeholder="hr@acme.com or contact@acme.com"
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official Website URL <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder="https://acme.com"
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. Contact Person Information */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#008bdc] mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    2. Primary Contact & Representative
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contact Person Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Designation / Role <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleChange}
                          placeholder="e.g. Head of Talent Acquisition"
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 3. Address & Location */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#008bdc] mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    3. Location & Physical Headquarters
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Street Address / Campus <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. Cyber City, Sector 24, DLF Phase 3"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          City <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="e.g. Gurugram"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          State <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="e.g. Haryana"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          placeholder="India"
                          className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 4. Purpose & Narrative */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#008bdc] mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    4. Reason for Joining & Description
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Reason for using CareerConnect <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Hiring full-time software engineers and recruiting winter/summer engineering interns."
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Organization Description <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Brief overview of your company, products, culture, or core technology stack."
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-400">
                    By submitting this form, you confirm you are an authorized representative of the organization.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#008bdc] hover:bg-[#0074b7] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Request Access</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrganizationRequestPage;
