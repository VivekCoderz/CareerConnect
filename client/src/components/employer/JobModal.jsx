import React, { useState, useEffect } from "react";

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

const DEFAULT_STAGES = [
  {
    name: "Resume Screening",
    type: "Resume Screening",
    description: "Screen resumes and candidate profiles",
    configuration: { instructions: "Review applicant resume, projects, and educational credentials" },
  },
  {
    name: "Technical Interview",
    type: "Technical Interview",
    description: "Technical assessment and problem solving",
    configuration: { interviewType: "Online", durationMinutes: 45, instructions: "Core CS concepts, data structures, and live coding" },
  },
  {
    name: "HR Interview",
    type: "HR Interview",
    description: "Cultural fit and final HR round",
    configuration: { interviewType: "Online", durationMinutes: 30, instructions: "Behavioral assessment, communication, and compensation" },
  },
];

const JobModal = ({ isOpen, onClose, onSave, jobToEdit = null }) => {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [expandedStageIdx, setExpandedStageIdx] = useState(null);

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title || "",
        category: jobToEdit.category || "Web Development",
        subCategory: jobToEdit.subCategory || "Frontend Development",
        department: jobToEdit.department || "Engineering",
        employmentType: jobToEdit.employmentType || "Full-time",
        workMode: jobToEdit.workMode || "Remote",
        location: jobToEdit.location || "Bangalore",
        city: jobToEdit.city || "Bangalore",
        country: jobToEdit.country || "India",
        isPaid: jobToEdit.isPaid !== false,
        hasJobOffer: !!jobToEdit.hasJobOffer,
        isInternational: !!jobToEdit.isInternational,
        salaryMin: jobToEdit.salaryRange?.min || "",
        salaryMax: jobToEdit.salaryRange?.max || "",
        currency: jobToEdit.salaryRange?.currency || "INR",
        experienceLevel: jobToEdit.experience?.level || "Fresher / Entry-Level",
        minYears: jobToEdit.experience?.minYears || 0,
        maxYears: jobToEdit.experience?.maxYears || 1,
        education: jobToEdit.education || "B.Tech / BCA / MCA",
        description: jobToEdit.description || "",
        responsibilities: (jobToEdit.responsibilities || []).join("\n"),
        requiredSkills: (jobToEdit.requiredSkills || []).join(", "),
        preferredSkills: (jobToEdit.preferredSkills || []).join(", "),
        bonusSkills: (jobToEdit.bonusSkills || []).join(", "),
        openings: jobToEdit.openings || 1,
        deadline: jobToEdit.deadline ? jobToEdit.deadline.split("T")[0] : "",
        status: jobToEdit.status || "Published",
      });

      if (Array.isArray(jobToEdit.recruitmentStages) && jobToEdit.recruitmentStages.length > 0) {
        setStages(
          jobToEdit.recruitmentStages.map((s) => ({
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
          }))
        );
      } else {
        setStages(DEFAULT_STAGES);
      }
    } else {
      setFormData({
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
      setStages(DEFAULT_STAGES);
    }
    setError("");
    setExpandedStageIdx(null);
  }, [jobToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddStage = (stageType = "Technical Interview") => {
    const newStage = {
      name: stageType === "Custom" ? "Custom Round" : stageType,
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
      setError("A job must have at least one recruitment stage.");
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
          const wasDefault = s.name === s.type || s.name === "Custom Round";
          return {
            ...s,
            type: value,
            name: wasDefault ? (value === "Custom" ? "Custom Round" : value) : s.name,
          };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleApplyPreset = (presetName) => {
    if (presetName === "standard") {
      setStages(DEFAULT_STAGES);
    } else if (presetName === "technical") {
      setStages([
        {
          name: "Resume Screening",
          type: "Resume Screening",
          description: "Filter candidates by tech stack & experience",
          configuration: { instructions: "Screen candidate profile & resume" },
        },
        {
          name: "Coding Test",
          type: "Coding Test",
          description: "Online coding and algorithmic challenge",
          configuration: { testLink: "", durationMinutes: 60, passingCriteria: ">= 75%" },
        },
        {
          name: "Technical Interview",
          type: "Technical Interview",
          description: "Deep dive into system design and live problem solving",
          configuration: { interviewType: "Online", durationMinutes: 45, instructions: "Live coding & architecture" },
        },
        {
          name: "HR Interview",
          type: "HR Interview",
          description: "Cultural fit and hiring terms",
          configuration: { interviewType: "Online", durationMinutes: 30, instructions: "Behavioral & compensation" },
        },
      ]);
    } else if (presetName === "comprehensive") {
      setStages([
        {
          name: "Resume Screening",
          type: "Resume Screening",
          description: "Initial profile assessment",
          configuration: { instructions: "" },
        },
        {
          name: "Aptitude Test",
          type: "Aptitude Test",
          description: "Analytical and logical reasoning assessment",
          configuration: { durationMinutes: 45, passingCriteria: ">= 70%" },
        },
        {
          name: "Coding Test",
          type: "Coding Test",
          description: "Hands-on programming test",
          configuration: { durationMinutes: 60, passingCriteria: ">= 80%" },
        },
        {
          name: "Technical Interview",
          type: "Technical Interview",
          description: "Technical review and project deep dive",
          configuration: { interviewType: "Online", durationMinutes: 45 },
        },
        {
          name: "HR Interview",
          type: "HR Interview",
          description: "Final behavioral evaluation and offer alignment",
          configuration: { interviewType: "Online", durationMinutes: 30 },
        },
      ]);
    } else if (presetName === "fast") {
      setStages([
        {
          name: "Resume Screening",
          type: "Resume Screening",
          description: "Direct profile evaluation",
          configuration: { instructions: "" },
        },
        {
          name: "Final Interview",
          type: "Final Interview",
          description: "Comprehensive technical and hiring discussion",
          configuration: { interviewType: "Online", durationMinutes: 45 },
        },
      ]);
    }
    setExpandedStageIdx(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError("Please fill all required fields (Title, Location, Description)");
      return;
    }

    if (!stages || stages.length === 0) {
      setError("Please configure at least one recruitment stage.");
      return;
    }

    try {
      setSaving(true);
      setError("");

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
          ? formData.responsibilities.split("\n").filter((r) => r.trim())
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
        recruitmentStages: stages.map((s, idx) => ({
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
        })),
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {jobToEdit ? "Edit Opportunity" : "Post Job / Internship Opportunity"}
            </h3>
            <p className="text-xs text-slate-500">
              Auto-discoverable in Category & City Discovery Hubs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opportunity Title *
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. React Developer Intern / Associate Software Engineer"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
                required
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Web Development">Web Development</option>
                <option value="App Development">App Development (Mobile)</option>
                <option value="Software Development">Software Development</option>
                <option value="Data Science">Data Science & AI</option>
                <option value="Machine Learning">Machine Learning / Deep Learning</option>
                <option value="UI/UX Design">UI/UX Design & Product</option>
                <option value="Digital Marketing">Digital Marketing & SEO</option>
                <option value="Content Writing">Content Writing & Copy</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="HR">Human Resources (HR)</option>
                <option value="Finance">Finance & Accounting</option>
                <option value="Sales">Sales & Business Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opportunity Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Internship">Internship</option>
                <option value="Full-time">Full-time Job</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Work Mode
              </label>
              <select
                name="workMode"
                value={formData.workMode}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Remote">Work From Home (Remote)</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary City *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi / NCR</option>
                <option value="Gurugram">Gurugram</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Panipat">Panipat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Location String *
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Bangalore / Remote"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stipend / Salary Min (₹)
              </label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="25000"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>

            {/* Special Badges (Paid, Job Offer) */}
            <div className="sm:col-span-2 flex items-center gap-6 pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={formData.isPaid}
                  onChange={handleChange}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>💰 Paid Stipend</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="hasJobOffer"
                  checked={formData.hasJobOffer}
                  onChange={handleChange}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>🎯 Pre-Placement Job Offer (PPO)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isInternational"
                  checked={formData.isInternational}
                  onChange={handleChange}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>🌍 International</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Required Skills (Comma separated - tags categories automatically) *
              </label>
              <input
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                placeholder="React, JavaScript, Tailwind CSS, Node.js"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Openings & Expiry
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="openings"
                  value={formData.openings}
                  onChange={handleChange}
                  min={1}
                  placeholder="Openings"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Job Description *
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the opportunity, role summary and what the candidate will work on..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b] resize-none"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* RECRUITMENT PROCESS PIPELINE BUILDER                     */}
          {/* ======================================================== */}
          <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Recruitment Process Pipeline</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Configure custom hiring rounds for this specific job. Candidates will advance through these stages.
                </p>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("standard")}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Standard (3)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("technical")}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-amber-50 hover:bg-amber-100 text-[#92400e] transition"
                >
                  Tech + Code (4)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("comprehensive")}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition"
                >
                  Full 5-Round
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("fast")}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 transition"
                >
                  Fast-Track (2)
                </button>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2.5">
              {stages.map((stage, idx) => {
                const isExpanded = expandedStageIdx === idx;
                const isInterview =
                  stage.type === "Technical Interview" ||
                  stage.type === "HR Interview" ||
                  stage.type === "Final Interview";
                const isTest =
                  stage.type === "Online Test" ||
                  stage.type === "Coding Test" ||
                  stage.type === "Aptitude Test";

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-amber-300 transition space-y-2.5"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={stage.name}
                          onChange={(e) => handleUpdateStage(idx, "name", e.target.value)}
                          placeholder="Stage Name (e.g. Technical Round 1)"
                          className="flex-1 h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#f59e0b]"
                          required
                        />
                        <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-[#92400e] text-[10.5px] font-bold whitespace-nowrap">
                          {stage.type}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-xs font-bold flex items-center justify-center transition cursor-pointer"
                          title="Move Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-xs font-bold flex items-center justify-center transition cursor-pointer"
                          title="Move Down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedStageIdx(isExpanded ? null : idx)}
                          className={`px-2 h-7 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            isExpanded
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>⚙️</span>
                          <span>{isExpanded ? "Done" : "Configure"}</span>
                        </button>
                        <button
                          type="button"
                          disabled={stages.length <= 1}
                          onClick={() => handleRemoveStage(idx)}
                          className="w-7 h-7 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-30 text-red-600 text-xs font-bold flex items-center justify-center transition cursor-pointer"
                          title="Remove Stage"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Configuration Form */}
                    {isExpanded && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                              Stage Type
                            </label>
                            <select
                              value={stage.type}
                              onChange={(e) => handleUpdateStage(idx, "type", e.target.value)}
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-[#f59e0b]"
                            >
                              {STAGE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                              Stage Purpose / Summary
                            </label>
                            <input
                              value={stage.description || ""}
                              onChange={(e) => handleUpdateStage(idx, "description", e.target.value)}
                              placeholder="e.g. Assess coding skills & logic"
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-[#f59e0b]"
                            />
                          </div>
                        </div>

                        {/* Interview-specific fields */}
                        {isInterview && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                            <div>
                              <label className="block text-[10.5px] font-bold text-blue-900 mb-0.5">
                                Interview Mode
                              </label>
                              <select
                                value={stage.configuration?.interviewType || "Online"}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.interviewType", e.target.value)
                                }
                                className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-xs font-medium outline-none focus:border-blue-400"
                              >
                                <option value="Online">Online Video Meeting (Google Meet / Zoom)</option>
                                <option value="Offline">Offline / In-Person (Office Campus)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-bold text-blue-900 mb-0.5">
                                Estimated Duration (minutes)
                              </label>
                              <input
                                type="number"
                                min={15}
                                max={240}
                                value={stage.configuration?.durationMinutes || 45}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.durationMinutes", e.target.value)
                                }
                                className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-xs font-medium outline-none focus:border-blue-400"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10.5px] font-bold text-blue-900 mb-0.5">
                                Preparation Instructions (Optional)
                              </label>
                              <input
                                value={stage.configuration?.instructions || ""}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.instructions", e.target.value)
                                }
                                placeholder="e.g. Please be ready in a quiet room with IDE installed"
                                className="w-full h-8 rounded-lg border border-blue-200 bg-white px-2 text-xs font-medium outline-none focus:border-blue-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Test-specific fields */}
                        {isTest && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                            <div>
                              <label className="block text-[10.5px] font-bold text-amber-900 mb-0.5">
                                Test / Challenge Link (Optional)
                              </label>
                              <input
                                value={stage.configuration?.testLink || ""}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.testLink", e.target.value)
                                }
                                placeholder="https://hackerrank.com/... or Google Form"
                                className="w-full h-8 rounded-lg border border-amber-200 bg-white px-2 text-xs font-medium outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-bold text-amber-900 mb-0.5">
                                Passing Criteria (Optional)
                              </label>
                              <input
                                value={stage.configuration?.passingCriteria || ""}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.passingCriteria", e.target.value)
                                }
                                placeholder="e.g. Minimum 75% or 3/4 test cases"
                                className="w-full h-8 rounded-lg border border-amber-200 bg-white px-2 text-xs font-medium outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-bold text-amber-900 mb-0.5">
                                Duration (minutes, optional)
                              </label>
                              <input
                                type="number"
                                min={10}
                                max={300}
                                value={stage.configuration?.durationMinutes || 60}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.durationMinutes", e.target.value)
                                }
                                className="w-full h-8 rounded-lg border border-amber-200 bg-white px-2 text-xs font-medium outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-bold text-amber-900 mb-0.5">
                                Test Instructions (Optional)
                              </label>
                              <input
                                value={stage.configuration?.instructions || ""}
                                onChange={(e) =>
                                  handleUpdateStage(idx, "configuration.instructions", e.target.value)
                                }
                                placeholder="e.g. Complete before deadline; no external aids"
                                className="w-full h-8 rounded-lg border border-amber-200 bg-white px-2 text-xs font-medium outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Custom / Group Discussion fields */}
                        {!isInterview && !isTest && stage.type !== "Resume Screening" && (
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                              Round Instructions / Evaluation Criteria
                            </label>
                            <input
                              value={stage.configuration?.instructions || ""}
                              onChange={(e) =>
                                handleUpdateStage(idx, "configuration.instructions", e.target.value)
                              }
                              placeholder="e.g. Group discussion on technical topic; evaluate communication & reasoning"
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-[#f59e0b]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Stage Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleAddStage("Technical Interview")}
                className="px-3 py-1.5 rounded-xl border border-dashed border-amber-400 bg-amber-50/60 hover:bg-amber-100 text-[#92400e] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Interview Stage
              </button>
              <button
                type="button"
                onClick={() => handleAddStage("Coding Test")}
                className="px-3 py-1.5 rounded-xl border border-dashed border-blue-400 bg-blue-50/60 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Test Stage
              </button>
              <button
                type="button"
                onClick={() => handleAddStage("Custom")}
                className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Custom Stage
              </button>
            </div>

            {/* Live Pipeline Preview Diagram */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊</span> Live Pipeline Preview
                </span>
                <span className="text-[10px] text-slate-400">
                  {stages.length} Stages configured
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {stages.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-center min-w-[110px]">
                      <span className="text-[9.5px] font-bold text-amber-300 block uppercase">
                        Round {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-white block truncate max-w-[130px]">
                        {s.name}
                      </span>
                      <span className="text-[9px] text-slate-300 block">
                        {s.type}
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold text-xs flex-shrink-0">➔</span>
                  </React.Fragment>
                ))}
                <div className="flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-center min-w-[100px]">
                  <span className="text-[9.5px] font-bold text-emerald-300 block uppercase">
                    Outcome
                  </span>
                  <span className="text-[11px] font-bold text-emerald-100 block">
                    Final Selection
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                jobToEdit ? "Update Opportunity" : "Publish Opportunity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;
