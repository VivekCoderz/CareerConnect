import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import {
  signupStart,
  signupSuccess,
  signupFailure,
  clearMessages,
  loginSuccess,
} from "../../redux/features/authSlice";
import api from "../../api/api";
import { getCaptchaToken } from "../../utils/captcha";


const EmployerRegister = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  // step: 1 = basic, "otp" = verify, 2 = company details
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("next");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");


  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
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
    else if (!emailVerified)
      errors.email = "Please verify your official email before continuing";
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

  // Send OTP inline under official email input field
  const handleSendEmailOTP = async () => {
    const emailToVerify = formData.email.trim().toLowerCase();
    if (!emailToVerify) {
      setFieldErrors((prev) => ({ ...prev, email: "Official email is required" }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToVerify)) {
      setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email" }));
      return;
    }

    try {
      setCheckingEmail(true);
      setFieldErrors((prev) => ({ ...prev, email: "" }));
      setOtpError("");
      setOtpSuccessMsg("");

      await api.post("/auth/send-otp", {
        email: emailToVerify,
        fullName: formData.companyName.trim() || "Employer",
      });

      setOtpSent(true);
      setOtp("");
      setOtpSuccessMsg(`OTP sent to ${emailToVerify}`);
      startCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP";
      const soft = err.response?.data?.field || "email";
      setFieldErrors((prev) => ({ ...prev, [soft]: msg }));
    } finally {
      setCheckingEmail(false);
    }
  };

  // Verify OTP inline
  const handleVerifyInlineOTP = async () => {
    const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);
    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }
    try {
      setVerifyingOtp(true);
      setOtpError("");
      await api.post("/auth/verify-otp", {
        email: formData.email.trim().toLowerCase(),
        otp: cleanOtp,
      });
      setEmailVerified(true);
      setOtpSent(false);
      setOtp("");
      setOtpSuccessMsg("Official email verified successfully!");
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleStep1Next = () => {
    if (!emailVerified) {
      const emailToVerify = formData.email.trim().toLowerCase();
      if (emailToVerify && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToVerify) && !otpSent) {
        handleSendEmailOTP();
      }
      setFieldErrors((prev) => ({
        ...prev,
        email: "Please verify your official email with OTP before continuing",
      }));
      return;
    }

    if (!validateStep1()) return;

    goNext(2);
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

  // ─── Google Employer Sign-Up ─────────────────────────────────────────────────
  const handleGoogleEmployerSignup = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    dispatch(clearMessages());

    try {
      const captchaToken = await getCaptchaToken("google_employer_signup");

      // Firebase Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send to backend with role=employer so new users get employer role
      const response = await api.post("/auth/google-auth", {
        idToken,
        keepSignedIn: false,
        captchaToken,
        role: "employer",
      });

      const { user, requiresPasswordSetup, token } = response.data;
      dispatch(loginSuccess({ user, token }));

      if (requiresPasswordSetup) {
        // New employer Google user → set password → collect company details
        navigate("/set-password", { replace: true });
      } else if (!user.phone?.trim()) {
        // Has password, but hasn't completed company details!
        navigate("/onboarding/employer", { replace: true });
      } else {
        // Existing employer who already has completed company details → go to dashboard
        navigate("/employer/dashboard", { replace: true });
      }
    } catch (err) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        // User dismissed popup — silent
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setGoogleError(
          "This email is already registered with a different sign-in method. Please use email + password."
        );
      } else {
        setGoogleError(
          err.response?.data?.message || "Google sign-up failed. Please try again."
        );
      }
    } finally {
      setGoogleLoading(false);
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
      const captchaToken = await getCaptchaToken("employer_signup");

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
        keepSignedIn,
        captchaToken,
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

  const progressStep = step;

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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13px] font-semibold text-slate-700">
                      Official email
                    </label>
                    {emailVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => {
                        handleChange(e);
                        if (emailVerified) setEmailVerified(false);
                        if (otpSent) setOtpSent(false);
                      }}
                      disabled={emailVerified}
                      placeholder="hr@company.com"
                      className={`${inputClass("email")} ${emailVerified ? "bg-slate-50 border-emerald-400 text-slate-700 pr-10" : ""}`}
                    />
                    {emailVerified && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-emerald-600 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Verify button directly below Email input */}
                  {!emailVerified && !otpSent && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">Verify email with OTP</span>
                      <button
                        type="button"
                        onClick={handleSendEmailOTP}
                        disabled={checkingEmail || !formData.email.trim()}
                        className="h-8 px-4 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                      >
                        {checkingEmail ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verify Email
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Inline OTP Input Box directly below Email */}
                  {otpSent && !emailVerified && (
                    <div className="mt-2.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Enter OTP sent to email
                        </span>
                        {resendCooldown > 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Resend in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendEmailOTP}
                            disabled={checkingEmail}
                            className="text-[11px] font-bold text-[#b45309] hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
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
                          className="flex-1 h-10 px-3 text-center tracking-[0.25em] font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15 transition"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyInlineOTP}
                          disabled={verifyingOtp || otp.length !== 6}
                          className="h-10 px-4 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                        >
                          {verifyingOtp ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Submit OTP"
                          )}
                        </button>
                      </div>

                      {otpError && <p className="text-xs text-red-600 font-medium">{otpError}</p>}
                      {otpSuccessMsg && !otpError && (
                        <p className="text-xs text-emerald-600 font-medium">{otpSuccessMsg}</p>
                      )}
                    </div>
                  )}

                  {/* Verified State */}
                  {emailVerified && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Official email verified successfully
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailVerified(false);
                          setOtpSent(false);
                          setOtp("");
                          setOtpSuccessMsg("");
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                      >
                        Change
                      </button>
                    </div>
                  )}

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
                  disabled={checkingEmail || googleLoading}
                  className="w-full h-11 mt-1 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {checkingEmail ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </>
                  ) : emailVerified ? (
                    "Continue to Next Step →"
                  ) : (
                    "Continue →"
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  {emailVerified ? "✓ Official email verified. Click continue to proceed." : "🔒 Verify your email with the OTP button above before continuing"}
                </p>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Google error */}
                {googleError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {googleError}
                  </div>
                )}

                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleEmployerSignup}
                  disabled={checkingEmail || googleLoading}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold transition flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 shadow-sm"
                >
                  {googleLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      Connecting to Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Google sign-up will ask you to set a password & fill company details
                </p>
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

                {/* Keep Me Signed In */}
                <label className="flex items-center gap-3 cursor-pointer select-none py-0.5">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#f59e0b] cursor-pointer"
                  />
                  <span className="text-[13px] text-slate-600">
                    Keep me signed in
                    <span className="ml-1 text-slate-400 text-xs">
                      ({keepSignedIn ? "7 days" : "25 hours"})
                    </span>
                  </span>
                </label>

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