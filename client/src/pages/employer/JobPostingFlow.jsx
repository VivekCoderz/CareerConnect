import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Briefcase,
  Layers,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  ShieldCheck,
  Check,
  RotateCcw,
} from "lucide-react";
import jobService from "../../services/jobService";
import JourneyLoader from "../../components/common/JourneyLoader";

const DEFAULT_CATEGORIES = [
  "Web Development",
  "App Development",
  "Software Development",
  "Data Science",
  "Machine Learning",
  "UI/UX Design",
  "Digital Marketing",
  "Content Writing",
  "Graphic Design",
  "HR",
  "Finance",
  "Sales",
];

const ROUND_TYPES = [
  { value: "technical", label: "Technical Interview", icon: "💻" },
  { value: "coding", label: "Coding & DSA Assessment", icon: "⚡" },
  { value: "online_assessment", label: "Online Screening / Test", icon: "📝" },
  { value: "managerial", label: "Managerial Round", icon: "👔" },
  { value: "hr", label: "HR & Culture Discussion", icon: "🤝" },
  { value: "behavioral", label: "Behavioral Assessment", icon: "🧠" },
  { value: "final", label: "Final Leadership Review", icon: "🏆" },
  { value: "other", label: "Custom Round", icon: "⚙️" },
];

const PRESET_ROUND_TEMPLATES = [
  { name: "Technical Interview", type: "technical", desc: "Core technical competence, coding proficiency, and problem solving." },
  { name: "Live Coding & DSA", type: "coding", desc: "Hands-on data structures, algorithms, and live code walkthrough." },
  { name: "Online Assessment", type: "online_assessment", desc: "Automated screening test evaluating core aptitudes and coding concepts." },
  { name: "Managerial Round", type: "managerial", desc: "Project scenarios, architectural thinking, and role ownership." },
  { name: "HR & Culture Fit", type: "hr", desc: "Company values alignment, team communication, and compensation expectations." },
  { name: "Final Leadership", type: "final", desc: "Executive conversation and final hiring leadership review." },
];

const getDefaultRoundForOrder = (order) => {
  switch (order) {
    case 1:
      return {
        order: 1,
        name: "Technical Interview",
        type: "technical",
        description: "Core technical competence, coding proficiency, and problem solving.",
        isMandatory: true,
      };
    case 2:
      return {
        order: 2,
        name: "Managerial Round",
        type: "managerial",
        description: "Project management, system design, leadership, and role ownership.",
        isMandatory: true,
      };
    case 3:
      return {
        order: 3,
        name: "HR & Culture Discussion",
        type: "hr",
        description: "Company values alignment, communication, career goals, and cultural fit.",
        isMandatory: true,
      };
    case 4:
      return {
        order: 4,
        name: "Final Leadership Review",
        type: "final",
        description: "Executive discussion and final leadership evaluation.",
        isMandatory: true,
      };
    default:
      return {
        order,
        name: `Round ${order} - Evaluation`,
        type: "other",
        description: "",
        isMandatory: true,
      };
  }
};

const DRAFT_STORAGE_KEY = "careerconnect_job_draft_v2";

export default function JobPostingFlow({ mode = "create", step: routeStep = "details" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramJobId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const isEditMode = mode === "edit" || Boolean(paramJobId);
  const jobId = paramJobId;

  // Determine current active step from routeStep or path
  const currentStep = useMemo(() => {
    if (routeStep) return routeStep;
    if (location.pathname.includes("/interview-process")) return "interview-process";
    if (location.pathname.includes("/review")) return "review";
    return "details";
  }, [routeStep, location.pathname]);

  // Loading & error states
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState(null);

  // Job Details State
  const [formData, setFormData] = useState({
    title: "",
    category: "Web Development",
    subCategory: "Frontend Development",
    department: "Engineering",
    employmentType: "Full-time",
    workMode: "Remote",
    location: "Bangalore",
    city: "Bangalore",
    country: "India",
    isPaid: true,
    hasJobOffer: true,
    isInternational: false,
    salaryMin: "600000",
    salaryMax: "1200000",
    currency: "INR",
    experienceLevel: "Fresher / Entry-Level",
    minYears: 0,
    maxYears: 1,
    education: "B.Tech / BCA / MCA / Any Graduate",
    description: "",
    responsibilities: "",
    requiredSkills: "React, JavaScript, Tailwind CSS",
    preferredSkills: "Redux, TypeScript",
    bonusSkills: "Next.js, Git",
    openings: 2,
    deadline: "",
    status: "Published",
  });

  // Interview Rounds State
  const [interviewRounds, setInterviewRounds] = useState([
    getDefaultRoundForOrder(1),
  ]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isEditMode && jobId) {
        try {
          setInitialLoading(true);
          const res = await jobService.getJobById(jobId);
          if (res?.success && res.job && isMounted) {
            const j = res.job;
            setFormData({
              title: j.title || "",
              category: j.category || "Web Development",
              subCategory: j.subCategory || "Frontend Development",
              department: j.department || "Engineering",
              employmentType: j.employmentType || "Full-time",
              workMode: j.workMode || "Remote",
              location: j.location || "Bangalore",
              city: j.city || "Bangalore",
              country: j.country || "India",
              isPaid: j.isPaid !== false,
              hasJobOffer: !!j.hasJobOffer,
              isInternational: !!j.isInternational,
              salaryMin: j.salaryRange?.min !== undefined ? String(j.salaryRange.min) : "600000",
              salaryMax: j.salaryRange?.max !== undefined ? String(j.salaryRange.max) : "1200000",
              currency: j.salaryRange?.currency || "INR",
              experienceLevel: j.experience?.level || "Fresher / Entry-Level",
              minYears: j.experience?.minYears || 0,
              maxYears: j.experience?.maxYears || 1,
              education: j.education || "B.Tech / BCA / MCA / Any Graduate",
              description: j.description || "",
              responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities.join("\n") : "",
              requiredSkills: Array.isArray(j.requiredSkills) ? j.requiredSkills.join(", ") : "",
              preferredSkills: Array.isArray(j.preferredSkills) ? j.preferredSkills.join(", ") : "",
              bonusSkills: Array.isArray(j.bonusSkills) ? j.bonusSkills.join(", ") : "",
              openings: j.openings || 2,
              deadline: j.deadline ? j.deadline.split("T")[0] : "",
              status: j.status || "Published",
            });

            if (Array.isArray(j.interviewRounds) && j.interviewRounds.length > 0) {
              setInterviewRounds(
                j.interviewRounds.map((r, idx) => ({
                  order: r.order || idx + 1,
                  name: r.name || `Round ${idx + 1}`,
                  type: r.type || "technical",
                  description: r.description || "",
                  isMandatory: r.isMandatory !== false,
                }))
              );
            } else {
              setInterviewRounds([getDefaultRoundForOrder(1)]);
            }
          }
        } catch (err) {
          if (isMounted) {
            setErrorMessage(err.response?.data?.message || "Failed to load job details.");
          }
        } finally {
          if (isMounted) setInitialLoading(false);
        }
      } else {
        // Create mode: retrieve from sessionStorage draft if available
        try {
          const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
            if (Array.isArray(parsed.interviewRounds) && parsed.interviewRounds.length > 0) {
              setInterviewRounds(parsed.interviewRounds);
            }
          }
        } catch {
          // ignore parsing error
        }
        setInitialLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, jobId]);

  // Sync draft to sessionStorage in create mode
  useEffect(() => {
    if (!isEditMode && !initialLoading) {
      try {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ formData, interviewRounds })
        );
      } catch {
        // quota or privacy mode
      }
    }
  }, [formData, interviewRounds, isEditMode, initialLoading]);

  // Form Change Handler
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorMessage("");
  };

  // Base path generator
  const getStepUrl = useCallback(
    (stepName) => {
      const base = isEditMode ? `/employer/jobs/${jobId}/edit` : "/employer/jobs/new";
      if (stepName === "details") return base;
      if (stepName === "interview-process") return `${base}/interview-process`;
      if (stepName === "review") return `${base}/review`;
      return base;
    },
    [isEditMode, jobId]
  );

  // Navigate to Step 1
  const goToDetails = () => {
    setErrorMessage("");
    navigate(getStepUrl("details"));
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToInterviewProcess = (e) => {
    e?.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage("Please enter an opportunity / job title");
      return;
    }
    if (!formData.location.trim()) {
      setErrorMessage("Please enter the primary job location");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Please provide a job description");
      return;
    }

    setErrorMessage("");
    navigate(getStepUrl("interview-process"));
  };

  // Update total rounds count (smartly preserving existing data!)
  const handleRoundsCountChange = (targetCount) => {
    const count = Math.max(1, Math.min(10, Number(targetCount) || 1));
    setInterviewRounds((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) {
        // Keep existing rounds from 0 to count - 1 (no data loss)
        return prev.slice(0, count).map((r, idx) => ({ ...r, order: idx + 1 }));
      }
      // Expand: preserve previous rounds, append new ones with order-appropriate defaults
      const added = [];
      for (let i = prev.length + 1; i <= count; i++) {
        added.push(getDefaultRoundForOrder(i));
      }
      return [...prev, ...added];
    });
    setErrorMessage("");
  };

  // Update a single round field
  const handleRoundFieldChange = (index, field, value) => {
    setInterviewRounds((prev) =>
      prev.map((round, idx) =>
        idx === index ? { ...round, [field]: value } : round
      )
    );
    setErrorMessage("");
  };

  // Apply a template preset to a specific round
  const applyPresetToRound = (index, template) => {
    setInterviewRounds((prev) =>
      prev.map((round, idx) =>
        idx === index
          ? {
              ...round,
              name: template.name,
              type: template.type,
              description: template.desc || round.description,
            }
          : round
      )
    );
  };

  // Reorder rounds
  const moveRound = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= interviewRounds.length) return;

    setInterviewRounds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((r, idx) => ({ ...r, order: idx + 1 }));
    });
  };

  // Remove individual round
  const removeRound = (index) => {
    if (interviewRounds.length <= 1) {
      setErrorMessage("At least 1 interview round is required.");
      return;
    }
    setInterviewRounds((prev) =>
      prev.filter((_, idx) => idx !== index).map((r, idx) => ({ ...r, order: idx + 1 }))
    );
  };

  // Step 2 Validation & Proceed to Step 3
  const handleProceedToReview = () => {
    // Validate each round has a non-empty name
    for (let i = 0; i < interviewRounds.length; i++) {
      if (!interviewRounds[i].name || !interviewRounds[i].name.trim()) {
        setErrorMessage(`Please provide a name for Round ${i + 1}`);
        return;
      }
    }
    setErrorMessage("");
    navigate(getStepUrl("review"));
  };

  // Final Submission (Create or Update Job)
  const handlePublishJob = async () => {
    try {
      setSubmitting(true);
      setErrorMessage("");

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        department: formData.department,
        employmentType: formData.employmentType,
        workMode: formData.workMode,
        location: formData.location.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        isPaid: formData.isPaid,
        hasJobOffer: formData.hasJobOffer,
        isInternational: formData.isInternational,
        salaryRange: {
          min: Number(formData.salaryMin) || 0,
          max: Number(formData.salaryMax) || 0,
          currency: formData.currency,
          isNegotiable: !formData.salaryMin && !formData.salaryMax,
        },
        experience: {
          level: formData.experienceLevel,
          minYears: Number(formData.minYears) || 0,
          maxYears: Number(formData.maxYears) || 2,
        },
        education: formData.education,
        description: formData.description.trim(),
        responsibilities: formData.responsibilities
          ? formData.responsibilities.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        requiredSkills: formData.requiredSkills
          ? formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        preferredSkills: formData.preferredSkills
          ? formData.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        bonusSkills: formData.bonusSkills
          ? formData.bonusSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        openings: Number(formData.openings) || 1,
        deadline: formData.deadline || null,
        status: formData.status,
        interviewRounds: interviewRounds.map((r, idx) => ({
          order: idx + 1,
          name: r.name.trim(),
          type: r.type,
          description: (r.description || "").trim(),
          isMandatory: r.isMandatory !== false,
        })),
      };

      let res;
      if (isEditMode && jobId) {
        res = await jobService.updateJob(jobId, payload);
      } else {
        res = await jobService.createJob(payload);
      }

      if (res?.success) {
        // Clear sessionStorage draft
        try {
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          // ignore
        }

        setSuccessToast(
          isEditMode
            ? "Job & interview rounds updated successfully!"
            : "Job opportunity & interview process published successfully!"
        );

        setTimeout(() => {
          navigate("/employer/dashboard");
        }, 1200);
      } else {
        setErrorMessage(res?.message || "Failed to save job");
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "An unexpected error occurred while saving the job."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <JourneyLoader
          message="Loading Opportunity Configuration"
          detail="Preparing job details & interview rounds..."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/employer/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {isEditMode ? "Edit Job" : "New Opportunity"}
            </span>
            <p className="text-xs font-extrabold text-slate-900">
              {formData.title || "Untitled Job"}
            </p>
          </div>
        </div>

        {/* Global Alert Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-slide-in-top">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Multi-Step Flow Indicator */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={goToDetails}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl text-left transition border ${
                currentStep === "details"
                  ? "bg-amber-50/80 border-[#f59e0b] shadow-2xs"
                  : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  currentStep === "details"
                    ? "bg-[#f59e0b] text-white shadow-xs"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                1
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Job Details</p>
                <p className="text-[10px] text-slate-500 truncate">Role, location & pay</p>
              </div>
            </button>

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => {
                if (!formData.title.trim()) {
                  setErrorMessage("Please complete Job Details first.");
                } else {
                  setErrorMessage("");
                  navigate(getStepUrl("interview-process"));
                }
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl text-left transition border ${
                currentStep === "interview-process"
                  ? "bg-amber-50/80 border-[#f59e0b] shadow-2xs"
                  : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  currentStep === "interview-process"
                    ? "bg-[#f59e0b] text-white shadow-xs"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                2
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Interview Process</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {interviewRounds.length} round{interviewRounds.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>

            {/* Step 3 Pill */}
            <button
              type="button"
              onClick={() => {
                if (!formData.title.trim()) {
                  setErrorMessage("Please complete Job Details first.");
                  return;
                }
                handleProceedToReview();
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl text-left transition border ${
                currentStep === "review"
                  ? "bg-amber-50/80 border-[#f59e0b] shadow-2xs"
                  : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  currentStep === "review"
                    ? "bg-[#f59e0b] text-white shadow-xs"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                3
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Review & Publish</p>
                <p className="text-[10px] text-slate-500 truncate">Confirm & launch</p>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: JOB DETAILS FORM                                                  */}
        {/* ========================================================================= */}
        {currentStep === "details" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="px-2.5 py-1 rounded-lg bg-amber-100/70 text-[#92400e] text-[11px] font-extrabold uppercase tracking-wider">
                Step 1 of 3
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {isEditMode ? "Edit Job Details" : "Specify Job & Opportunity Details"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide the core vacancy information before defining the interview rounds in Step 2.
              </p>
            </div>

            <form onSubmit={handleProceedToInterviewProcess} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Job / Opportunity Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Senior Frontend Engineer / Associate Product Manager"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15 transition"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Domain / Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sub-Category / Specialization
                  </label>
                  <input
                    type="text"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleFormChange}
                    placeholder="e.g. React & TypeScript"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Employment Type
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleFormChange}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    <option value="Full-time">Full-time Job</option>
                    <option value="Internship">Internship</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>

                {/* Work Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Work Arrangement
                  </label>
                  <select
                    name="workMode"
                    value={formData.workMode}
                    onChange={handleFormChange}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    <option value="Remote">Remote (Work From Home)</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="Bangalore, Mumbai, Delhi..."
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                    required
                  />
                </div>

                {/* Full Location String */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Location Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Bangalore, Karnataka (Hybrid)"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                    required
                  />
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Min Compensation (₹ / year)
                  </label>
                  <input
                    type="number"
                    name="salaryMin"
                    value={formData.salaryMin}
                    onChange={handleFormChange}
                    placeholder="600000"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Max Compensation (₹ / year)
                  </label>
                  <input
                    type="number"
                    name="salaryMax"
                    value={formData.salaryMax}
                    onChange={handleFormChange}
                    placeholder="1200000"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                {/* Checkbox badges */}
                <div className="sm:col-span-2 flex items-center gap-6 py-1 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="isPaid"
                      checked={formData.isPaid}
                      onChange={handleFormChange}
                      className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                    />
                    <span>💰 Competitive Pay / Paid</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="hasJobOffer"
                      checked={formData.hasJobOffer}
                      onChange={handleFormChange}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>🎯 Full-Time Offer Potential</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="isInternational"
                      checked={formData.isInternational}
                      onChange={handleFormChange}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>🌍 International Eligible</span>
                  </label>
                </div>

                {/* Required Skills */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    name="requiredSkills"
                    value={formData.requiredSkills}
                    onChange={handleFormChange}
                    placeholder="React, TypeScript, Node.js, Next.js, Tailwind CSS"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                {/* Openings & Deadline */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Open Vacancies
                  </label>
                  <input
                    type="number"
                    name="openings"
                    min={1}
                    value={formData.openings}
                    onChange={handleFormChange}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleFormChange}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                {/* Job Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Opportunity Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Detailed overview of the team, role impact, responsibilities, and expected outcomes..."
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs font-medium outline-none focus:border-[#f59e0b] resize-y"
                    required
                  />
                </div>

                {/* Responsibilities */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Key Responsibilities (One per line)
                  </label>
                  <textarea
                    rows={3}
                    name="responsibilities"
                    value={formData.responsibilities}
                    onChange={handleFormChange}
                    placeholder="Develop scalable frontend features&#10;Collaborate with product designers&#10;Maintain unit and integration tests"
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs font-medium outline-none focus:border-[#f59e0b] resize-y"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/employer/dashboard"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-2"
                >
                  <span>Continue to Interview Process</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: INTERVIEW PROCESS CONFIGURATION (SEPARATE NEW PAGE!)             */}
        {/* ========================================================================= */}
        {currentStep === "interview-process" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100/70 text-[#92400e] text-[11px] font-extrabold uppercase tracking-wider">
                    Step 2 of 3 · Selection Architecture
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
                    Interview Process & Selection Rounds
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Define the rounds candidates must complete for <span className="font-semibold text-slate-700 font-mono">"{formData.title || "this position"}"</span>. Candidates will advance step-by-step through these configured rounds.
                  </p>
                </div>

                {/* Back to Step 1 Button */}
                <button
                  type="button"
                  onClick={goToDetails}
                  className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>

              {/* Number of Rounds Selector Section */}
              <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <label className="text-sm font-extrabold text-slate-900 block">
                      How many interview rounds do you want for this job?
                    </label>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Minimum 1 round. Easily scale up or down—existing round details are preserved.
                    </p>
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-slate-300 rounded-2xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleRoundsCountChange(interviewRounds.length - 1)}
                        disabled={interviewRounds.length <= 1}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition font-bold"
                        title="Decrease rounds"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="px-4 py-1 text-center min-w-[3.5rem]">
                        <span className="text-base font-extrabold text-slate-900">
                          {interviewRounds.length}
                        </span>
                        <span className="text-[10px] block text-slate-600 font-bold uppercase -mt-0.5">
                          {interviewRounds.length === 1 ? "Round" : "Rounds"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRoundsCountChange(interviewRounds.length + 1)}
                        disabled={interviewRounds.length >= 8}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition font-bold"
                        title="Increase rounds"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleRoundsCountChange(num)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                            interviewRounds.length === num
                              ? "bg-[#f59e0b] border-[#f59e0b] text-white shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Round Cards List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Configured Rounds Sequence ({interviewRounds.length})
                </h3>
                <span className="text-[11px] text-slate-600">
                  Drag or use arrows to reorder stages
                </span>
              </div>

              {interviewRounds.map((round, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition space-y-4 relative group"
                >
                  {/* Round Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {round.name || `Round ${idx + 1}`}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-600">
                          Order #{round.order || idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: Move Up/Down, Remove */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveRound(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition"
                        title="Move round up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRound(idx, 1)}
                        disabled={idx === interviewRounds.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition"
                        title="Move round down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {interviewRounds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRound(idx)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition ml-1"
                          title="Remove this round"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fast Template Quick-Pick Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Quick Suggestions (click to populate):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_ROUND_TEMPLATES.map((tmpl, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => applyPresetToRound(idx, tmpl)}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-[#92400e] text-[11px] font-semibold border border-slate-200/80 hover:border-amber-300 transition"
                        >
                          + {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form fields for this round */}
                  <div className="grid sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Round Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Round Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={round.name}
                        onChange={(e) => handleRoundFieldChange(idx, "name", e.target.value)}
                        placeholder="e.g. Technical Interview / HR Round"
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                        required
                      />
                    </div>

                    {/* Round Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Round Evaluation Type
                      </label>
                      <select
                        value={round.type}
                        onChange={(e) => handleRoundFieldChange(idx, "type", e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-[#f59e0b]"
                      >
                        {ROUND_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>
                            {rt.icon} {rt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description / Instructions */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Instructions / Topics to Evaluate (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={round.description}
                        onChange={(e) => handleRoundFieldChange(idx, "description", e.target.value)}
                        placeholder="e.g. DSA, system design, architectural trade-offs, and communication clarity."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b] resize-none"
                      />
                    </div>

                    {/* Mandatory Toggle */}
                    <div className="sm:col-span-2 pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={round.isMandatory !== false}
                          onChange={(e) => handleRoundFieldChange(idx, "isMandatory", e.target.checked)}
                          className="w-4 h-4 rounded text-[#f59e0b] focus:ring-[#f59e0b]"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Mandatory Stage (Candidate must pass this round to proceed)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <button
                type="button"
                onClick={goToDetails}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Job Details</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToReview}
                className="px-6 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-2"
              >
                <span>Continue to Review Job</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: REVIEW & PUBLISH                                                 */}
        {/* ========================================================================= */}
        {currentStep === "review" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider">
                Step 3 of 3 · Final Review
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Review Opportunity & Interview Process
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all job parameters and the structured candidate interview timeline before publishing.
              </p>
            </div>

            {/* Summary Block 1: Job Details */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#f59e0b]" />
                  <h3 className="text-sm font-bold text-slate-900">Job Information</h3>
                </div>
                <button
                  type="button"
                  onClick={goToDetails}
                  className="text-xs font-bold text-[#f59e0b] hover:underline"
                >
                  Edit Details
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Title</span>
                  <span className="font-bold text-slate-900">{formData.title}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Category / Domain</span>
                  <span className="font-bold text-slate-900">{formData.category} ({formData.subCategory})</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Work Arrangement</span>
                  <span className="font-bold text-slate-900">{formData.workMode} · {formData.employmentType}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Location</span>
                  <span className="font-bold text-slate-900">{formData.location}</span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Compensation Range</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(formData.salaryMin || 0).toLocaleString()} – ₹{Number(formData.salaryMax || 0).toLocaleString()} / yr
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block text-[11px] font-semibold">Vacancies</span>
                  <span className="font-bold text-slate-900">{formData.openings} Openings</span>
                </div>
              </div>

              {formData.requiredSkills && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-600 block text-[11px] font-semibold mb-1.5">Required Skills:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {formData.requiredSkills.split(",").map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-50 text-[#92400e] text-[11px] font-semibold border border-amber-200/60"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.description && (
                <div className="pt-2">
                  <span className="text-slate-600 block text-[11px] font-semibold mb-1">Description:</span>
                  <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>

            {/* Summary Block 2: Interview Process Timeline */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#f59e0b]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Interview Process ({interviewRounds.length} Rounds)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(getStepUrl("interview-process"))}
                  className="text-xs font-bold text-[#f59e0b] hover:underline"
                >
                  Edit Rounds
                </button>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                {interviewRounds.map((round, idx) => {
                  const typeObj = ROUND_TYPES.find((t) => t.value === round.type) || {
                    label: round.type,
                    icon: "🎯",
                  };
                  return (
                    <div key={idx} className="flex items-start gap-4 relative pl-1">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white shadow-2xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-xs font-extrabold text-slate-900">
                            {round.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10.5px] font-bold text-slate-700">
                              {typeObj.icon} {typeObj.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                                round.isMandatory !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {round.isMandatory !== false ? "Mandatory" : "Optional"}
                            </span>
                          </div>
                        </div>
                        {round.description && (
                          <p className="text-xs text-slate-500 mt-1.5">
                            {round.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Final Action Bar */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(getStepUrl("interview-process"))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Interview Process</span>
              </button>

              <button
                type="button"
                onClick={handlePublishJob}
                disabled={submitting}
                className="px-7 py-3 rounded-2xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>{isEditMode ? "Updating Job..." : "Publishing Job..."}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEditMode ? "Save Changes & Update Job" : "Publish Job Opportunity"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
