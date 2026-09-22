// client/src/pages/employer/JobVisibilityPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Briefcase,
  Building2,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Eye,
  Sliders,
  Users,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
} from "lucide-react";
import {
  createJobWithVisibility,
  getEmployerJobsWithVisibility,
  configureJobVisibility,
} from "../../services/jobVisibilityService";
import EmployerNavbar from "../../components/employer/EmployerNavbar";

const COMMON_SKILLS = [
  "React",
  "JavaScript",
  "Node.js",
  "Python",
  "SQL",
  "TypeScript",
  "HTML",
  "CSS",
  "Java",
  "C++",
  "MongoDB",
  "Express",
  "Git",
  "Tailwind CSS",
  "AWS",
  "Docker",
];

const COMMON_DEGREES = ["B.Tech", "BCA", "MCA", "M.Tech", "B.Sc Computer Science", "Any Graduate"];
const COMMON_BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Data Science / AI",
  "Any Branch",
];
const COMMON_YEARS = [2024, 2025, 2026, 2027, 2028];

export default function JobVisibilityPage() {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'matrix'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Edit modal state
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Form State for creating a new job with visibility
  const [form, setForm] = useState({
    title: "",
    department: "Engineering",
    employmentType: "Full-time",
    workMode: "Hybrid",
    location: "Bangalore",
    salaryRange: { min: 400000, max: 800000, currency: "INR", isNegotiable: false },
    experience: { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
    education: "B.Tech / BCA / MCA",
    description: "",
    responsibilities: "",
    openings: 2,
    // Visibility
    hiringScope: "On-Campus", // "On-Campus" | "Open / Off-Campus"
    targetInstitution: "Geeta University",
    allowedInstitutions: ["Geeta University"],
    requiredSkills: ["React", "JavaScript", "HTML", "CSS"],
    preferredSkills: ["Node.js", "Git"],
    eligibilityCriteria: {
      degrees: ["B.Tech", "BCA", "MCA"],
      branches: ["Computer Science & Engineering", "Information Technology"],
      graduationYears: [2025, 2026],
      minCgpa: 6.5,
      experienceLevel: "Fresher / Entry-Level",
      minExperienceYears: 0,
      maxExperienceYears: 2,
      additionalNotes: "",
    },
  });

  const [customSkillInput, setCustomSkillInput] = useState("");

  useEffect(() => {
    fetchJobsList();
  }, []);

  const fetchJobsList = async () => {
    try {
      setFetchingJobs(true);
      const res = await getEmployerJobsWithVisibility();
      if (res.success && Array.isArray(res.jobs)) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setFetchingJobs(false);
    }
  };

  const handleAddSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!form.requiredSkills.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, trimmed],
      }));
    }
    setCustomSkillInput("");
  };

  const handleRemoveSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skill),
    }));
  };

  const toggleDegree = (deg) => {
    setForm((prev) => {
      const exists = prev.eligibilityCriteria.degrees.includes(deg);
      return {
        ...prev,
        eligibilityCriteria: {
          ...prev.eligibilityCriteria,
          degrees: exists
            ? prev.eligibilityCriteria.degrees.filter((d) => d !== deg)
            : [...prev.eligibilityCriteria.degrees, deg],
        },
      };
    });
  };

  const toggleBranch = (branch) => {
    setForm((prev) => {
      const exists = prev.eligibilityCriteria.branches.includes(branch);
      return {
        ...prev,
        eligibilityCriteria: {
          ...prev.eligibilityCriteria,
          branches: exists
            ? prev.eligibilityCriteria.branches.filter((b) => b !== branch)
            : [...prev.eligibilityCriteria.branches, branch],
        },
      };
    });
  };

  const toggleYear = (year) => {
    setForm((prev) => {
      const exists = prev.eligibilityCriteria.graduationYears.includes(year);
      return {
        ...prev,
        eligibilityCriteria: {
          ...prev.eligibilityCriteria,
          graduationYears: exists
            ? prev.eligibilityCriteria.graduationYears.filter((y) => y !== year)
            : [...prev.eligibilityCriteria.graduationYears, year],
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const payload = {
        title: form.title,
        department: form.department,
        employmentType: form.employmentType,
        workMode: form.workMode,
        location: form.location,
        salaryRange: form.salaryRange,
        experience: form.experience,
        education: form.education,
        description: form.description,
        responsibilities: form.responsibilities
          ? form.responsibilities.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        openings: Number(form.openings) || 1,
        // Visibility
        hiringScope: form.hiringScope,
        targetInstitution: form.targetInstitution,
        allowedInstitutions: form.hiringScope === "On-Campus" ? [form.targetInstitution] : [],
        requiredSkills: form.requiredSkills,
        preferredSkills: form.preferredSkills,
        eligibilityCriteria: form.eligibilityCriteria,
      };

      const res = await createJobWithVisibility(payload);

      if (res.success) {
        setSuccessMessage("Job posted with automatic visibility & eligibility rules successfully!");
        setForm((p) => ({
          ...p,
          title: "",
          description: "",
          responsibilities: "",
        }));
        await fetchJobsList();
        setActiveTab("matrix");
      } else {
        setErrorMessage(res.message || "Failed to create job.");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to create job.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    const cfg = job.visibilityConfig || {};
    setEditForm({
      hiringScope: cfg.hiringScope || "On-Campus",
      targetInstitution: cfg.targetInstitution || "Geeta University",
      requiredSkills: cfg.requiredSkills || job.requiredSkills || [],
      eligibilityCriteria: {
        degrees: cfg.eligibilityCriteria?.degrees || [],
        branches: cfg.eligibilityCriteria?.branches || [],
        graduationYears: cfg.eligibilityCriteria?.graduationYears || [],
        minCgpa: cfg.eligibilityCriteria?.minCgpa || 0,
        experienceLevel: cfg.eligibilityCriteria?.experienceLevel || "Fresher / Entry-Level",
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingJob || !editForm) return;
    try {
      const res = await configureJobVisibility(editingJob._id, editForm);
      if (res.success) {
        setSuccessMessage("Job visibility criteria updated successfully!");
        setEditingJob(null);
        setEditForm(null);
        fetchJobsList();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to update configuration.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployerNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Automatic Visibility & Student Eligibility Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Campus & Off-Campus Job Visibility Manager
              </h1>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl">
                Configure institution connections, hiring scope, required skills, and academic criteria.
                CareerConnect automatically filters and shows jobs only to students who meet your exact requirements.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === "create"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Plus className="w-4 h-4" />
                Post Job with Visibility
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("matrix")}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === "matrix"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Sliders className="w-4 h-4" />
                Visibility Matrix ({jobs.length})
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage("")} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: CREATE JOB WITH VISIBILITY CONFIGURATION
        ========================================================================= */}
        {activeTab === "create" && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Form Inputs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Basic Information */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  1. Job Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frontend Developer Intern"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Department
                      </label>
                      <input
                        type="text"
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Employment Type
                      </label>
                      <select
                        value={form.employmentType}
                        onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Work Mode
                      </label>
                      <select
                        value={form.workMode}
                        onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="On-site">On-site</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Location *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bangalore or Panipat Campus"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Openings
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.openings}
                        onChange={(e) => setForm({ ...form, openings: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Job Description *
                    </label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Describe the role, responsibilities, and team expectations..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Hiring Scope & Target Institution */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  2. Hiring Scope & Institution Connection
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* On-Campus Option */}
                    <div
                      onClick={() => setForm({ ...form, hiringScope: "On-Campus" })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        form.hiringScope === "On-Campus"
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">On-Campus Drive</span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            form.hiringScope === "On-Campus"
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-slate-300"
                          }`}
                        >
                          {form.hiringScope === "On-Campus" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Only students enrolled at the connected university (e.g. Geeta University) can see and apply.
                        Hidden from other colleges.
                      </p>
                    </div>

                    {/* Open / Off-Campus Option */}
                    <div
                      onClick={() => setForm({ ...form, hiringScope: "Open / Off-Campus" })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        form.hiringScope === "Open / Off-Campus"
                          ? "border-blue-600 bg-blue-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">Open / Off-Campus</span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            form.hiringScope === "Open / Off-Campus"
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300"
                          }`}
                        >
                          {form.hiringScope === "Open / Off-Campus" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Visible to eligible students across any registered institution who meet your academic & skill criteria.
                      </p>
                    </div>
                  </div>

                  {form.hiringScope === "On-Campus" && (
                    <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-900">
                        Connected Institution / University *
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          required
                          value={form.targetInstitution}
                          onChange={(e) => setForm({ ...form, targetInstitution: e.target.value })}
                          placeholder="e.g. Geeta University"
                          className="flex-1 h-11 px-4 rounded-xl border border-indigo-200 text-sm font-medium text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        />
                        <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-semibold">
                          Partner Campus
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700">
                        🔒 Backend Security Enforced: Students from other universities will be rejected by the server if they attempt to view or apply.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Required Skills Configuration */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  3. Skill Requirements (Live Matching)
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Students will be evaluated against their verified CareerConnect profile skills.
                </p>

                {/* Selected Skills Chips */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[44px] p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {form.requiredSkills.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No required skills selected yet.</span>
                  ) : (
                    form.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:bg-blue-700 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick Add Presets */}
                <div className="mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                    Quick Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_SKILLS.map((skill) => {
                      const isSelected = form.requiredSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => (isSelected ? handleRemoveSkill(skill) : handleAddSkill(skill))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                          }`}
                        >
                          {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Skill Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom skill (e.g. PyTorch, Rust, Solidity)..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill(customSkillInput);
                      }
                    }}
                    className="flex-1 h-10 px-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(customSkillInput)}
                    className="h-10 px-4 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
                  >
                    Add Skill
                  </button>
                </div>
              </div>

              {/* Step 4: Academic Eligibility Criteria */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                  4. Academic & Batch Eligibility
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Specify degrees, branches, and graduation batches. Students outside this criteria will not be eligible.
                </p>

                <div className="space-y-5">
                  {/* Degrees */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Eligible Degrees (Multi-select)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_DEGREES.map((deg) => {
                        const checked = form.eligibilityCriteria.degrees.includes(deg);
                        return (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => toggleDegree(deg)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              checked
                                ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {checked ? "✓ " : ""}{deg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Branches */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Eligible Branches / Streams
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_BRANCHES.map((branch) => {
                        const checked = form.eligibilityCriteria.branches.includes(branch);
                        return (
                          <button
                            key={branch}
                            type="button"
                            onClick={() => toggleBranch(branch)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              checked
                                ? "bg-indigo-50 border-indigo-500 text-indigo-800 font-semibold"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {checked ? "✓ " : ""}{branch}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Graduation Years */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                        Eligible Passing Batches
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_YEARS.map((yr) => {
                          const checked = form.eligibilityCriteria.graduationYears.includes(yr);
                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => toggleYear(yr)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                checked
                                  ? "bg-blue-50 border-blue-500 text-blue-800 font-semibold"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              Class of {yr}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                        Experience Level
                      </label>
                      <select
                        value={form.eligibilityCriteria.experienceLevel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            eligibilityCriteria: {
                              ...form.eligibilityCriteria,
                              experienceLevel: e.target.value,
                            },
                          })
                        }
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="Fresher / Entry-Level">Fresher / Entry-Level</option>
                        <option value="Junior (1-3 yrs)">Junior (1-3 yrs)</option>
                        <option value="Mid-Level (3-5 yrs)">Mid-Level (3-5 yrs)</option>
                        <option value="Any">Any Experience</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Live Visibility Preview & Submission */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md sticky top-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Live Visibility Preview
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Real-time
                  </span>
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  {/* Scope Badge */}
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Target Audience</span>
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs ${
                        form.hiringScope === "On-Campus"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-blue-100 text-blue-900 border border-blue-300"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {form.hiringScope === "On-Campus"
                        ? `🏛️ On-Campus: ${form.targetInstitution}`
                        : "🌐 Open / Off-Campus Pool"}
                    </div>
                  </div>

                  {/* Institution Restriction */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Who Can See This Job?
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {form.hiringScope === "On-Campus"
                        ? `Only students verified from ${form.targetInstitution} who satisfy the required skills and degrees.`
                        : "All students registered on CareerConnect who meet the required skills and academic profile."}
                    </p>
                  </div>

                  {/* Required Skills summary */}
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Mandatory Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {form.requiredSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Academic criteria summary */}
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Academic Filters</span>
                    <p className="text-xs text-slate-700">
                      Degrees: {form.eligibilityCriteria.degrees.join(", ") || "Any"}
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Batches: {form.eligibilityCriteria.graduationYears.join(", ") || "Any"}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Publishing Job...</span>
                      ) : (
                        <>
                          <span>Publish with Automatic Eligibility</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400 mt-2">
                      Zero disruption: seamlessly connects with ATS Pipeline and applications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* =========================================================================
            TAB 2: VISIBILITY MATRIX (LISTINGS & LIVE CONFIGURATIONS)
        ========================================================================= */}
        {activeTab === "matrix" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configured Job Listings</h2>
                <p className="text-slate-500 text-sm">
                  Review hiring scope, target institutions, and eligibility filters for each job.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Job Listing
              </button>
            </div>

            {fetchingJobs ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                Loading job visibility matrix...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No jobs configured yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Post your first job with automatic institution and skill-based eligibility rules.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Post New Job
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => {
                  const cfg = job.visibilityConfig || {};
                  const isCampus = cfg.hiringScope === "On-Campus" || (!cfg.hiringScope && job.source === "GU Drives");
                  const inst = cfg.targetInstitution || "Geeta University";
                  const reqSkills = cfg.requiredSkills || job.requiredSkills || [];
                  const degrees = cfg.eligibilityCriteria?.degrees || [];
                  const years = cfg.eligibilityCriteria?.graduationYears || [];

                  return (
                    <div
                      key={job._id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Scope Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isCampus
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            {isCampus ? `On-Campus: ${inst}` : "Open Off-Campus"}
                          </span>

                          <span className="text-xs font-medium text-slate-400">
                            {job.status || "Published"}
                          </span>
                        </div>

                        {/* Title & Department */}
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {job.department || "Engineering"} • {job.workMode} • {job.location}
                        </p>

                        {/* Required Skills */}
                        <div className="mt-4">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Required Skills:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {reqSkills.length > 0 ? (
                              reqSkills.slice(0, 4).map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">None specified</span>
                            )}
                            {reqSkills.length > 4 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs">
                                +{reqSkills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Academic Eligibility */}
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-700">Eligible Degrees:</span>{" "}
                            {degrees.length > 0 ? degrees.join(", ") : "Any Graduate"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Passing Batches:</span>{" "}
                            {years.length > 0 ? years.join(", ") : "Any Batch"}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(job)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Edit Visibility Rules
                        </button>

                        <span className="text-xs text-slate-400">
                          {job.applicantsCount || 0} applicants
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            QUICK EDIT VISIBILITY MODAL
        ========================================================================= */}
        {editingJob && editForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-scale-up">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Configure Job Visibility</h3>
                  <p className="text-xs text-slate-500">{editingJob.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJob(null);
                    setEditForm(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Hiring Scope
                  </label>
                  <select
                    value={editForm.hiringScope}
                    onChange={(e) => setEditForm({ ...editForm, hiringScope: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="On-Campus">On-Campus</option>
                    <option value="Open / Off-Campus">Open / Off-Campus</option>
                  </select>
                </div>

                {editForm.hiringScope === "On-Campus" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Connected University
                    </label>
                    <input
                      type="text"
                      value={editForm.targetInstitution}
                      onChange={(e) => setEditForm({ ...editForm, targetInstitution: e.target.value })}
                      placeholder="e.g. Geeta University"
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.requiredSkills.join(", ")}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        requiredSkills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="React, JavaScript, Node.js"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingJob(null);
                      setEditForm(null);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
