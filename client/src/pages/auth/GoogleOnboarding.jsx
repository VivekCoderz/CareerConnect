import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/api";
import { updateUserProfile } from "../../redux/features/authSlice";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import { parseResumeAPI, confirmParsedProfileAPI } from "../../services/resumeService";
import ParsedResumeReviewModal from "../../components/resume-builder/ParsedResumeReviewModal";
import ResumeUploadInput from "../../components/common/ResumeUploadInput";
import PhoneInput from "../../components/common/PhoneInput";

// ─── Icons ────────────────────────────────────────────────────────────────────

const PhoneIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Input class helper ───────────────────────────────────────────────────────
const inputCls = (err) =>
  `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
    err
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
      : "border-slate-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/10"
  }`;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * GoogleOnboarding — shown to first-time Google users after:
 *   1. Set Password (/set-password)
 *   2. Select Role  (/select-role)
 *
 * Collects:
 *   - Step 1: Phone + LinkedIn/GitHub (required)
 *   - Step 2: Role-specific details   (required)
 *   - Step 3: Resume upload            (optional — can skip)
 *
 * On complete/skip → navigates to user's dashboard.
 */
const GoogleOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  // Resume state
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const isOnboardingActiveRef = useRef(true);

  const [formData, setFormData] = useState({
    countryCode: "+91",
    phone: "",
    linkedin: "",
    github: "",
    // Student
    college: "",
    course: "",
    year: "",
    graduationYear: "",
    // Fresher
    highestQualification: "",
    passoutYear: "",
    skills: "",
    // Professional
    currentCompany: "",
    jobTitle: "",
    experienceYears: "",
    industry: "",
  });

  const userType = user?.userType || "student";

  // Redirect guards — only redirect if user arrived already completed, NOT during active wizard
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isOnboardingActiveRef.current && user.phone?.trim()) {
      navigate(getDashboardPath(userType, user), { replace: true });
    }
  }, [user, navigate, userType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  // ─── Step 1 Validation ──────────────────────────────────────────────────────
  const validateStep1 = () => {
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Step 2 Validation ──────────────────────────────────────────────────────
  const validateStep2 = () => {
    const errors = {};
    if (userType === "student") {
      if (!formData.college.trim()) errors.college = "College name is required";
      if (!formData.course.trim()) errors.course = "Course is required";
      if (!formData.year) errors.year = "Please select current year";
      if (!formData.graduationYear) errors.graduationYear = "Graduation year is required";
    } else if (userType === "fresher") {
      if (!formData.highestQualification.trim())
        errors.highestQualification = "Qualification is required";
      if (!formData.passoutYear) errors.passoutYear = "Passout year is required";
    } else if (userType === "professional") {
      if (!formData.currentCompany.trim())
        errors.currentCompany = "Company name is required";
      if (!formData.jobTitle.trim()) errors.jobTitle = "Job title is required";
      if (!formData.experienceYears)
        errors.experienceYears = "Please select experience";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Step 1 → 2 ─────────────────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!validateStep1()) return;

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
        return;
      }
    } catch (err) {
      console.warn("Phone check warning:", err.message);
    }

    setStep(2);
    setFieldErrors({});
  };

  // ─── Step 2 → 3 (Submit profile data) ───────────────────────────────────────
  const handleStep2Next = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setSubmitError("");

    try {
      const payload = {
        countryCode: formData.countryCode || "+91",
        phone: formData.phone.trim(),
        linkedin: formData.linkedin.trim(),
        github: formData.github.trim(),
        userType,
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

      const res = await api.post("/auth/complete-google-onboarding", payload);
      if (res.data.user) {
        dispatch(updateUserProfile(res.data.user));
      }

      // Move to resume upload step
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save profile. Please try again.";
      setSubmitError(msg);
      if (err.response?.data?.field) {
        setFieldErrors({ [err.response.data.field]: msg });
        if (err.response.data.field === "phone") {
          setStep(1);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Resume Change & Finish ──────────────────────────────────────────────────
  const handleResumeChange = (url, meta) => {
    setResumeUrl(url);
    if (meta?.fileName) setResumeName(meta.fileName);
    setResumeUploaded(!!url);
    setSubmitError("");
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setResumeUploading(true);
    setSubmitError("");

    try {
      const res = await parseResumeAPI(resumeFile);
      if (res?.parsedData) {
        setParsedResult(res);
        setIsReviewOpen(true);
      } else {
        setSubmitError("Failed to parse resume details. You may continue to your dashboard.");
      }
    } catch (err) {
      console.error("[GoogleOnboarding] Resume parse failed:", err);
      setSubmitError(
        err.response?.data?.message || "Failed to parse resume. Please try again."
      );
    } finally {
      setResumeUploading(false);
    }
  };

  const handleConfirmParsedProfile = async ({ parsedData, resumeUrl, resumeName }) => {
    try {
      setIsSavingProfile(true);
      setSubmitError("");
      const res = await confirmParsedProfileAPI({ parsedData, resumeUrl, resumeName });
      if (res?.profile) {
        setResumeUploaded(true);
      }
      setIsReviewOpen(false);
      handleFinish();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to save verified profile details.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Finish Onboarding ───────────────────────────────────────────────────────
  const handleFinish = async () => {
    isOnboardingActiveRef.current = false;
    if (resumeUrl) {
      try {
        const finalName = resumeName || "Candidate_Resume.pdf";
        dispatch(
          updateUserProfile({
            resumeUrl,
            resumeName: finalName,
          })
        );
        if (userType === "student") {
          await api.put("/student/profile", {
            resume: { resumeUrl, resumeName: finalName, uploadedAt: new Date() },
          });
        } else if (userType === "fresher") {
          await api.put("/fresher/profile", {
            resume: { resumeUrl, resumeName: finalName, uploadedAt: new Date(), isGenerated: false },
          });
        } else if (userType === "professional") {
          await api.put("/professional/profile", {
            resume: { resumeUrl, resumeName: finalName, uploadedAt: new Date(), isGenerated: false },
          });
        }
      } catch (err) {
        console.error("[GoogleOnboarding] Failed to persist resume on finish:", err);
      }
    }
    navigate(getDashboardPath(userType, user), { replace: true });
  };

  if (!user) return null;

  const progressLabel = ["Contact Info", "Profile Details", "Resume Upload"];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[38%] bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm">
            GU
          </div>
          <p className="text-[15px] font-bold tracking-tight mt-2">GEETA UNIVERSITY</p>
          <p className="text-[11px] text-[#fbbf24] font-semibold">CareerConnect</p>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-blue-100 mb-5">
            Almost done!
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Complete your
            <br />
            <span className="text-[#fbbf24]">profile</span>
          </h2>
          <p className="text-blue-100/90 text-[15px] leading-relaxed max-w-sm">
            Just a few more details to get the best job & internship recommendations.
          </p>

          <div className="mt-8 space-y-3 text-sm text-blue-100/70">
            {progressLabel.map((label, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${
                    step > idx + 1
                      ? "bg-[#fbbf24] text-[#172554]"
                      : step === idx + 1
                      ? "bg-white text-[#1e3a8a]"
                      : "bg-white/20 text-white/60"
                  }`}
                >
                  {step > idx + 1 ? <CheckIcon /> : idx + 1}
                </div>
                <span className={step === idx + 1 ? "text-white font-semibold" : ""}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
              GU
            </div>
            <div>
              <p className="text-sm font-bold text-[#1e3a8a]">GEETA UNIVERSITY</p>
              <p className="text-[10px] text-[#f59e0b] font-semibold">CareerConnect</p>
            </div>
          </div>

          {/* Mobile progress */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s ? "bg-[#1e3a8a] text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step > s ? <CheckIcon /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 flex-1 rounded transition-all ${
                      step > s ? "bg-[#1e3a8a]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Google account info pill */}
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.fullName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}

          {/* ═══════════════ STEP 1: Contact Info ═══════════════ */}
          {step === 1 && (
            <div>
              <div className="mb-7">
                <p className="text-[13px] font-semibold text-[#1e3a8a] mb-1.5">Step 1 of 3</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Your contact details
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  We need your phone number to complete your profile.
                </p>
              </div>

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
                    theme="blue"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    LinkedIn <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourname"
                    className={inputCls(fieldErrors.linkedin)}
                  />
                </div>

                {/* GitHub */}
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    GitHub <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/username"
                    className={inputCls(fieldErrors.github)}
                  />
                </div>

                <button
                  onClick={handleStep1Next}
                  className="w-full h-11 mt-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2: Role-specific Details ═══════════════ */}
          {step === 2 && (
            <div>
              <button
                onClick={() => { setStep(1); setFieldErrors({}); setSubmitError(""); }}
                className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
              >
                ← Back
              </button>

              <div className="mb-6">
                <p className="text-[13px] font-semibold text-[#1e3a8a] mb-1.5">Step 2 of 3</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {userType === "student" && "Your education details"}
                  {userType === "fresher" && "Your background"}
                  {userType === "professional" && "Your work experience"}
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  These help us match you with the right opportunities.
                </p>
              </div>

              <div className="space-y-4">
                {/* Student fields */}
                {userType === "student" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        College / University <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="college"
                        value={formData.college}
                        onChange={handleChange}
                        placeholder="Geeta University"
                        className={inputCls(fieldErrors.college)}
                      />
                      {fieldErrors.college && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.college}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Course <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        placeholder="B.Tech Computer Science"
                        className={inputCls(fieldErrors.course)}
                      />
                      {fieldErrors.course && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.course}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                          Current Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleChange}
                          className={inputCls(fieldErrors.year) + " bg-white"}
                        >
                          <option value="">Select</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                        {fieldErrors.year && (
                          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.year}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                          Graduation Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="graduationYear"
                          value={formData.graduationYear}
                          onChange={handleChange}
                          placeholder="2027"
                          min="2020"
                          max="2035"
                          className={inputCls(fieldErrors.graduationYear)}
                        />
                        {fieldErrors.graduationYear && (
                          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.graduationYear}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Fresher fields */}
                {userType === "fresher" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Highest Qualification <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="highestQualification"
                        value={formData.highestQualification}
                        onChange={handleChange}
                        placeholder="B.Tech / BCA / MCA"
                        className={inputCls(fieldErrors.highestQualification)}
                      />
                      {fieldErrors.highestQualification && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.highestQualification}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Passout Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="passoutYear"
                        value={formData.passoutYear}
                        onChange={handleChange}
                        placeholder="2024"
                        min="2015"
                        max="2030"
                        className={inputCls(fieldErrors.passoutYear)}
                      />
                      {fieldErrors.passoutYear && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.passoutYear}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Key Skills{" "}
                        <span className="text-slate-400 text-xs font-normal">(optional, comma-separated)</span>
                      </label>
                      <input
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="React, Node.js, Python..."
                        className={inputCls(fieldErrors.skills)}
                      />
                    </div>
                  </>
                )}

                {/* Professional fields */}
                {userType === "professional" && (
                  <>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Current Company <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleChange}
                        placeholder="Company name"
                        className={inputCls(fieldErrors.currentCompany)}
                      />
                      {fieldErrors.currentCompany && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.currentCompany}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        placeholder="Software Engineer"
                        className={inputCls(fieldErrors.jobTitle)}
                      />
                      {fieldErrors.jobTitle && (
                        <p className="text-xs text-red-500 mt-1.5">{fieldErrors.jobTitle}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                          Experience <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="experienceYears"
                          value={formData.experienceYears}
                          onChange={handleChange}
                          className={inputCls(fieldErrors.experienceYears) + " bg-white"}
                        >
                          <option value="">Select</option>
                          <option value="0-1">0-1 years</option>
                          <option value="1-3">1-3 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="5+">5+ years</option>
                        </select>
                        {fieldErrors.experienceYears && (
                          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.experienceYears}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                          Industry{" "}
                          <span className="text-slate-400 text-xs font-normal">(optional)</span>
                        </label>
                        <input
                          name="industry"
                          value={formData.industry}
                          onChange={handleChange}
                          placeholder="IT / Finance"
                          className={inputCls(fieldErrors.industry)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Continue →"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: Resume Upload ═══════════════ */}
          {step === 3 && (
            <div>
              <div className="mb-7">
                <p className="text-[13px] font-semibold text-[#1e3a8a] mb-1.5">Step 3 of 3</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Upload or Link Your Resume
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Upload a resume file (PDF, DOC, DOCX) or paste an online link to apply faster. You can also skip this for now.
                </p>
              </div>

              {/* Universal Resume Input */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <ResumeUploadInput
                  value={resumeUrl}
                  onChange={handleResumeChange}
                  label="Resume Document or URL"
                  helperText="Supported formats: PDF, DOC, DOCX up to 10MB or direct URLs."
                />
              </div>

              {/* Upload success */}
              {resumeUploaded && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon />
                  </div>
                  Resume ready and attached!
                </div>
              )}

              {submitError && (
                <p className="mt-3 text-sm text-red-600">{submitError}</p>
              )}

              <div className="mt-6 space-y-3">
                {/* Go to Dashboard */}
                <button
                  onClick={handleFinish}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2 ${
                    resumeUploaded
                      ? "bg-[#1e3a8a] hover:bg-[#1e40af] text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {resumeUploaded ? "Save & Go to Dashboard →" : "Skip for now →"}
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                You can upload or update your resume anytime from your profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Parsed Resume Modal */}
      {parsedResult?.parsedData && (
        <ParsedResumeReviewModal
          isOpen={isReviewOpen}
          initialData={parsedResult.parsedData}
          resumeUrl={parsedResult.resumeUrl}
          resumeName={parsedResult.resumeName}
          onConfirm={handleConfirmParsedProfile}
          onCancel={handleFinish}
          isSaving={isSavingProfile}
        />
      )}
    </div>
  );
};

export default GoogleOnboarding;
