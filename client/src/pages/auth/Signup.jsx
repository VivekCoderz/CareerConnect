import { useState, useMemo } from "react";
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
import { getDashboardPath } from "../../utils/dashboardRedirect";
import { getCaptchaToken } from "../../utils/captcha";
import { generateStrongPassword } from "../../utils/passwordGenerator";

const EyeIcon = ({ hidden = false }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {hidden ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 4.2A10.8 10.8 0 0112 4c5 0 8.8 3.3 10 8a10.8 10.8 0 01-3 5.1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 6.6A11 11 0 002 12c1.2 4.7 5 8 10 8a10.7 10.7 0 004.2-.8" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    )}
  </svg>
);

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

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  // Steps: 1 = Email & Password (with OTP), 2 = Let's get started (screenshots 1-4), 3 = Areas of Interest
  const [step, setStep] = useState(1);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // OTP verification state
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic UI dropdown toggles & custom inputs
  const [showMoreCourses, setShowMoreCourses] = useState(false);
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLanguageInput, setNewLanguageInput] = useState("");
  const [extraLanguages, setExtraLanguages] = useState([]);
  const [interestSearchQuery, setInterestSearchQuery] = useState("");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [extraInterests, setExtraInterests] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "",
    gender: "",
    languages: ["English"],
    type: "student", // "student" | "fresher" | "professional"
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

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setFormData((prev) => ({
      ...prev,
      password: generated,
      confirmPassword: generated,
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
    setFieldErrors((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  };

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
    if (error) dispatch(clearMessages());
  };

  // ─── Step 1: Send OTP ───────────────────────────────────────────────────────
  const handleSendEmailOTP = async () => {
    const emailToVerify = formData.email.trim().toLowerCase();
    if (!emailToVerify) {
      setFieldErrors((prev) => ({ ...prev, email: "Please enter your email address" }));
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
        fullName: formData.fullName.trim() || formData.firstName.trim() || "User",
      });

      setOtpSent(true);
      setOtp("");
      setOtpSuccessMsg(`OTP sent to ${emailToVerify}`);
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
      const msg = err.response?.data?.message || "Failed to send OTP. Try again.";
      const field = err.response?.data?.field || "email";
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    } finally {
      setCheckingEmail(false);
    }
  };

  // ─── Step 1: Verify OTP ─────────────────────────────────────────────────────
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
      setOtpSuccessMsg("Email verified successfully!");
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ─── Step 1 Validation & Proceed ───────────────────────────────────────────
  const handleStep1Next = async () => {
    const errors = {};
    const emailToVerify = formData.email.trim().toLowerCase();

    if (!emailToVerify) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToVerify)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Strict Gating: Email MUST be verified with OTP before proceeding to Step 2
    if (!emailVerified) {
      if (!otpSent) {
        await handleSendEmailOTP();
        setFieldErrors((prev) => ({
          ...prev,
          email: "Verification OTP sent! Enter the 6-digit code below to verify your email.",
        }));
      } else if (otp.trim().length === 6) {
        await handleVerifyInlineOTP();
      } else {
        setOtpError("Please enter the 6-digit code sent to your email and click 'Submit OTP' to verify before continuing.");
      }
      return;
    }

    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Step 2 Validation & Proceed to Areas of Interest ──────────────────────
  const handleStep2Next = async () => {
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
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Toggle Language Selection ─────────────────────────────────────────────
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

  // ─── Toggle Interest Selection ─────────────────────────────────────────────
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

  // ─── Google Sign-Up ──────────────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    dispatch(clearMessages());

    try {
      const captchaToken = await getCaptchaToken("google_signup");
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await api.post("/auth/google-auth", {
        idToken,
        keepSignedIn: false,
        captchaToken,
      });

      const { user, requiresPasswordSetup, token } = response.data;
      dispatch(loginSuccess({ user, token }));

      if (!user.phone?.trim() || !user.isProfileComplete) {
        navigate("/onboarding/profile", { replace: true });
      } else {
        navigate(getDashboardPath(user.userType, user), { replace: true });
      }
    } catch (err) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        // dismissed popup
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setGoogleError("This email is already registered with a different sign-in method.");
      } else {
        setGoogleError(err.response?.data?.message || "Google sign-up failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Resume Upload State for Step 4
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const [parsedSkillsCount, setParsedSkillsCount] = useState(0);
  const [parsedResultData, setParsedResultData] = useState(null);
  const [resumeUploadStepText, setResumeUploadStepText] = useState("");

  // ─── Step 3 Submit -> Creates account & moves to Step 4 ───────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!emailVerified) {
      dispatch(signupFailure("Please verify your email first"));
      setStep(1);
      return;
    }

    dispatch(signupStart());
    try {
      const captchaToken = await getCaptchaToken("signup");

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: formData.fullName.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email.trim().toLowerCase(),
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
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        linkedin: formData.linkedin?.trim() || "",
        github: formData.github?.trim() || "",
        keepSignedIn,
        captchaToken,
      };

      const res = await api.post("/auth/register", payload);
      dispatch(signupSuccess({ user: res.data.user, token: res.data.token }));

      // Account created! Proceed to Step 4 for Resume Upload & AI Parsing
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      dispatch(signupFailure(message));
      if (err.response?.data?.field) {
        setFieldErrors({ [err.response.data.field]: err.response.data.message });
        if (err.response.data.field === "phone" || err.response.data.field === "city") {
          setStep(2);
        } else if (err.response.data.field === "email") {
          setStep(1);
        }
      }
    }
  };

  // ─── Step 4 Resume Upload & AI Parsing ────────────────────────────────────
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
    setResumeUploadStepText("Uploading resume PDF...");

    try {
      const formPayload = new FormData();
      formPayload.append("resume", resumeFile);

      setResumeUploadStepText("AI reading resume & extracting education, experience and skills...");
      const res = await api.post("/resume/upload-and-parse", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setResumeSuccess(true);
        if (res.data?.user) {
          dispatch(updateUserProfile(res.data.user));
        }
        setParsedResultData(res.data?.parsedData || null);
        const extractedSkills =
          (res.data?.parsedData?.skills?.programmingLanguages?.length || 0) +
          (res.data?.parsedData?.skills?.frameworks?.length || 0) +
          (res.data?.parsedData?.skills?.tools?.length || 0);
        setParsedSkillsCount(extractedSkills);
      } else {
        handleSkipToDashboard();
      }
    } catch (err) {
      console.error("Resume parsing error:", err);
      setResumeError(err.response?.data?.message || "Resume upload failed. You can skip and proceed to dashboard.");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleSkipToDashboard = () => {
    const targetType = formData.type || user?.userType || "student";
    const dest = getDashboardPath(targetType, user || { userType: targetType });
    navigate(dest, { replace: true });
  };

  // Combined Language list
  const allLanguages = useMemo(() => {
    const list = [...POPULAR_LANGUAGES];
    extraLanguages.forEach((l) => {
      if (!list.includes(l)) list.push(l);
    });
    return list;
  }, [extraLanguages]);

  // Filtered Interests
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
      {/* ─── Top Progress Bar ─────────────────────────────────────────────── */}
      <div className="w-full h-1 bg-slate-100 sticky top-0 z-50">
        <div
          className="h-full bg-[#00a884] transition-all duration-500 ease-out"
          style={{
            width: step === 1 ? "25%" : step === 2 ? "50%" : step === 3 ? "75%" : "100%",
          }}
        />
      </div>

      {/* ─── Main Content Container ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl">
          {/* 4-Step Wizard Header */}
          <div className="mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: "Verify Email" },
                { num: 2, label: "Profile Info" },
                { num: 3, label: "Interests" },
                { num: 4, label: "AI Resume" },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0 ${
                        step > s.num
                          ? "bg-emerald-500 text-white shadow-xs"
                          : step === s.num
                          ? "bg-[#008bdc] text-white ring-4 ring-blue-100 shadow-sm"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {step > s.num ? "✓" : s.num}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden md:inline ${
                        step === s.num ? "text-[#008bdc]" : step > s.num ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-3 transition ${
                        step > s.num ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* ===================================================================
              STEP 1: Account & Email OTP Verification
          =================================================================== */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[12px] font-semibold text-[#008bdc] mb-2">
                  Step 1 of 4 · Account & Email OTP Verification
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome to CareerConnect
                </h1>
                <p className="text-sm text-slate-500 mt-1.5">
                  Verify your email and create a password to get started
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Input with Verify OTP */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email Address <span className="text-red-500">*</span>
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
                      placeholder="Enter your email address"
                      className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] focus:ring-2 focus:ring-[#008bdc]/15 ${
                        emailVerified ? "bg-slate-50 border-emerald-400 text-slate-700 pr-10" : "border-slate-200"
                      }`}
                    />
                    {emailVerified && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Send OTP button below Email */}
                  {!emailVerified && !otpSent && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">Verify email with OTP</span>
                      <button
                        type="button"
                        onClick={handleSendEmailOTP}
                        disabled={checkingEmail || !formData.email.trim()}
                        className="h-8 px-4 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                      >
                        {checkingEmail ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          "Verify Email"
                        )}
                      </button>
                    </div>
                  )}

                  {/* OTP Input Box */}
                  {otpSent && !emailVerified && (
                    <div className="mt-2.5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          Enter 6-digit OTP
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
                            className="text-[11px] font-bold text-[#008bdc] hover:underline"
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
                          placeholder="000000"
                          className="flex-1 h-10 px-3 text-center tracking-[0.25em] font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-[#008bdc]"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyInlineOTP}
                          disabled={verifyingOtp || otp.length !== 6}
                          className="h-10 px-4 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-blue-300 text-white text-xs font-semibold transition shadow-sm"
                        >
                          {verifyingOtp ? "Verifying..." : "Submit OTP"}
                        </button>
                      </div>

                      {otpError && <p className="text-xs text-red-600 font-medium">{otpError}</p>}
                      {otpSuccessMsg && !otpError && (
                        <p className="text-xs text-emerald-600 font-medium">{otpSuccessMsg}</p>
                      )}
                    </div>
                  )}

                  {fieldErrors.email && (
                    <p className="text-xs text-red-500 mt-1.5">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-bold text-[#008bdc] hover:underline"
                      >
                        Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="At least 6 chars"
                        className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <EyeIcon hidden={showPassword} />
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <EyeIcon hidden={showConfirmPassword} />
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={checkingEmail || googleLoading}
                  className={`w-full h-11 mt-3 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    emailVerified
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20"
                      : "bg-[#008bdc] hover:bg-[#0077ba]"
                  }`}
                >
                  {checkingEmail ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </>
                  ) : emailVerified ? (
                    "Next: Fill Profile Details (Step 2) →"
                  ) : otpSent ? (
                    "Verify OTP & Continue →"
                  ) : (
                    "Verify Email with OTP →"
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500">
                  {emailVerified
                    ? "✓ Email verified successfully! Click the button above to proceed to Step 2."
                    : "🔒 Email verification via 6-digit OTP is required before proceeding to Step 2."}
                </p>

                {/* Google Sign-in Alternative */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {googleError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                    {googleError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold transition flex items-center justify-center gap-3 hover:bg-slate-50 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <p className="text-center text-xs text-slate-500 pt-2">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-[#008bdc] hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 2: "Let's get started" (Matching Screenshots 1, 2, 3, 4)
          =================================================================== */}
          {step === 2 && (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[12px] font-semibold text-[#008bdc] mb-2">
                  Step 2 of 4 · Profile Details
                </div>
                <p className="text-slate-700 text-sm font-medium mb-1">
                  Hi there! 👋
                </p>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  Let's get started
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Tell us about your background so recruiters can find you
                </p>
              </div>

              {/* Form Card */}
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

                {/* Email (Disabled / Read-only with verified email) */}
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

                    {/* + Add more languages button */}
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

                {/* ─── Type (Strictly 3 options as requested) ─────────────────── */}
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

                {/* ─── Dynamic Fields Based on Selected Type ──────────────────── */}
                {/* 1. Years of work experience (for Fresher & Working Professional) */}
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

                {/* 2. Course Pills + Find more courses dropdown */}
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

                    {/* Find more courses dropdown toggle */}
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

                {/* 3. College name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    College name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder={
                      formData.type === "student"
                        ? "Eg. BITS Pilani"
                        : "Eg. Geeta Engineering College"
                    }
                    className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#008bdc] ${
                      fieldErrors.college ? "border-red-400 ring-2 ring-red-400/10" : "border-slate-200"
                    }`}
                  />
                  {fieldErrors.college && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.college}</p>
                  )}
                </div>

                {/* 4. Stream (Optional) */}
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

                {/* 5. Start year & End year */}
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

                {/* Next Button (Solid blue button bottom-right matching screenshot) */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    ← Back to account
                  </button>

                  <button
                    type="button"
                    onClick={handleStep2Next}
                    className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] text-white text-sm font-semibold transition shadow-sm cursor-pointer"
                  >
                    Next: Areas of Interest (Step 3) →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 3: "Areas of Interest"
          =================================================================== */}
          {step === 3 && (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
                >
                  ← Back to information
                </button>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[12px] font-semibold text-[#008bdc] mb-2">
                  Step 3 of 4 · Areas of Interest
                </div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  What are your areas of interest?
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  Choose the domains or fields you want to explore to get tailored jobs, internships, and courses.
                </p>
              </div>

              {/* Card */}
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

                {/* Interactive Interest Pills Grid */}
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

                {/* Keep Signed In Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#008bdc] cursor-pointer"
                  />
                  <span className="text-xs text-slate-600">
                    Keep me signed in on this device
                  </span>
                </label>

                {/* Submit button */}
                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-blue-300 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account & Proceed to Resume (Step 4) →"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              STEP 4: Upload Resume & AI Auto-Parsing
          =================================================================== */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700 mb-2">
                  Step 4 of 4 · AI Resume Sync & Auto-Fill
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Upload Your Resume
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  Our CareerConnect AI will automatically parse your PDF resume and save your education, experience, projects, and skills into your profile!
                </p>
              </div>

              {resumeError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {resumeError}
                </div>
              )}

              {resumeSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-xs">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Resume Parsed & Profile Auto-Filled!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {parsedSkillsCount > 0
                        ? `AI successfully extracted ${parsedSkillsCount} skills, education & experience into your profile.`
                        : "Your resume details have been synchronized directly into your profile."}
                    </p>
                  </div>

                  {/* Summary of Parsed Info */}
                  {parsedResultData && (
                    <div className="text-left bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Extracted Profile Highlights:
                      </p>
                      
                      {/* Skills Preview */}
                      {parsedResultData.skills?.programmingLanguages?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 mb-1">Skills Detected:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedResultData.skills.programmingLanguages.slice(0, 8).map((sk) => (
                              <span key={sk} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education Preview */}
                      {parsedResultData.education?.[0]?.college && (
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Education: </span>
                          <span>{parsedResultData.education[0].degree || "Degree"} at {parsedResultData.education[0].college}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSkipToDashboard}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Go to My Dashboard →
                  </button>
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
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to parse with AI
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
                      ⚡ How AI auto-fills your profile:
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
                        <span>Imports work experience & projects</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Saves resume for 1-click job apply</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSkipToDashboard}
                      disabled={resumeUploading}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium py-2 cursor-pointer"
                    >
                      Skip for now →
                    </button>

                    <button
                      type="button"
                      onClick={handleResumeUploadAndFinish}
                      disabled={resumeUploading || !resumeFile}
                      className="h-11 px-8 rounded-lg bg-[#008bdc] hover:bg-[#0077ba] disabled:bg-slate-300 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {resumeUploading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>{resumeUploadStepText || "AI Parsing Resume..."}</span>
                        </>
                      ) : (
                        "Upload & Auto-Fill Profile with AI"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        CareerConnect · All rights reserved
      </footer>
    </div>
  );
};

export default Signup;
