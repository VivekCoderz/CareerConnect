import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import api from "../../api/api";
import { updateUserProfile, logout } from "../../redux/features/authSlice";
import PhoneInput from "../../components/common/PhoneInput";

const inputCls = (err) =>
  `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
    err
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
      : "border-slate-200 focus:border-[#f59e0b] focus:ring-[#f59e0b]/10"
  }`;

/**
 * GoogleEmployerOnboarding — shown to first-time Google employer users after:
 *   1. Set Password (/set-password)
 *
 * Collects company details and creates EmployerProfile in MongoDB.
 * Then → /employer/dashboard
 */
const GoogleEmployerOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const handleCancelAndGoHome = async () => {
    setCancelling(true);
    try {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Sign out warning:", err.message);
      }
    } finally {
      dispatch(logout());
      localStorage.removeItem("careerconnect_token");
      localStorage.removeItem("careerconnect_user");
      setCancelling(false);
      navigate("/", { replace: true });
    }
  };

  const [formData, setFormData] = useState({
    countryCode: "+91",
    phone: "",
    companyName: "",
    contactPerson: user?.fullName || "",
    designation: "",
    website: "",
    companyType: "Private",
    industry: "Information Technology",
    location: "",
  });

  // Redirect guards
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.hasPassword === false) {
      navigate("/set-password", { replace: true });
      return;
    }
    // If already has phone → already onboarded
    if (user.phone?.trim()) {
      navigate("/employer/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Keep contactPerson synced if user loads after initial render
  useEffect(() => {
    if (user?.fullName && !formData.contactPerson) {
      setFormData((prev) => ({ ...prev, contactPerson: user.fullName }));
    }
  }, [user?.fullName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const errors = {};
    if (!formData.phone.trim()) {
      errors.phone = "Mobile number is required";
    } else {
      const digits = formData.phone.replace(/\D/g, "");
      if (formData.countryCode === "+91") {
        if (!/^[6-9]\d{9}$/.test(digits.slice(-10)) || digits.length < 10) {
          errors.phone = "Please enter a valid 10-digit mobile number";
        }
      } else if (digits.length < 6 || digits.length > 15) {
        errors.phone = "Please enter a valid mobile number (6-15 digits)";
      }
    }
    if (!formData.companyName.trim()) errors.companyName = "Company name is required";
    if (!formData.contactPerson.trim()) errors.contactPerson = "Contact person is required";
    if (!formData.designation.trim()) errors.designation = "Designation is required";
    if (!formData.industry.trim()) errors.industry = "Industry is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setSubmitError("");

    try {
      // Check duplicate phone
      try {
        const checkRes = await api.post("/auth/check-phone", {
          phone: formData.phone.trim(),
          countryCode: formData.countryCode || "+91",
        });
        if (checkRes.data?.exists) {
          setFieldErrors((prev) => ({
            ...prev,
            phone: "This mobile number is already registered with another account",
          }));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Phone check warning:", err.message);
      }

      const res = await api.post("/auth/complete-employer-google-onboarding", {
        countryCode: formData.countryCode || "+91",
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        designation: formData.designation.trim(),
        website: formData.website.trim(),
        companyType: formData.companyType,
        industry: formData.industry.trim(),
        location: formData.location.trim(),
      });

      if (res.data.user) {
        dispatch(updateUserProfile(res.data.user));
      }

      navigate("/employer/dashboard", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save. Please try again.";
      setSubmitError(msg);
      if (err.response?.data?.field) {
        setFieldErrors({ [err.response.data.field]: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[38%] bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#d97706] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-sm">
            GU
          </div>
          <p className="text-[15px] font-bold tracking-tight mt-2">GEETA UNIVERSITY</p>
          <p className="text-[11px] text-amber-200 font-semibold">CareerConnect — Employer</p>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-amber-100 mb-5">
            Almost done!
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Set up your
            <br />
            <span className="text-amber-200">company profile</span>
          </h2>
          <p className="text-amber-100/90 text-[15px] leading-relaxed max-w-sm">
            Tell us about your company so candidates can find and trust your postings.
          </p>

          <div className="mt-10 space-y-4 text-sm text-amber-100/70">
            {["Create company profile", "Post internships & jobs", "Review applications"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#f59e0b] text-white flex items-center justify-center font-bold text-xs">
              GU
            </div>
            <div>
              <p className="text-sm font-bold text-[#f59e0b]">GEETA UNIVERSITY</p>
              <p className="text-[10px] text-slate-500 font-semibold">CareerConnect — Employer</p>
            </div>
          </div>

          {/* Back to Home / Cancel Header */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancelAndGoHome}
              disabled={loading || cancelling}
              className="group inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1.5 px-3 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {cancelling ? "Cancelling..." : "Back to Home"}
            </button>
            <span className="text-xs text-slate-400 font-medium">Employer Setup</span>
          </div>

          {/* Google account info */}
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#f59e0b] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.fullName?.[0]?.toUpperCase() || "E"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company details
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              These details will appear on your employer profile.
            </p>
          </div>

          {submitError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                countryCode={formData.countryCode}
                onCountryCodeChange={(code) => setFormData((prev) => ({ ...prev, countryCode: code }))}
                phone={formData.phone}
                onPhoneChange={(val) => {
                  setFormData((prev) => ({ ...prev, phone: val }));
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                }}
                error={fieldErrors.phone}
                theme="amber"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Acme Pvt. Ltd."
                className={inputCls(fieldErrors.companyName)}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.companyName}</p>
              )}
            </div>

            {/* Contact Person + Designation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Recruiter name"
                  className={inputCls(fieldErrors.contactPerson)}
                />
                {fieldErrors.contactPerson && (
                  <p className="text-xs text-red-500 mt-1.5">{fieldErrors.contactPerson}</p>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="HR Manager"
                  className={inputCls(fieldErrors.designation)}
                />
                {fieldErrors.designation && (
                  <p className="text-xs text-red-500 mt-1.5">{fieldErrors.designation}</p>
                )}
              </div>
            </div>

            {/* Industry + Company Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Industry <span className="text-red-500">*</span>
                </label>
                <input
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="Information Technology"
                  className={inputCls(fieldErrors.industry)}
                />
                {fieldErrors.industry && (
                  <p className="text-xs text-red-500 mt-1.5">{fieldErrors.industry}</p>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Company Type
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  className={inputCls(false) + " bg-white"}
                >
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                  <option value="Startup">Startup</option>
                  <option value="MNC">MNC</option>
                  <option value="Government">Government</option>
                  <option value="NGO">NGO</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                City / Location <span className="text-red-500">*</span>
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Gurugram, Haryana"
                className={inputCls(fieldErrors.location)}
              />
              {fieldErrors.location && (
                <p className="text-xs text-red-500 mt-1.5">{fieldErrors.location}</p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Website{" "}
                <span className="text-slate-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourcompany.com"
                className={inputCls(false)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup & Go to Dashboard →"
              )}
            </button>

            {/* Cancel Option */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={handleCancelAndGoHome}
                disabled={loading || cancelling}
                className="text-xs text-slate-400 hover:text-red-500 transition underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Don't want to create an account? Cancel & Return to Home"}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            You can update your company profile anytime from the employer dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleEmployerOnboarding;
