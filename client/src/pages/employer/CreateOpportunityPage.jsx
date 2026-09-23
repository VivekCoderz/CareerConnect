import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createJob, getJobById, updateJob } from "../../services/jobService";
import { create as createInternship, getById as getInternshipById, update as updateInternship } from "../../services/internshipService";
import EmployerNavbar from "../../components/employer/EmployerNavbar";

const STAGE_TYPES = [
  "Resume Screening",
  "Online Test",
  "Coding Test",
  "Aptitude Test",
  "Technical Interview",
  "HR Interview",
  "Group Discussion",
  "Final Interview",
  "Custom",
];

const PRESETS = {
  standard: [
    {
      name: "Resume Screening",
      type: "Resume Screening",
      description: "Initial profile and resume qualification check",
      configuration: { instructions: "Review applicant resume, projects, and educational credentials", interviewType: "Online", durationMinutes: 30 },
    },
    {
      name: "Technical Interview",
      type: "Technical Interview",
      description: "Live technical problem solving and skills evaluation",
      configuration: { interviewType: "Online", durationMinutes: 45, instructions: "Core CS concepts, problem solving, and system questions" },
    },
    {
      name: "HR Interview",
      type: "HR Interview",
      description: "Culture fit, background verification, and hiring discussion",
      configuration: { interviewType: "Online", durationMinutes: 30, instructions: "Behavioral interview and compensation alignment" },
    },
  ],
  tech: [
    {
      name: "Resume Screening",
      type: "Resume Screening",
      description: "Filter candidates by tech stack and verified portfolio",
      configuration: { instructions: "Review resume and GitHub/Portfolio projects", interviewType: "Online", durationMinutes: 30 },
    },
    {
      name: "Coding Assessment",
      type: "Coding Test",
      description: "Online timed data structures and algorithmic challenge",
      configuration: { testLink: "", durationMinutes: 60, passingCriteria: "Score >= 75%", instructions: "Complete algorithmic tasks within the allocated time" },
    },
    {
      name: "Technical Deep-Dive",
      type: "Technical Interview",
      description: "System architecture, live coding, and hands-on problem solving",
      configuration: { interviewType: "Online", durationMinutes: 60, instructions: "Live coding with engineering lead" },
    },
    {
      name: "Final Leadership & HR",
      type: "HR Interview",
      description: "Cultural values, executive alignment, and compensation",
      configuration: { interviewType: "Online", durationMinutes: 30, instructions: "Team values, role expectations, and offer terms" },
    },
  ],
  fastTrack: [
    {
      name: "Resume Screening",
      type: "Resume Screening",
      description: "Fast-track resume and credentials screening",
      configuration: { instructions: "Screen candidate profile and experience", interviewType: "Online", durationMinutes: 20 },
    },
    {
      name: "Comprehensive Interview",
      type: "Technical Interview",
      description: "Combined technical assessment and cultural fit round",
      configuration: { interviewType: "Online", durationMinutes: 60, instructions: "Technical skills + cultural alignment" },
    },
  ],
  campus: [
    {
      name: "Application Screening",
      type: "Resume Screening",
      description: "Eligibility criteria, branch, and CGPA verification",
      configuration: { instructions: "Verify CGPA and graduation year", interviewType: "Online", durationMinutes: 15 },
    },
    {
      name: "Aptitude & Logical Test",
      type: "Aptitude Test",
      description: "Online quantitative aptitude, logical reasoning & English",
      configuration: { testLink: "", durationMinutes: 45, passingCriteria: "Cutoff >= 70%", instructions: "Timed MCQ test" },
    },
    {
      name: "Technical Assessment",
      type: "Technical Interview",
      description: "Fundamental programming and core discipline questions",
      configuration: { interviewType: "Online", durationMinutes: 45, instructions: "Live technical round" },
    },
    {
      name: "HR & Personal Interview",
      type: "HR Interview",
      description: "Communication, personality, and career aspirations",
      configuration: { interviewType: "Online", durationMinutes: 30, instructions: "Final interview and campus onboarding" },
    },
  ],
};

export default function CreateOpportunityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editJobId = searchParams.get("edit");
  const editInternshipId = searchParams.get("editInternship");
  const initialType = searchParams.get("type") === "internship" ? "Internship" : "Job";

  const [oppType, setOppType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [fetchingInitial, setFetchingInitial] = useState(Boolean(editJobId || editInternshipId));
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [stages, setStages] = useState(PRESETS.standard);
  const [expandedStageIdx, setExpandedStageIdx] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "Web Development",
    subCategory: "Full Stack Development",
    department: "Engineering",
    employmentType: "Full-time",
    workMode: "Hybrid",
    location: "Bangalore",
    city: "Bangalore",
    country: "India",
    isPaid: true,
    hasJobOffer: true,
    isInternational: false,
    salaryMin: "600000",
    salaryMax: "1200000",
    currency: "INR",
    isNegotiable: false,
    stipend: "₹20,000/month",
    duration: "3 months",
    experienceLevel: "Fresher / Entry-Level",
    minYears: 0,
    maxYears: 1,
    education: "B.Tech / BCA / MCA / Any Graduate",
    eligibility: "Open to recent graduates and final year students",
    description: "",
    responsibilities: "",
    requiredSkills: "React, Node.js, JavaScript, Tailwind CSS",
    preferredSkills: "TypeScript, MongoDB, Redux",
    bonusSkills: "Docker, AWS, Git",
    openings: 2,
    deadline: "",
    status: "Published",
  });

  // Pre-load if editing
  useEffect(() => {
    if (editJobId) {
      setOppType("Job");
      getJobById(editJobId)
        .then((res) => {
          if (res?.success && res.job) {
            const j = res.job;
            setFormData({
              title: j.title || "",
              category: j.category || "Web Development",
              subCategory: j.subCategory || "Full Stack Development",
              department: j.department || "Engineering",
              employmentType: j.employmentType || "Full-time",
              workMode: j.workMode || "Hybrid",
              location: j.location || "Bangalore",
              city: j.city || "Bangalore",
              country: j.country || "India",
              isPaid: j.isPaid !== false,
              hasJobOffer: Boolean(j.hasJobOffer),
              isInternational: Boolean(j.isInternational),
              salaryMin: j.salaryRange?.min || "",
              salaryMax: j.salaryRange?.max || "",
              currency: j.salaryRange?.currency || "INR",
              isNegotiable: Boolean(j.salaryRange?.isNegotiable),
              stipend: j.stipend || "",
              duration: j.duration || "",
              experienceLevel: j.experience?.level || "Fresher / Entry-Level",
              minYears: j.experience?.minYears ?? 0,
              maxYears: j.experience?.maxYears ?? 1,
              education: j.education || "",
              eligibility: j.eligibility || "",
              description: j.description || "",
              responsibilities: (j.responsibilities || []).join("\n"),
              requiredSkills: (j.requiredSkills || []).join(", "),
              preferredSkills: (j.preferredSkills || []).join(", "),
              bonusSkills: (j.bonusSkills || []).join(", "),
              openings: j.openings || 1,
              deadline: j.deadline ? j.deadline.split("T")[0] : "",
              status: j.status || "Published",
            });
            if (Array.isArray(j.recruitmentStages) && j.recruitmentStages.length > 0) {
              setStages(j.recruitmentStages.map(s => ({
                name: s.name,
                type: s.type || "Custom",
                description: s.description || "",
                configuration: {
                  interviewType: s.configuration?.interviewType || "Online",
                  durationMinutes: s.configuration?.durationMinutes || 45,
                  instructions: s.configuration?.instructions || "",
                  testLink: s.configuration?.testLink || "",
                  passingCriteria: s.configuration?.passingCriteria || "",
                  deadlineDays: s.configuration?.deadlineDays || 0,
                },
              })));
            }
          }
        })
        .catch((err) => setError(err.response?.data?.message || "Failed to load job"))
        .finally(() => setFetchingInitial(false));
    } else if (editInternshipId) {
      setOppType("Internship");
      getInternshipById(editInternshipId)
        .then((res) => {
          if (res?.success && (res.internship || res.data)) {
            const i = res.internship || res.data;
            setFormData({
              title: i.title || "",
              category: i.category || "Web Development",
              subCategory: i.subCategory || "Full Stack Development",
              department: i.department || "General",
              employmentType: "Internship",
              workMode: i.workMode || "Hybrid",
              location: i.location || "Bangalore",
              city: i.city || "Bangalore",
              country: i.country || "India",
              isPaid: i.isPaid !== false,
              hasJobOffer: Boolean(i.hasJobOffer),
              isInternational: Boolean(i.isInternational),
              salaryMin: "",
              salaryMax: "",
              currency: "INR",
              isNegotiable: false,
              stipend: i.stipend || "₹15,000/month",
              duration: i.duration || "3 months",
              experienceLevel: "Fresher / Entry-Level",
              minYears: 0,
              maxYears: 0,
              education: i.education || "Any Graduate",
              eligibility: i.eligibility || "",
              description: i.description || "",
              responsibilities: (i.responsibilities || []).join("\n"),
              requiredSkills: (i.requiredSkills || []).join(", "),
              preferredSkills: (i.preferredSkills || []).join(", "),
              bonusSkills: (i.bonusSkills || []).join(", "),
              openings: i.openings || 1,
              deadline: i.deadline ? i.deadline.split("T")[0] : "",
              status: i.status || "Published",
            });
            if (Array.isArray(i.recruitmentStages) && i.recruitmentStages.length > 0) {
              setStages(i.recruitmentStages);
            }
          }
        })
        .catch((err) => setError(err.response?.data?.message || "Failed to load internship"))
        .finally(() => setFetchingInitial(false));
    }
  }, [editJobId, editInternshipId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Stage Handlers
  const handleAddStage = (stageType = "Technical Interview") => {
    const newStage = {
      name: stageType === "Custom" ? "Custom Evaluation" : stageType,
      type: stageType,
      description: "",
      configuration: {
        interviewType: stageType.includes("Interview") ? "Online" : "Online",
        durationMinutes: 45,
        instructions: "",
        testLink: "",
        passingCriteria: "",
        deadlineDays: 0,
      },
    };
    setStages((prev) => [...prev, newStage]);
    setExpandedStageIdx(stages.length);
  };

  const handleRemoveStage = (idxToRemove) => {
    if (stages.length <= 1) {
      setError("Every opportunity must have at least one recruitment stage.");
      return;
    }
    setStages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    if (expandedStageIdx === idxToRemove) setExpandedStageIdx(null);
  };

  const handleMoveStage = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    setStages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    if (expandedStageIdx === idx) setExpandedStageIdx(targetIdx);
    else if (expandedStageIdx === targetIdx) setExpandedStageIdx(idx);
  };

  const handleUpdateStage = (idx, field, value) => {
    setStages((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (field.startsWith("configuration.")) {
          const configKey = field.split(".")[1];
          return {
            ...s,
            configuration: {
              ...s.configuration,
              [configKey]: value,
            },
          };
        }
        if (field === "type") {
          const wasDefault = s.name === s.type || s.name === "Custom Evaluation";
          return {
            ...s,
            type: value,
            name: wasDefault ? (value === "Custom" ? "Custom Evaluation" : value) : s.name,
          };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleApplyPreset = (key) => {
    if (PRESETS[key]) {
      setStages(PRESETS[key]);
      setExpandedStageIdx(null);
    }
  };

  const handleSubmit = async (targetStatus = formData.status) => {
    setError("");
    setSuccessMsg("");

    if (!formData.title.trim()) {
      setError("Please provide a title for this opportunity.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!formData.location.trim()) {
      setError("Please specify the location.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!formData.description.trim()) {
      setError("Please provide a role description.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (stages.length === 0) {
      setError("Please configure at least one recruitment stage.");
      return;
    }

    setLoading(true);

    try {
      const sanitizedStages = stages.map((s, idx) => ({
        name: (s.name || `Stage ${idx + 1}`).trim(),
        type: s.type || "Custom",
        order: idx,
        description: (s.description || "").trim(),
        configuration: {
          interviewType: s.configuration?.interviewType || "Online",
          durationMinutes: Number(s.configuration?.durationMinutes) || 45,
          instructions: (s.configuration?.instructions || "").trim(),
          testLink: (s.configuration?.testLink || "").trim(),
          passingCriteria: (s.configuration?.passingCriteria || "").trim(),
          deadlineDays: Number(s.configuration?.deadlineDays) || 0,
        },
      }));

      const parsedSkills = (str) =>
        str
          ? str
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const parsedLines = (str) =>
        str
          ? str
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      if (oppType === "Internship") {
        const payload = {
          title: formData.title.trim(),
          category: formData.category,
          subCategory: formData.subCategory,
          department: formData.department,
          workMode: formData.workMode,
          location: formData.location.trim(),
          city: formData.city.trim() || formData.location.trim(),
          country: formData.country.trim() || "India",
          isPaid: formData.isPaid,
          hasJobOffer: formData.hasJobOffer,
          isInternational: formData.isInternational,
          stipend: formData.isPaid ? (formData.stipend || "₹15,000/month") : "Unpaid",
          duration: formData.duration || "3 months",
          openings: Number(formData.openings) || 1,
          education: formData.education,
          eligibility: formData.eligibility,
          description: formData.description.trim(),
          responsibilities: parsedLines(formData.responsibilities),
          requiredSkills: parsedSkills(formData.requiredSkills),
          preferredSkills: parsedSkills(formData.preferredSkills),
          deadline: formData.deadline || null,
          status: targetStatus,
          recruitmentStages: sanitizedStages,
        };

        let res;
        if (editInternshipId) {
          res = await updateInternship(editInternshipId, payload);
        } else {
          res = await createInternship(payload);
        }

        if (res.success) {
          setSuccessMsg("Internship published successfully! Redirecting...");
          setTimeout(() => navigate("/employer/internships"), 1200);
        } else {
          setError(res.message || "Failed to save internship");
        }
      } else {
        const payload = {
          title: formData.title.trim(),
          category: formData.category,
          subCategory: formData.subCategory,
          department: formData.department,
          employmentType: formData.employmentType || "Full-time",
          workMode: formData.workMode,
          location: formData.location.trim(),
          city: formData.city.trim() || formData.location.trim(),
          country: formData.country.trim() || "India",
          isPaid: formData.isPaid,
          hasJobOffer: formData.hasJobOffer,
          isInternational: formData.isInternational,
          salaryRange: {
            min: Number(formData.salaryMin) || 0,
            max: Number(formData.salaryMax) || 0,
            currency: formData.currency || "INR",
            isNegotiable: Boolean(formData.isNegotiable),
          },
          experience: {
            level: formData.experienceLevel,
            minYears: Number(formData.minYears) || 0,
            maxYears: Number(formData.maxYears) || 1,
          },
          education: formData.education,
          eligibility: formData.eligibility,
          description: formData.description.trim(),
          responsibilities: parsedLines(formData.responsibilities),
          requiredSkills: parsedSkills(formData.requiredSkills),
          preferredSkills: parsedSkills(formData.preferredSkills),
          bonusSkills: parsedSkills(formData.bonusSkills),
          openings: Number(formData.openings) || 1,
          deadline: formData.deadline || null,
          status: targetStatus,
          recruitmentStages: sanitizedStages,
        };

        let res;
        if (editJobId) {
          res = await updateJob(editJobId, payload);
        } else {
          res = await createJob(payload);
        }

        if (res.success) {
          setSuccessMsg("Job opportunity created successfully! Redirecting...");
          setTimeout(() => navigate("/employer/dashboard"), 1200);
        } else {
          setError(res.message || "Failed to post job");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition";
  const labelClass = "block text-[11.5px] font-bold text-slate-700 uppercase tracking-wider mb-1.5";

  if (fetchingInitial) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading opportunity details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <EmployerNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Breadcrumb & Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/employer/dashboard" className="hover:text-amber-700 transition">
                Employer Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">
                {editJobId || editInternshipId ? "Edit Opportunity" : "Create New Opportunity"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {editJobId || editInternshipId ? "Edit Opportunity Listing" : "Post a New Job or Internship"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Full-page SaaS creation suite with employer-configurable recruitment stages
            </p>
          </div>

          {/* Quick Opportunity Type Toggle */}
          {!(editJobId || editInternshipId) && (
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setOppType("Job");
                  setFormData((p) => ({ ...p, employmentType: "Full-time" }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  oppType === "Job"
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>💼</span> Full-Time Job
              </button>
              <button
                type="button"
                onClick={() => {
                  setOppType("Internship");
                  setFormData((p) => ({ ...p, employmentType: "Internship" }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  oppType === "Internship"
                    ? "bg-[#f59e0b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🎓</span> Internship
              </button>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠️</span> {error}
            </span>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold text-sm">
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>🎉</span> {successMsg}
          </div>
        )}

        {/* Form Container */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("Published");
          }}
          className="space-y-6"
        >
          {/* Card 1: Basic Information */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-amber-50 text-[#92400e] font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Basic Opportunity Details
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {oppType === "Internship" ? "Internship Role Title *" : "Job Title *"}
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={oppType === "Internship" ? "e.g. Frontend Engineering Intern" : "e.g. Senior Full-Stack Engineer"}
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Domain / Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className={inputClass}>
                    <option>Web Development</option>
                    <option>Mobile App Development</option>
                    <option>Artificial Intelligence / ML</option>
                    <option>Data Science & Analytics</option>
                    <option>DevOps & Cloud Computing</option>
                    <option>Cybersecurity</option>
                    <option>UI/UX Design</option>
                    <option>Product Management</option>
                    <option>Business Development</option>
                    <option>General Engineering</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Specialization / Subcategory</label>
                  <input
                    type="text"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    placeholder="e.g. React & Node.js"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g. Product Engineering"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Work Arrangement & Location */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-amber-50 text-[#92400e] font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Work Mode & Location
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Employment Type</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {oppType === "Internship" ? (
                    <>
                      <option>Internship</option>
                      <option>Trainee</option>
                    </>
                  ) : (
                    <>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Freelance</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>Work Mode</label>
                <select name="workMode" value={formData.workMode} onChange={handleChange} className={inputClass}>
                  <option>Hybrid</option>
                  <option>Remote</option>
                  <option>On-site</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>City / Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Bangalore, Karnataka"
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 3: Compensation & Openings */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-amber-50 text-[#92400e] font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Compensation & Vacancies
              </h2>
            </div>

            {oppType === "Internship" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Monthly Stipend</label>
                  <input
                    type="text"
                    name="stipend"
                    value={formData.stipend}
                    onChange={handleChange}
                    placeholder="e.g. ₹20,000/month or Unpaid"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Internship Duration</label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 3 months / 6 months"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Openings & PPO Offer</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      name="openings"
                      min="1"
                      value={formData.openings}
                      onChange={handleChange}
                      className="w-24 h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="hasJobOffer"
                        checked={formData.hasJobOffer}
                        onChange={handleChange}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>PPO / Pre-Placement Offer</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Min Salary (₹ / Year)</label>
                  <input
                    type="number"
                    name="salaryMin"
                    value={formData.salaryMin}
                    onChange={handleChange}
                    placeholder="600000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Salary (₹ / Year)</label>
                  <input
                    type="number"
                    name="salaryMax"
                    value={formData.salaryMax}
                    onChange={handleChange}
                    placeholder="1200000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Openings</label>
                  <input
                    type="number"
                    name="openings"
                    min="1"
                    value={formData.openings}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Deadline Date</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Role Description & Skills */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-amber-50 text-[#92400e] font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Description, Responsibilities & Skills
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Role Overview & Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide an overview of the role, team, and day-to-day impact..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200/90 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Key Responsibilities (One per line)</label>
                <textarea
                  name="responsibilities"
                  rows={3}
                  value={formData.responsibilities}
                  onChange={handleChange}
                  placeholder="Design and deliver scalable web applications&#10;Collaborate with cross-functional product leads&#10;Write clean, maintainable unit-tested code"
                  className="w-full p-3.5 rounded-2xl border border-slate-200/90 text-xs font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    name="requiredSkills"
                    value={formData.requiredSkills}
                    onChange={handleChange}
                    placeholder="e.g. React, Node.js, SQL, REST APIs"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Preferred / Bonus Skills</label>
                  <input
                    type="text"
                    name="preferredSkills"
                    value={formData.preferredSkills}
                    onChange={handleChange}
                    placeholder="e.g. TypeScript, GraphQL, Docker"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: DYNAMIC RECRUITMENT STAGES CONFIGURATOR */}
          <div className="p-6 bg-white border-2 border-amber-200/80 rounded-3xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                    5
                  </span>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Dynamic Recruitment Stages & Pipeline
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Configure custom evaluation rounds. Applicants progress through these stages in real-time.
                </p>
              </div>

              {/* Preset Shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("standard")}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition"
                >
                  Standard 3-Round
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("tech")}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition"
                >
                  Tech 4-Round
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("fastTrack")}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition"
                >
                  Fast-Track 2-Round
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("campus")}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition"
                >
                  Campus 4-Round
                </button>
              </div>
            </div>

            {/* Configured Stages Stepper Preview */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <span>✓</span> Applied
                </div>
                <span className="text-slate-300 font-bold">→</span>

                {stages.map((stage, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        expandedStageIdx === idx
                          ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                          : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
                      }`}
                      onClick={() => setExpandedStageIdx(expandedStageIdx === idx ? null : idx)}
                    >
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        expandedStageIdx === idx ? "bg-white text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{stage.name || `Round ${idx + 1}`}</span>
                      <span className="text-[10px] opacity-75 font-normal">({stage.type})</span>
                    </div>
                    {idx < stages.length - 1 && <span className="text-slate-300 font-bold">→</span>}
                  </React.Fragment>
                ))}

                <span className="text-slate-300 font-bold">→</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                  <span>🏆</span> Final Decision
                </div>
              </div>
            </div>

            {/* Stages List & Accordion Configuration */}
            <div className="space-y-3">
              {stages.map((stage, idx) => {
                const isExpanded = expandedStageIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? "bg-white border-amber-300 shadow-xs"
                        : "bg-white border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    {/* Header bar of Stage */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-[#92400e] text-xs font-extrabold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{stage.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              {stage.type}
                            </span>
                          </div>
                          {stage.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{stage.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Stage Action Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, -1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                          title="Move stage earlier"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                          title="Move stage later"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedStageIdx(isExpanded ? null : idx)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700"
                        >
                          {isExpanded ? "Collapse" : "Configure"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove stage"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Detailed Stage Settings Form */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 animate-fade-in text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                          <div>
                            <label className={labelClass}>Stage Name</label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => handleUpdateStage(idx, "name", e.target.value)}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Stage Type</label>
                            <select
                              value={stage.type}
                              onChange={(e) => handleUpdateStage(idx, "type", e.target.value)}
                              className={inputClass}
                            >
                              {STAGE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Description / Objectives</label>
                          <input
                            type="text"
                            value={stage.description}
                            onChange={(e) => handleUpdateStage(idx, "description", e.target.value)}
                            placeholder="What does this round evaluate?"
                            className={inputClass}
                          />
                        </div>

                        {/* Interview vs Test specific fields */}
                        {stage.type.includes("Interview") || stage.type === "Group Discussion" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                            <div>
                              <label className={labelClass}>Interview Mode</label>
                              <select
                                value={stage.configuration?.interviewType || "Online"}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.interviewType", e.target.value)
                                }
                                className={inputClass}
                              >
                                <option>Online</option>
                                <option>Offline</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Standard Duration (Minutes)</label>
                              <input
                                type="number"
                                value={stage.configuration?.durationMinutes || 45}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.durationMinutes", e.target.value)
                                }
                                className={inputClass}
                              />
                            </div>
                          </div>
                        ) : ["Coding Test", "Online Test", "Aptitude Test"].includes(stage.type) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                            <div>
                              <label className={labelClass}>Test Platform / Link (Optional)</label>
                              <input
                                type="text"
                                value={stage.configuration?.testLink || ""}
                                onChange={(e) => handleUpdateStage(idx, "configuration.testLink", e.target.value)}
                                placeholder="https://assessment.platform.com/..."
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Passing Criteria</label>
                              <input
                                type="text"
                                value={stage.configuration?.passingCriteria || ""}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.passingCriteria", e.target.value)
                                }
                                placeholder="e.g. Cutoff >= 75%"
                                className={inputClass}
                              />
                            </div>
                          </div>
                        ) : null}

                        <div>
                          <label className={labelClass}>Instructions for Candidate</label>
                          <textarea
                            rows={2}
                            value={stage.configuration?.instructions || ""}
                            onChange={(e) => handleUpdateStage(idx, "configuration.instructions", e.target.value)}
                            placeholder="Instructions provided to student during this stage..."
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Custom Stage Dropdown */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-bold text-slate-600">Add Stage:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["Coding Test", "Technical Interview", "HR Interview", "Custom"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddStage(type)}
                    className="px-3 py-1.5 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 text-[#92400e] text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>+</span> {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
            <Link
              to="/employer/dashboard"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit("Draft")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              >
                Save as Draft
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>{editJobId || editInternshipId ? "Update Opportunity" : `Publish ${oppType}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
