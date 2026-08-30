import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  signupStart,
  signupSuccess,
  signupFailure,
  clearMessages,
} from "../../redux/features/authSlice";
import api from "../../api/api";

const EmployerRegister = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  // step: 1 = basic, "otp" = verify, 2 = company details
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("next");

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    contactPerson: "",
    designation: "",
    website: "",
    companyType: "Private",
    industry: "Information Technology",
    location: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) dispatch(clearMessages());
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.companyName.trim()) errors.companyName = "Company name is required";
    if (!formData.email.trim()) errors.email = "Official email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Please enter a valid email";
    if (!formData.phone.trim()) errors.phone = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, "").slice(-10)))
      errors.phone = "Please enter a valid 10-digit mobile number";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6)
      errors.password = "Password must be at least 6 characters";
    if (!formData.confirmPassword) errors.confirmPassword = "Please confirm password";
    else if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.contactPerson.trim()) errors.contactPerson = "Contact person is required";
    if (!formData.designation.trim()) errors.designation = "Designation is required";
    if (!formData.companyType) errors.companyType = "Company type is required";
    if (!formData.industry.trim()) errors.industry = "Industry is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = (next) => {
    setDirection("next");
    setStep(next);
    setFieldErrors({});
  };

  const goBack = (prev) => {
    setDirection("prev");
    setStep(prev);
    setFieldErrors({});
    setOtpError("");
  };

  const startCooldown = (sec = 60) => {
    setResendCooldown(sec);
    const t = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) {
          clearInterval(t);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;
    try {
      setCheckingEmail(true);
      setFieldErrors({});
      await api.post("/auth/send-otp", {
        email: formData.email.trim().toLowerCase(),
        fullName: formData.companyName.trim(),
      });
      setOtp("");
      setOtpError("");
      startCooldown(60);
      goNext("otp");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP";
      const soft = err.response?.data?.field || "email";
      setFieldErrors({ [soft]: msg });
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      setCheckingEmail(true);
      await api.post("/auth/send-otp", {
        email: formData.email.trim().toLowerCase(),
        fullName: formData.companyName.trim(),
      });
      setOtpError("");
      startCooldown(60);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }
    try {
      setVerifyingOtp(true);
      setOtpError("");
      await api.post("/auth/verify-otp", {
        email: formData.email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      setEmailVerified(true);
      goNext(2);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailVerified) {
      dispatch(signupFailure("Please verify your email first"));
      return;
    }
    if (!validateStep2()) return;

    dispatch(signupStart());
    try {
      const payload = {
        companyName: formData.companyName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        contactPerson: formData.contactPerson.trim(),
        designation: formData.designation.trim(),
        website: formData.website.trim(),
        companyType: formData.companyType,
        industry: formData.industry.trim(),
        location: formData.location.trim(),
        role: "employer",
      };

      const res = await api.post("/auth/register-employer", payload);
      dispatch(signupSuccess({ user: res.data.user, token: res.data.token }));
      navigate("/employer/profile", { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";
      dispatch(signupFailure(message));
      if (err.response?.data?.field) {
        setFieldErrors({
          [err.response.data.field]: err.response.data.message,
        });
      }
    }
  };

  const slideClass =
    direction === "next" ? "animate-slide-in-right" : "animate-slide-in-left";

  const inputClass = (field) =>
    `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-[#f59e0b] focus:ring-[#f59e0b]/15"
    }`;

  const progressStep = step === "otp" ? 1.5 : step === 2 ? 2 : 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-[42%] bg-gradient-to-br from-[#92400e] via-[#b45309] to-[#78350f] text-white p-12 flex-col justify-between relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#fbbf24]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm">
              GU
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight">GEETA UNIVERSITY</p>
              <p className="text-[11px] text-[#fde68a] font-semibold">CareerConnect · Employers</p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-amber-100 mb-5">
            Employer Registration
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Hire talent from
            <br />
            <span className="text-[#fde68a]">Geeta University</span>
          </h2>
          <p className="text-amber-50/90 text-[15px] leading-relaxed max-w-sm">
            Post internships & jobs, review applications, and connect with verified candidates.
          </p>
        </div>

        <div className="relative z-10 text-sm text-amber-100/80">
          Already registered?{" "}
          <Link to="/login?type=employer" className="text-white font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile GU logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#b45309] text-white flex items-center justify-center font-bold text-xs">
              GU
            </div>
            <div>
              <p className="text-sm font-bold text-[#92400e]">GEETA UNIVERSITY</p>
              <p className="text-[10px] text-[#f59e0b] font-semibold">Employer Portal</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-9 max-w-md mx-auto">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    progressStep >= s
                      ? "bg-[#f59e0b] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className={`h-0.5 flex-1 rounded transition-all ${
                      progressStep > s ? "bg-[#f59e0b]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* ========== STEP 1 ========== */}
          {step === 1 && (
            <div key="step1" className={slideClass}>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Register your company
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Employer registration · Geeta University
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Company name
                  </label>
                  <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your company name"
                    className={inputClass("companyName")}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-xs text-red-500 mt-1.5">{fieldErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Official email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="hr@company.com"
                    className={inputClass("email")}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-500 mt-1.5">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className={inputClass("phone")}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-500 mt-1.5">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={inputClass("password")}
                    />
                    {fieldErrors.password && (
                      <p className="text-xs text-red-500 mt-1.5">{fieldErrors.password}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Confirm
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={inputClass("confirmPassword")}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1.5">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={checkingEmail}
                  className="w-full h-11 mt-1 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {checkingEmail ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>

              <p className="text-center text-sm text-slate-500 mt-7">
                Looking for internships/jobs?{" "}
                <Link to="/register/student" className="font-semibold text-[#1e3a8a] hover:text-[#1e40af]">
                  Candidate Sign-up
                </Link>
              </p>
              <p className="lg:hidden text-center text-sm text-slate-500 mt-3">
                Already registered?{" "}
                <Link to="/login?type=employer" className="font-semibold text-[#f59e0b]">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ========== OTP STEP ========== */}
          {step === "otp" && (
            <div key="otp" className={slideClass}>
              <button
                type="button"
                onClick={() => goBack(1)}
                className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="mb-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#fffbeb] text-[#b45309] flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Verify your email
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  We've sent a 6-digit code to <br />
                  <span className="font-semibold text-slate-800">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setOtpError("");
                    }}
                    placeholder="Enter 6-digit OTP"
                    className="w-full h-12 text-center text-lg font-bold tracking-[6px] rounded-xl border border-slate-200 bg-white outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
                  />
                  {otpError && <p className="text-xs text-red-500 mt-2 text-center">{otpError}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={verifyingOtp || otp.length !== 6}
                  className="w-full h-11 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {verifyingOtp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <div className="text-center text-xs text-slate-500 pt-2">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || checkingEmail}
                    className="font-bold text-[#b45309] hover:underline disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 2 ========== */}
          {step === 2 && (
            <div key="step2" className={slideClass}>
              <button
                type="button"
                onClick={() => goBack(1)}
                className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Contact & organization details
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Set up your hiring lead and headquarters
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Contact Person Name
                  </label>
                  <input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className={inputClass("contactPerson")}
                  />
                  {fieldErrors.contactPerson && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.contactPerson}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Designation
                  </label>
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g. HR Manager / Campus Recruiter"
                    className={inputClass("designation")}
                  />
                  {fieldErrors.designation && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.designation}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Company Type
                    </label>
                    <select
                      name="companyType"
                      value={formData.companyType}
                      onChange={handleChange}
                      className={inputClass("companyType")}
                    >
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                      <option value="Startup">Startup</option>
                      <option value="NGO">NGO</option>
                      <option value="Government">Government</option>
                      <option value="Educational Institution">Educational</option>
                      <option value="Other">Other</option>
                    </select>
                    {fieldErrors.companyType && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.companyType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Industry
                    </label>
                    <input
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="e.g. IT, FinTech"
                      className={inputClass("industry")}
                    />
                    {fieldErrors.industry && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.industry}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Headquarters / City
                  </label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Gurugram, Delhi NCR"
                    className={inputClass("location")}
                  />
                  {fieldErrors.location && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Website <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://company.com"
                    className={inputClass("website")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerRegister;
