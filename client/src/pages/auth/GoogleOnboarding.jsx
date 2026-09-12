import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import api from "../../api/api";
import { updateUserProfile, logout } from "../../redux/features/authSlice";
import { getDashboardPath } from "../../utils/dashboardRedirect";

const POPULAR_LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Marathi",
  "French",
  "Japanese",
];

const POPULAR_COURSES = ["B.Tech", "BE", "B.Com", "MBA", "B.A"];

const MORE_COURSES = [
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
  "BBA",
  "B.Des",
  "M.Tech",
  "Ph.D",
  "Diploma",
  "B.Arch",
  "LLB",
  "Pharmacy",
  "Other",
];

const EXPERIENCE_OPTIONS = [
  "0 years",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "5+ years",
];

const POPULAR_INTERESTS = [
  { id: "web_dev", name: "Web Development", icon: "💻" },
  { id: "mobile_dev", name: "Mobile App Development", icon: "📱" },
  { id: "python", name: "Python Programming", icon: "🐍" },
  { id: "full_stack", name: "Full Stack (MERN/Java)", icon: "⚛️" },
  { id: "ai_ml", name: "Artificial Intelligence & ML", icon: "🤖" },
  { id: "data_science", name: "Data Science & Analytics", icon: "📊" },
  { id: "ui_ux", name: "UI/UX Design", icon: "🎨" },
  { id: "graphic_design", name: "Graphic Design & Video", icon: "🖌️" },
  { id: "digital_marketing", name: "Digital Marketing & SEO", icon: "📈" },
  { id: "content_writing", name: "Content Writing", icon: "✍️" },
  { id: "business_dev", name: "Business Development & Sales", icon: "💼" },
  { id: "hr", name: "Human Resources (HR)", icon: "👥" },
  { id: "finance", name: "Finance & Accounting", icon: "💰" },
  { id: "cyber_security", name: "Cyber Security", icon: "🔒" },
  { id: "cloud_devops", name: "Cloud & DevOps", icon: "☁️" },
  { id: "product_mgmt", name: "Product Management", icon: "📦" },
];

const GENDER_OPTIONS = [
  { id: "female", label: "Female", icon: "👩" },
  { id: "male", label: "Male", icon: "👨" },
  { id: "other", label: "Others", icon: "⭐" },
];

const CANDIDATE_TYPES = [
  { id: "student", label: "College student" },
  { id: "fresher", label: "Fresher" },
  { id: "professional", label: "Working professional" },
];

const GoogleOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && user.hasPassword === false) {
      navigate("/set-password", { replace: true });
    }
  }, [user, navigate]);

  // Steps: 1 = "Let's get started" info card, 2 = "Areas of Interest"
  const [step, setStep] = useState(1);
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

  // Dropdown toggles
  const [showMoreCourses, setShowMoreCourses] = useState(false);
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLanguageInput, setNewLanguageInput] = useState("");
  const [extraLanguages, setExtraLanguages] = useState([]);
  const [interestSearchQuery, setInterestSearchQuery] = useState("");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [extraInterests, setExtraInterests] = useState([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    city: "",
    gender: "",
    languages: ["English"],
    type: "student",
    workExperience: "0 years",
    course: "",
    college: "",
    stream: "",
    startYear: "",
    endYear: "",
    interests: [],
    linkedin: "",
    github: "",
  });

  // Pre-fill user data from Google profile
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    const nameParts = (user.fullName || "").trim().split(" ");
    const fName = user.firstName || nameParts[0] || "";
    const lName = user.lastName || nameParts.slice(1).join(" ") || "";

    setFormData((prev) => ({
      ...prev,
      firstName: fName,
      lastName: lName,
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      city: user.city || "",
      gender: user.gender || "",
      languages: user.languages?.length ? user.languages : ["English"],
      type: user.userType || "student",
      workExperience: user.workExperience || "0 years",
      course: user.course || "",
      college: user.college || "",
      stream: user.stream || "",
      startYear: user.startYear || "",
      endYear: user.endYear || "",
      interests: user.interests || [],
    }));
  }, [user, navigate]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const startYears = useMemo(() => {
    const list = [];
    for (let y = currentYear + 2; y >= currentYear - 8; y--) list.push(y);
    return list;
  }, [currentYear]);

  const endYears = useMemo(() => {
    const list = [];
    for (let y = currentYear + 7; y >= currentYear - 4; y--) list.push(y);
    return list;
  }, [currentYear]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "firstName" || name === "lastName") {
        const first = name === "firstName" ? value : prev.firstName;
        const last = name === "lastName" ? value : prev.lastName;
        updated.fullName = `${first || ""} ${last || ""}`.trim();
      }
      return updated;
    });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const toggleLanguage = (lang) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(lang);
      const updated = exists
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang];
      return { ...prev, languages: updated };
    });
  };

  const handleAddCustomLanguage = (e) => {
    e.preventDefault();
    const trimmed = newLanguageInput.trim();
    if (!trimmed) return;
    if (!formData.languages.includes(trimmed)) {
      setExtraLanguages((prev) => [...prev, trimmed]);
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, trimmed],
      }));
    }
    setNewLanguageInput("");
    setShowAddLanguage(false);
  };

  const toggleInterest = (interestName) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interestName);
      const updated = exists
        ? prev.interests.filter((item) => item !== interestName)
        : [...prev.interests, interestName];
      return { ...prev, interests: updated };
    });
  };

  const handleAddCustomInterest = (e) => {
    e.preventDefault();
    const trimmed = customInterestInput.trim();
    if (!trimmed) return;
    if (!formData.interests.includes(trimmed)) {
      setExtraInterests((prev) => [...prev, trimmed]);
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, trimmed],
      }));
    }
    setCustomInterestInput("");
  };

  // Step 1 Validation & Proceed to Step 2
  const handleStep1Next = async () => {
    const errors = {};
    if (!formData.firstName?.trim()) errors.firstName = "First name is required";
    if (!formData.phone?.trim()) {
      errors.phone = "Contact number is required";
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

    if (!formData.city?.trim()) errors.city = "Required";
    if (!formData.gender) errors.gender = "Please select your gender";
    if (!formData.type) errors.type = "Please select your type";
    if (!formData.course?.trim()) errors.course = "Please select or enter your course";
    if (!formData.college?.trim()) errors.college = "College name is required";
    if (!formData.startYear) errors.startYear = "Choose year";
    if (!formData.endYear) errors.endYear = "Choose year";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Check duplicate phone number
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

    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: formData.fullName.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
        countryCode: formData.countryCode || "+91",
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        gender: formData.gender,
        languages: formData.languages,
        type: formData.type,
        userType: formData.type,
        workExperience: formData.workExperience,
        course: formData.course.trim(),
        college: formData.college.trim(),
        stream: formData.stream.trim(),
        startYear: formData.startYear,
        endYear: formData.endYear,
        interests: formData.interests,
        linkedin: formData.linkedin?.trim() || "",
        github: formData.github?.trim() || "",
      };

      const res = await api.post("/auth/google-onboarding", payload);
      if (res.data?.user) {
        dispatch(updateUserProfile(res.data.user));
      }

      // Profile details saved! Proceed to Step 3 for Resume Upload & AI Parsing
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to complete profile setup.";
      setSubmitError(msg);
      if (err.response?.data?.field) {
        setFieldErrors({ [err.response.data.field]: err.response.data.message });
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3 Resume Upload & AI Parsing ────────────────────────────────────
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const [parsedSkillsCount, setParsedSkillsCount] = useState(0);

  const handleResumeFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setResumeError("Please select a valid PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setResumeError("Resume file size must be less than 10MB");
      return;
    }

    setResumeFile(file);
    setResumeError("");
  };

  const handleResumeUploadAndFinish = async () => {
    if (!resumeFile) {
      handleSkipToDashboard();
      return;
    }

    setResumeUploading(true);
    setResumeError("");

    try {
      const formPayload = new FormData();
      formPayload.append("resume", resumeFile);

      const res = await api.post("/resume/upload-and-parse", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setResumeSuccess(true);
        if (res.data?.user) {
          dispatch(updateUserProfile(res.data.user));
        }
        const extractedSkills =
          (res.data?.parsedData?.skills?.programmingLanguages?.length || 0) +
          (res.data?.parsedData?.skills?.frameworks?.length || 0) +
          (res.data?.parsedData?.skills?.tools?.length || 0);
        setParsedSkillsCount(extractedSkills);

        setTimeout(() => {
          handleSkipToDashboard();
        }, 1200);
      } else {
        handleSkipToDashboard();
      }
    } catch (err) {
      console.error("Resume parsing error:", err);
      handleSkipToDashboard();
    } finally {
      setResumeUploading(false);
    }
  };

  const handleSkipToDashboard = () => {
    const targetType = formData.type || user?.userType || "student";
    const dest = getDashboardPath(targetType, user || { userType: targetType });
    navigate(dest, { replace: true });
  };

  const allLanguages = useMemo(() => {
    const list = [...POPULAR_LANGUAGES];
    extraLanguages.forEach((l) => {
      if (!list.includes(l)) list.push(l);
    });
    return list;
  }, [extraLanguages]);

  const filteredInterests = useMemo(() => {
    const combined = [...POPULAR_INTERESTS];
    extraInterests.forEach((name) => {
      if (!combined.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        combined.push({ id: name, name, icon: "✨" });
      }
    });
    if (!interestSearchQuery.trim()) return combined;
    return combined.filter((i) =>
      i.name.toLowerCase().includes(interestSearchQuery.toLowerCase())
    );
  }, [extraInterests, interestSearchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
      {/* Top Progress Bar */}
      <div className="w-full h-1 bg-slate-100 sticky top-0 z-50">
        <div
          className="h-full bg-[#00a884] transition-all duration-500 ease-out"
          style={{
            width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl">
          {/* Back to Home / Cancel Header */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancelAndGoHome}
              disabled={cancelling}
              className="group inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1.5 px-3 rounded-lg hover:bg-slate-200/60 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {cancelling ? "Cancelling..." : "Back to Home"}
            </button>
            <span className="text-xs text-slate-400 font-medium">Step {step} of 3</span>
          </div>

          {submitError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}

          {/* ===================================================================
              STEP 1: "Let's get started" Information Card
          =================================================================== */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <p className="text-slate-700 text-sm font-medium mb-1">
                  Hi there! 👋
                </p>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  Let's get started
                </h1>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
                {/* First name & Last name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Vivek"
                      className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] ${
                        fieldErrors.firstName ? "border-red-400 ring-2 ring-red-400/10" : "border-slate-200"
                      }`}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Last name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Garg"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc]"
                    />
                  </div>
                </div>

                {/* Email (Disabled / Read-only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    readOnly
                    className="w-full h-11 rounded-lg border border-slate-200 bg-[#f1f3f5] px-3.5 text-sm text-slate-600 cursor-not-allowed outline-none select-all"
                  />
                </div>

                {/* Contact number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contact number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="w-16 h-11 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                      +91
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9306810726"
                      className={`flex-1 h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] ${
                        fieldErrors.phone ? "border-red-400 ring-2 ring-red-400/10" : "border-slate-200"
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Current city */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    Current city <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-1.5">
                    To connect you with opportunities closer to you
                  </p>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Current location"
                    className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] ${
                      fieldErrors.city ? "border-red-400 ring-2 ring-red-400/10" : "border-slate-200"
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                        <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                      </svg>
                      Required
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Gender</label>
                  <div className="flex flex-wrap gap-2.5">
                    {GENDER_OPTIONS.map((g) => {
                      const isSelected = formData.gender === g.id;
                      return (
                        <button
                          type="button"
                          key={g.id}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, gender: g.id }));
                            if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: "" }));
                          }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition select-none ${
                            isSelected
                              ? "border border-[#008bdc] bg-[#eff6ff] text-[#008bdc] font-semibold"
                              : "border border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                          }`}
                        >
                          <span>{g.icon}</span>
                          <span>{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.gender && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.gender}</p>
                  )}
                </div>

                {/* Languages you know */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Languages you know
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allLanguages.map((lang) => {
                      const isSelected = formData.languages.includes(lang);
                      return (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => toggleLanguage(lang)}
                          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs transition select-none ${
                            isSelected
                              ? "bg-[#008bdc] text-white border border-[#008bdc] font-medium shadow-sm"
                              : "border border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                          }`}
                        >
                          <span>{lang}</span>
                          <span className="text-[11px] font-bold ml-0.5">
                            {isSelected ? "✓" : "+"}
                          </span>
                        </button>
                      );
                    })}

                    {!showAddLanguage ? (
                      <button
                        type="button"
                        onClick={() => setShowAddLanguage(true)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs text-[#008bdc] font-semibold hover:border-blue-300 hover:bg-blue-50/50 transition"
                      >
                        + Add more languages
                      </button>
                    ) : (
                      <form onSubmit={handleAddCustomLanguage} className="inline-flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newLanguageInput}
                          onChange={(e) => setNewLanguageInput(e.target.value)}
                          placeholder="e.g. Punjabi"
                          autoFocus
                          className="h-8 px-3 rounded-full border border-blue-400 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-28"
                        />
                        <button
                          type="submit"
                          className="h-8 px-3 rounded-full bg-[#008bdc] text-white text-xs font-semibold"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddLanguage(false)}
                          className="text-xs text-slate-400 hover:text-slate-600 px-1"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Type (Strictly 3 options) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Type</label>
                  <div className="flex flex-wrap gap-2.5">
                    {CANDIDATE_TYPES.map((t) => {
                      const isSelected = formData.type === t.id;
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, type: t.id }));
                            if (fieldErrors.type) setFieldErrors((prev) => ({ ...prev, type: "" }));
                          }}
                          className={`px-4 py-2 rounded-full text-xs transition select-none ${
                            isSelected
                              ? "bg-[#008bdc] text-white border border-[#008bdc] font-semibold shadow-sm"
                              : "border border-slate-300 text-slate-700 hover:border-slate-400 font-medium"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.type && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.type}</p>
                  )}
                </div>

                {/* Dynamic Fields */}
                {(formData.type === "fresher" || formData.type === "professional") && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Years of work experience
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERIENCE_OPTIONS.map((exp) => {
                        const isSelected = formData.workExperience === exp;
                        return (
                          <button
                            type="button"
                            key={exp}
                            onClick={() => setFormData((prev) => ({ ...prev, workExperience: exp }))}
                            className={`px-3.5 py-1.5 rounded-full text-xs transition select-none ${
                              isSelected
                                ? "bg-[#008bdc] text-white border border-[#008bdc] font-semibold"
                                : "border border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                            }`}
                          >
                            {exp}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Course */}
                <div className="pt-2 animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Course</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {POPULAR_COURSES.map((c) => {
                      const isSelected = formData.course === c;
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, course: c }));
                            if (fieldErrors.course) setFieldErrors((prev) => ({ ...prev, course: "" }));
                          }}
                          className={`px-4 py-1.5 rounded-full text-xs transition select-none ${
                            isSelected
                              ? "bg-[#008bdc] text-white border border-[#008bdc] font-semibold"
                              : "border border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMoreCourses((prev) => !prev)}
                        className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs transition ${
                          !POPULAR_COURSES.includes(formData.course) && formData.course
                            ? "bg-[#008bdc] text-white border border-[#008bdc] font-semibold"
                            : "border border-slate-200 text-[#008bdc] font-semibold hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        <span>
                          {!POPULAR_COURSES.includes(formData.course) && formData.course
                            ? formData.course
                            : "Find more courses"}
                        </span>
                        <svg className={`w-3.5 h-3.5 transition ${showMoreCourses ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showMoreCourses && (
                        <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 space-y-1">
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {MORE_COURSES.map((courseOption) => (
                              <button
                                key={courseOption}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, course: courseOption }));
                                  setShowMoreCourses(false);
                                  if (fieldErrors.course) setFieldErrors((prev) => ({ ...prev, course: "" }));
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition ${
                                  formData.course === courseOption
                                    ? "bg-blue-50 text-[#008bdc] font-semibold"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {courseOption}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex gap-1">
                            <input
                              type="text"
                              value={customCourseInput}
                              onChange={(e) => setCustomCourseInput(e.target.value)}
                              placeholder="Other course..."
                              className="flex-1 h-7 px-2 text-xs border border-slate-200 rounded outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customCourseInput.trim()) {
                                  setFormData((prev) => ({ ...prev, course: customCourseInput.trim() }));
                                  setCustomCourseInput("");
                                  setShowMoreCourses(false);
                                  if (fieldErrors.course) setFieldErrors((prev) => ({ ...prev, course: "" }));
                                }
                              }}
                              className="px-2 h-7 bg-[#008bdc] text-white text-[11px] font-semibold rounded"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {fieldErrors.course && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.course}</p>
                  )}
                </div>

                {/* College name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    College name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder="Eg. BITS Pilani"
                    className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] ${
                      fieldErrors.college ? "border-red-400 ring-2 ring-red-400/10" : "border-slate-200"
                    }`}
                  />
                  {fieldErrors.college && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.college}</p>
                  )}
                </div>

                {/* Stream (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Stream <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="stream"
                    value={formData.stream}
                    onChange={handleChange}
                    placeholder="Eg. Computer Science"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc]"
                  />
                </div>

                {/* Start year & End year */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Start year <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="startYear"
                      value={formData.startYear}
                      onChange={handleChange}
                      className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-[#008bdc] ${
                        fieldErrors.startYear ? "border-red-400" : "border-slate-200"
                      }`}
                    >
                      <option value="">Choose year</option>
                      {startYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.startYear && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.startYear}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      End year <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="endYear"
                      value={formData.endYear}
                      onChange={handleChange}
                      className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-[#008bdc] ${
                        fieldErrors.endYear ? "border-red-400" : "border-slate-200"
                      }`}
                    >
                      <option value="">Choose year</option>
                      {endYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.endYear && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.endYear}</p>
                    )}
                  </div>
                </div>

                {/* Next button */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] text-white text-sm font-semibold transition shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 2: "Areas of Interest"
          =================================================================== */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
                >
                  ← Back to information
                </button>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[12px] font-semibold text-[#008bdc] mb-2">
                  Final Step
                </div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  What are your areas of interest?
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  Choose the domains or fields you want to explore to get tailored jobs, internships, and courses.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
                {/* Search / Filter Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={interestSearchQuery}
                    onChange={(e) => setInterestSearchQuery(e.target.value)}
                    placeholder="Search domains (e.g. Web Development, Python, Design...)"
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#008bdc] transition"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" strokeWidth="2" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* Selected Counter */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
                  <span className="font-medium">
                    {formData.interests.length > 0 ? (
                      <span className="text-[#008bdc] font-bold">
                        {formData.interests.length} areas selected
                      </span>
                    ) : (
                      "Select at least 1 area of interest"
                    )}
                  </span>
                  {formData.interests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, interests: [] }))}
                      className="text-slate-400 hover:text-slate-600 underline text-xs"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredInterests.map((interest) => {
                    const isSelected = formData.interests.includes(interest.name);
                    return (
                      <button
                        type="button"
                        key={interest.name}
                        onClick={() => toggleInterest(interest.name)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition text-left select-none ${
                          isSelected
                            ? "bg-[#008bdc] text-white font-semibold shadow-sm border border-[#008bdc]"
                            : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100/80 font-medium"
                        }`}
                      >
                        <span className="text-base">{interest.icon}</span>
                        <span>{interest.name}</span>
                        {isSelected && <span className="ml-1 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Interest Adder */}
                <form onSubmit={handleAddCustomInterest} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customInterestInput}
                    onChange={(e) => setCustomInterestInput(e.target.value)}
                    placeholder="+ Add custom domain or skill"
                    className="flex-1 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#008bdc]"
                  />
                  <button
                    type="submit"
                    disabled={!customInterestInput.trim()}
                    className="h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold transition"
                  >
                    Add
                  </button>
                </form>

                {/* Submit button */}
                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-blue-300 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      "Continue to Resume Upload →"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 3: Upload Resume & AI Auto-Parsing (Google Onboarding)
          =================================================================== */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700 mb-2">
                  Step 3 of 3 · AI Resume Sync
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Upload Your Resume
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  Our CareerConnect AI will automatically parse your skills, experience, projects, and education into your profile in seconds!
                </p>
              </div>

              {resumeError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {resumeError}
                </div>
              )}

              {resumeSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Resume Parsed & Synced Successfully!
                  </h3>
                  <p className="text-xs text-slate-500">
                    {parsedSkillsCount > 0
                      ? `AI extracted ${parsedSkillsCount} skills and filled your profile details.`
                      : "Your profile has been populated with your resume details."}
                  </p>
                  <p className="text-xs font-semibold text-[#008bdc]">
                    Redirecting to your dashboard...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Drag & Drop / File Input Box */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#008bdc] rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/20 relative cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleResumeFileSelect}
                      disabled={resumeUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-[#008bdc] flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>

                    {resumeFile ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {resumeFile.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to parse
                        </p>
                        <span className="inline-block mt-2 text-xs font-semibold text-[#008bdc] underline">
                          Change file
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Click to upload or drag & drop your resume
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PDF format only · Maximum 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Highlights list */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      ⚡ What our AI does automatically:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Extracts technical & soft skills</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Fills college & education history</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Imports projects & live links</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Sets up 1-click job applications</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSkipToDashboard}
                      disabled={resumeUploading}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium py-2"
                    >
                      Skip for now →
                    </button>

                    <button
                      type="button"
                      onClick={handleResumeUploadAndFinish}
                      disabled={resumeUploading || !resumeFile}
                      className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-slate-300 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
                    >
                      {resumeUploading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          AI Parsing Resume...
                        </>
                      ) : (
                        "Upload & Sync Profile"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancel Option */}
          <div className="text-center mt-4 pb-2">
            <button
              type="button"
              onClick={handleCancelAndGoHome}
              disabled={cancelling}
              className="text-xs text-slate-400 hover:text-red-500 transition underline underline-offset-4 cursor-pointer disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Don't want to complete account setup? Cancel & Return to Home"}
            </button>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-slate-400">
        CareerConnect · All rights reserved
      </footer>
    </div>
  );
};

export default GoogleOnboarding;
