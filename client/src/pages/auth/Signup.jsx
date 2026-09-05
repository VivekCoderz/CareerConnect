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
import { getDashboardPath } from "../../utils/dashboardRedirect";
import { getCaptchaToken } from "../../utils/captcha";


const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("next");
  const [userType, setUserType] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);


  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    linkedin: "",
    github: "",
    college: "",
    course: "",
    year: "",
    graduationYear: "",
    highestQualification: "",
    passoutYear: "",
    skills: "",
    currentCompany: "",
    jobTitle: "",
    experienceYears: "",
    industry: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) dispatch(clearMessages());
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = "Full name is required";
    else if (formData.fullName.trim().length < 2) errors.fullName = "Name must be at least 2 characters";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Please enter a valid email";
    if (!formData.phone.trim()) errors.phone = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, "").slice(-10)))
      errors.phone = "Please enter a valid 10-digit mobile number";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
    if (!formData.confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors = {};
    if (userType === "student") {
      if (!formData.college.trim()) errors.college = "College name is required";
      if (!formData.course.trim()) errors.course = "Course is required";
      if (!formData.year) errors.year = "Please select current year";
      if (!formData.graduationYear) errors.graduationYear = "Graduation year is required";
    }
    if (userType === "fresher") {
      if (!formData.highestQualification.trim()) errors.highestQualification = "Qualification is required";
      if (!formData.passoutYear) errors.passoutYear = "Passout year is required";
    }
    if (userType === "professional") {
      if (!formData.currentCompany.trim()) errors.currentCompany = "Company name is required";
      if (!formData.jobTitle.trim()) errors.jobTitle = "Job title is required";
      if (!formData.experienceYears) errors.experienceYears = "Please select experience";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = (nextStep) => {
    setDirection("next");
    setStep(nextStep);
    setFieldErrors({});
  };

  const goBack = (prevStep) => {
    setDirection("prev");
    setStep(prevStep);
    setFieldErrors({});
    setOtpError("");
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;
    try {
      setCheckingEmail(true);
      setFieldErrors({});
      await api.post("/auth/send-otp", {
        email: formData.email.trim().toLowerCase(),
        fullName: formData.fullName.trim(),
      });
      setOtp("");
      setOtpError("");
      setResendCooldown(60);
      goNext("otp");
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP. Try again.";
      const field = err.response?.data?.field || "email";
      setFieldErrors({ [field]: msg });
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
        fullName: formData.fullName.trim(),
      });
      setOtpError("");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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

  const handleSelectType = (type) => {
    if (!emailVerified) return;
    setUserType(type);
    goNext(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailVerified) {
      dispatch(signupFailure("Please verify your email first"));
      return;
    }
    if (!validateStep3()) return;

    dispatch(signupStart());
    try {
      const captchaToken = await getCaptchaToken("signup");

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        linkedin: formData.linkedin.trim(),
        github: formData.github.trim(),
        userType,
        keepSignedIn,
        captchaToken,
      };


      if (userType === "student") {
        Object.assign(payload, {
          college: formData.college.trim(),
          course: formData.course.trim(),
          year: formData.year,
          graduationYear: formData.graduationYear,
        });
      } else if (userType === "fresher") {
        Object.assign(payload, {
          highestQualification: formData.highestQualification.trim(),
          passoutYear: formData.passoutYear,
          skills: formData.skills.trim(),
        });
      } else {
        Object.assign(payload, {
          currentCompany: formData.currentCompany.trim(),
          jobTitle: formData.jobTitle.trim(),
          experienceYears: formData.experienceYears,
          industry: formData.industry.trim(),
        });
      }

      const res = await api.post("/auth/register", payload);
      dispatch(signupSuccess({ user: res.data.user, token: res.data.token }));
      navigate(getDashboardPath(res.data.user?.userType || userType), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      dispatch(signupFailure(message));
      if (err.response?.data?.field) {
        setFieldErrors({ [err.response.data.field]: err.response.data.message });
      }
    }
  };

  const slideClass = direction === "next" ? "animate-slide-in-right" : "animate-slide-in-left";
  const progressStep = step === "otp" ? 1.5 : step;

  const inputClass = (field) =>
    `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/10"
    }`;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* LEFT PANEL - Step 1 only */}
      {step === 1 && (
        <div className="hidden lg:flex w-[42%] bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm">
                GU
              </div>
              <div>
                <p className="text-[15px] font-bold tracking-tight">GEETA UNIVERSITY</p>
                <p className="text-[11px] text-[#fbbf24] font-semibold">CareerConnect</p>
              </div>
            </Link>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-blue-100 mb-5">
              Candidate Registration
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
              Start your career
              <br />
              <span className="text-[#fbbf24]">journey today</span>
            </h2>
            <p className="text-blue-100/90 text-[15px] leading-relaxed max-w-sm">
              Join Geeta University’s official platform for internships, jobs and career growth.
            </p>
          </div>

          <div className="relative z-10 text-sm text-blue-200/80">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      )}

      {/* RIGHT / FULL */}
      <div className={`flex-1 flex items-center justify-center p-5 sm:p-8 ${step === 1 ? "" : "w-full"}`}>
        <div className={`w-full ${step === 1 || step === "otp" ? "max-w-md" : "max-w-2xl"}`}>
          {/* Mobile logo */}
          {(step === 1 || step === "otp") && (
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
                GU
              </div>
              <div>
                <p className="text-sm font-bold text-[#1e3a8a]">GEETA UNIVERSITY</p>
                <p className="text-[10px] text-[#f59e0b] font-semibold">CareerConnect</p>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 mb-9 max-w-md mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    progressStep >= s
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 flex-1 rounded transition-all ${
                      progressStep > s ? "bg-[#1e3a8a]" : "bg-slate-200"
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
                  Create your account
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Candidate registration · Geeta University
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" className={inputClass("fullName")} />
                  {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className={inputClass("email")} />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Mobile</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass("phone")} />
                  {fieldErrors.phone && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputClass("password")} />
                    {fieldErrors.password && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Confirm</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputClass("confirmPassword")} />
                    {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  onClick={handleStep1Next}
                  disabled={checkingEmail}
                  className="w-full h-11 mt-1 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
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
                Are you an employer?{" "}
                <Link to="/register/employer" className="font-semibold text-[#f59e0b] hover:text-[#d97706]">
                  Employer Sign-up
                </Link>
              </p>
              <p className="lg:hidden text-center text-sm text-slate-500 mt-3">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[#1e3a8a]">Sign in</Link>
              </p>
            </div>
          )}

          {/* ========== OTP ========== */}
          {step === "otp" && (
            <div key="otp" className={slideClass}>
              <button onClick={() => goBack(1)} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back
              </button>

              <div className="mb-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] text-[#1e3a8a] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verify your email</h2>
                <p className="text-sm text-slate-500 mt-2">
                  We sent a 6-digit code to<br />
                  <span className="font-semibold text-slate-800">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 text-center">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setOtpError("");
                    }}
                    placeholder="000000"
                    className="w-full h-14 rounded-xl border border-slate-200 bg-white text-center text-2xl tracking-[0.4em] font-bold outline-none focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10 transition"
                  />
                  {otpError && <p className="text-xs text-red-500 mt-2 text-center">{otpError}</p>}
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={verifyingOtp || otp.length !== 6}
                  className="w-full h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
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

                <p className="text-center text-sm text-slate-500">
                  Didn’t receive the code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400">Resend in {resendCooldown}s</span>
                  ) : (
                    <button type="button" onClick={handleResendOTP} disabled={checkingEmail} className="font-semibold text-[#1e3a8a] hover:text-[#1e40af]">
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ========== STEP 2: User Type ========== */}
          {step === 2 && emailVerified && (
            <div key="step2" className={slideClass}>
              <button onClick={() => goBack("otp")} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back
              </button>

              <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  What best describes you?
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Select the option that matches your current stage
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "student", title: "Student", desc: "Currently studying and looking for internships or early opportunities.", accent: "blue" },
                  { id: "fresher", title: "Fresher", desc: "Recently graduated and ready to start your professional career.", accent: "amber" },
                  { id: "professional", title: "Working Professional", desc: "Already working and looking for better roles or growth.", accent: "slate" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectType(item.id)}
                    className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff]/50 transition text-left"
                  >
                    <div className="w-12 h-12 mb-4 rounded-xl bg-[#eff6ff] text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white flex items-center justify-center transition">
                      {item.id === "student" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 14l9-5-9-5-9 5 9 5z" />
                        </svg>
                      )}
                      {item.id === "fresher" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                      {item.id === "professional" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-[#1e3a8a] mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========== STEP 3 ========== */}
          {step === 3 && emailVerified && (
            <div key="step3" className={`${slideClass} max-w-md mx-auto`}>
              <button onClick={() => goBack(2)} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {userType === "student" && "Your education details"}
                  {userType === "fresher" && "Your background"}
                  {userType === "professional" && "Your work experience"}
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">Almost done — just a few more details</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {userType === "student" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">College / University</label>
                      <input name="college" value={formData.college} onChange={handleChange} placeholder="Geeta University" className={inputClass("college")} />
                      {fieldErrors.college && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.college}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Course</label>
                      <input name="course" value={formData.course} onChange={handleChange} placeholder="B.Tech Computer Science" className={inputClass("course")} />
                      {fieldErrors.course && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.course}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Current Year</label>
                        <select name="year" value={formData.year} onChange={handleChange} className={inputClass("year") + " bg-white"}>
                          <option value="">Select</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                        {fieldErrors.year && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.year}</p>}
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Graduation Year</label>
                        <input type="number" name="graduationYear" value={formData.graduationYear} onChange={handleChange} placeholder="2027" className={inputClass("graduationYear")} />
                        {fieldErrors.graduationYear && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.graduationYear}</p>}
                      </div>
                    </div>
                  </>
                )}

                {userType === "fresher" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Highest Qualification</label>
                      <input name="highestQualification" value={formData.highestQualification} onChange={handleChange} placeholder="B.Tech / BCA / MCA" className={inputClass("highestQualification")} />
                      {fieldErrors.highestQualification && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.highestQualification}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Passout Year</label>
                      <input type="number" name="passoutYear" value={formData.passoutYear} onChange={handleChange} placeholder="2024" className={inputClass("passoutYear")} />
                      {fieldErrors.passoutYear && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.passoutYear}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Key Skills</label>
                      <input name="skills" value={formData.skills} onChange={handleChange} placeholder="React, Node.js, Python..." className={inputClass("skills")} />
                    </div>
                  </>
                )}

                {userType === "professional" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Current Company</label>
                      <input name="currentCompany" value={formData.currentCompany} onChange={handleChange} placeholder="Company name" className={inputClass("currentCompany")} />
                      {fieldErrors.currentCompany && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.currentCompany}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Job Title</label>
                      <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="Software Engineer" className={inputClass("jobTitle")} />
                      {fieldErrors.jobTitle && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.jobTitle}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Experience</label>
                        <select name="experienceYears" value={formData.experienceYears} onChange={handleChange} className={inputClass("experienceYears") + " bg-white"}>
                          <option value="">Select</option>
                          <option value="0-1">0-1 years</option>
                          <option value="1-3">1-3 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="5+">5+ years</option>
                        </select>
                        {fieldErrors.experienceYears && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.experienceYears}</p>}
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Industry</label>
                        <input name="industry" value={formData.industry} onChange={handleChange} placeholder="IT / Finance" className={inputClass("industry")} />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">LinkedIn</label>
                    <input name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="linkedin.com/in/..." className={inputClass("linkedin")} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">GitHub</label>
                    <input name="github" value={formData.github} onChange={handleChange} placeholder="github.com/username" className={inputClass("github")} />
                  </div>
                </div>
                {/* Keep Me Signed In */}
                <label className="flex items-center gap-3 cursor-pointer select-none py-0.5">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#1e3a8a] cursor-pointer"
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
                  className="w-full h-11 mt-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
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

export default Signup;