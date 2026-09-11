import { useState, useEffect, useMemo } from "react";

export default function ParsedResumeReviewModal({
  isOpen,
  initialData,
  parsedData,
  existingProfile,
  resumeUrl,
  resumeName,
  onConfirm,
  onCancel,
  onClose,
  isSaving = false,
  title,
}) {
  const [activeTab, setActiveTab] = useState("skills");
  const [viewMode, setViewMode] = useState("diff"); // 'diff' | 'edit'

  const buildInitialForm = (rawSource) => {
    const raw = rawSource || {};
    return {
      personal: {
        fullName: raw.personal?.fullName || raw.name || "",
        email: raw.personal?.email || raw.email || "",
        phone: raw.personal?.phone || raw.phone || "",
        location: raw.personal?.location || raw.location || "",
        linkedin: raw.personal?.linkedin || raw.linkedin || "",
        github: raw.personal?.github || raw.github || "",
        portfolio: raw.personal?.portfolio || raw.portfolio || "",
      },
      summary: raw.summary || "",
      education: Array.isArray(raw.education) && raw.education.length
        ? raw.education.map((e) => ({
            college: e.college || e.institution || e.school || "",
            degree: e.degree || "",
            branch: e.branch || e.fieldOfStudy || "",
            cgpa: e.cgpa || e.percentage || e.grade || "",
            startYear: String(e.startYear || e.start_year || ""),
            endYear: String(e.endYear || e.end_year || e.graduationYear || ""),
          }))
        : [],
      skills: {
        programmingLanguages: Array.isArray(raw.skills?.programmingLanguages)
          ? raw.skills.programmingLanguages.join(", ")
          : typeof raw.skills?.programmingLanguages === "string"
          ? raw.skills.programmingLanguages
          : Array.isArray(raw.skills)
          ? raw.skills.join(", ")
          : "",
        frameworks: Array.isArray(raw.skills?.frameworks)
          ? raw.skills.frameworks.join(", ")
          : raw.skills?.frameworks || "",
        tools: Array.isArray(raw.skills?.tools)
          ? raw.skills.tools.join(", ")
          : raw.skills?.tools || "",
        other: Array.isArray(raw.skills?.other)
          ? raw.skills.other.join(", ")
          : raw.skills?.other || "",
      },
      projects: Array.isArray(raw.projects) && raw.projects.length
        ? raw.projects.map((p) => ({
            name: typeof p === "string" ? p : p.name || p.title || "",
            technologies: Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies || "",
            description: Array.isArray(p.description) ? p.description.join("\n") : p.description || "",
            github: p.github || "",
            live: p.live || "",
          }))
        : [],
      experience: Array.isArray(raw.experience) && raw.experience.length
        ? raw.experience.map((e) => ({
            company: e.company || e.companyName || e.organization || "",
            role: e.role || e.jobTitle || "",
            duration: e.duration || "",
            description: Array.isArray(e.description) ? e.description.join("\n") : e.description || "",
          }))
        : [],
      certifications: Array.isArray(raw.certifications) && raw.certifications.length
        ? raw.certifications.map((c) => ({
            name: typeof c === "string" ? c : c.name || "",
            issuer: c.issuer || c.issuingOrganization || "",
            year: c.year || "",
          }))
        : [],
      achievements: Array.isArray(raw.achievements) && raw.achievements.length
        ? raw.achievements.map((a) => ({
            title: typeof a === "string" ? a : a.title || "",
            description: a.description || "",
          }))
        : [],
      codingProfiles: {
        leetcode: raw.codingProfiles?.leetcode || "",
        hackerrank: raw.codingProfiles?.hackerrank || "",
        codechef: raw.codingProfiles?.codechef || "",
        codeforces: raw.codingProfiles?.codeforces || "",
        github: raw.codingProfiles?.github || "",
      },
    };
  };

  const incomingSource = parsedData || initialData;
  const [formData, setFormData] = useState(() => buildInitialForm(incomingSource));

  // Sync state whenever new parsed data arrives
  useEffect(() => {
    if (incomingSource) {
      setFormData(buildInitialForm(incomingSource));
    }
  }, [incomingSource]);

  // Compute existing vs new stats
  const existingSkillsList = useMemo(() => {
    if (!existingProfile?.skills) return [];
    const p = existingProfile.skills;
    const all = [
      p.programmingLanguages,
      p.frameworks,
      p.tools,
      p.other,
    ].filter(Boolean).join(", ");
    return all.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  }, [existingProfile]);

  const extractedSkillsList = useMemo(() => {
    const s = formData.skills;
    const all = [s.programmingLanguages, s.frameworks, s.tools, s.other].filter(Boolean).join(", ");
    return all.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }, [formData.skills]);

  const newSkills = useMemo(() => {
    return extractedSkillsList.filter(
      (skill) => !existingSkillsList.includes(skill.toLowerCase())
    );
  }, [extractedSkillsList, existingSkillsList]);

  if (!isOpen) return null;

  // Handlers
  const handlePersonalChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const handleCodingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      codingProfiles: { ...prev.codingProfiles, [field]: value },
    }));
  };

  const handleEduChange = (idx, field, value) => {
    setFormData((prev) => {
      const list = [...prev.education];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, education: list };
    });
  };

  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { college: "", degree: "", branch: "", cgpa: "", startYear: "", endYear: "" },
      ],
    }));
  };

  const removeEducation = (idx) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx),
    }));
  };

  const handleSkillChange = (category, value) => {
    setFormData((prev) => ({
      ...prev,
      skills: { ...prev.skills, [category]: value },
    }));
  };

  const handleProjectChange = (idx, field, value) => {
    setFormData((prev) => {
      const list = [...prev.projects];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, projects: list };
    });
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { name: "", technologies: "", description: "", github: "", live: "" },
      ],
    }));
  };

  const removeProject = (idx) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx),
    }));
  };

  const handleExpChange = (idx, field, value) => {
    setFormData((prev) => {
      const list = [...prev.experience];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, experience: list };
    });
  };

  const addExperience = () => {
    setFormData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: "", role: "", duration: "", description: "" },
      ],
    }));
  };

  const removeExperience = (idx) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
  };

  const handleCertChange = (idx, field, value) => {
    setFormData((prev) => {
      const list = [...prev.certifications];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, certifications: list };
    });
  };

  const addCert = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: "", issuer: "", year: "" }],
    }));
  };

  const removeCert = (idx) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx),
    }));
  };

  const handleAchChange = (idx, field, value) => {
    setFormData((prev) => {
      const list = [...prev.achievements];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, achievements: list };
    });
  };

  const addAch = () => {
    setFormData((prev) => ({
      ...prev,
      achievements: [...prev.achievements, { title: "", description: "" }],
    }));
  };

  const removeAch = (idx) => {
    setFormData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = () => {
    const cleaned = {
      ...formData,
      skills: {
        programmingLanguages: formData.skills.programmingLanguages
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        frameworks: formData.skills.frameworks
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        tools: formData.skills.tools
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        other: formData.skills.other
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      },
    };
    onConfirm({ parsedData: cleaned, resumeUrl, resumeName });
  };

  const TABS = [
    { id: "skills", label: "⚡ Skills", count: extractedSkillsList.length, newCount: newSkills.length },
    { id: "personal", label: "👤 Personal & Social" },
    { id: "summary", label: "📝 Summary / Bio" },
    { id: "education", label: "🎓 Education", count: formData.education.length },
    { id: "projects", label: "💻 Projects", count: formData.projects.length },
    { id: "experience", label: "💼 Experience", count: formData.experience.length },
    { id: "certifications", label: "📜 Certifications", count: formData.certifications.length },
    { id: "achievements", label: "🏆 Achievements", count: formData.achievements.length },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-blue-100 mb-2">
              <span>✨</span> Resume Parsed
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Review Your Imported Information
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl">
              We automatically extracted your resume details. Check the fields below, make any corrections, and confirm to update your CareerConnect profile.
            </p>
          </div>
          {(onCancel || onClose) && (
            <button
              type="button"
              onClick={onCancel || onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg leading-none cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Highlight Summary Banner */}
        <div className="bg-blue-50/80 px-5 sm:px-6 py-2.5 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-950 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Extracted <strong>{extractedSkillsList.length} skills</strong>
              {newSkills.length > 0 ? (
                <span className="text-emerald-700 font-bold ml-1">
                  ({newSkills.length} new to profile)
                </span>
              ) : null}
              , <strong>{formData.projects.length} projects</strong>, <strong>{formData.education.length} education</strong> entries.
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("diff")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                viewMode === "diff"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔍 Profile Comparison
            </button>
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                viewMode === "edit"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✏️ Edit Fields
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-5 sm:px-6 bg-slate-50 gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-[#1e3a8a] text-[#1e3a8a]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id ? "bg-blue-100 text-[#1e3a8a]" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.newCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  +{tab.newCount} new
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SKILLS */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              {/* Diff View Comparison */}
              {viewMode === "diff" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        📋 Existing in Profile
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {existingSkillsList.length} skills
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-xl bg-white border border-slate-200">
                      {existingSkillsList.length > 0 ? (
                        existingSkillsList.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 capitalize"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills currently saved in profile.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        ✨ Extracted from Resume
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold">
                        {newSkills.length} new will be added
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-xl bg-white border border-blue-200">
                      {extractedSkillsList.length > 0 ? (
                        extractedSkillsList.map((skill, i) => {
                          const isNew = !existingSkillsList.includes(skill.toLowerCase());
                          return (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                isNew
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {skill}
                              {isNew && (
                                <span className="text-[9px] px-1 bg-emerald-600 text-white rounded font-bold">
                                  + NEW
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills detected from resume.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Skills by Category (Comma-separated)
                  </h3>
                  <span className="text-xs text-slate-500">Edit or add tags before saving</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    💻 Programming Languages
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JavaScript, Python, C++, Java"
                    value={formData.skills.programmingLanguages}
                    onChange={(e) => handleSkillChange("programmingLanguages", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📦 Frameworks & Libraries
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. React, Node.js, Express, Tailwind CSS"
                    value={formData.skills.frameworks}
                    onChange={(e) => handleSkillChange("frameworks", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🛠️ Developer Tools & Databases
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Git, GitHub, Docker, MongoDB, PostgreSQL, AWS"
                    value={formData.skills.tools}
                    onChange={(e) => handleSkillChange("tools", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🎯 Soft Skills & Other Domains
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Problem Solving, Agile, Communication, System Design"
                    value={formData.skills.other}
                    onChange={(e) => handleSkillChange("other", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL & SOCIAL */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              {viewMode === "diff" && existingProfile?.personal && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wide block">
                    Profile Comparison (Current vs Resume)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400">Current Name:</span>{" "}
                      <span className="font-medium text-slate-800">{existingProfile.personal.fullName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Location:</span>{" "}
                      <span className="font-medium text-slate-800">{existingProfile.personal.location || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Phone:</span>{" "}
                      <span className="font-medium text-slate-800">{existingProfile.personal.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Current LinkedIn:</span>{" "}
                      <span className="font-medium text-slate-800 truncate block max-w-xs">{existingProfile.personal.linkedin || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.personal.fullName}
                    onChange={(e) => handlePersonalChange("fullName", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.personal.email}
                    onChange={(e) => handlePersonalChange("email", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.personal.phone}
                    onChange={(e) => handlePersonalChange("phone", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, Karnataka"
                    value={formData.personal.location}
                    onChange={(e) => handlePersonalChange("location", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.personal.linkedin}
                    onChange={(e) => handlePersonalChange("linkedin", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GitHub URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={formData.personal.github}
                    onChange={(e) => handlePersonalChange("github", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Portfolio / Personal Website</label>
                  <input
                    type="url"
                    placeholder="https://yourportfolio.dev"
                    value={formData.personal.portfolio}
                    onChange={(e) => handlePersonalChange("portfolio", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Coding Profiles Section */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
                  Competitive Programming & Coding Handles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">LeetCode</label>
                    <input
                      type="url"
                      placeholder="https://leetcode.com/username"
                      value={formData.codingProfiles.leetcode}
                      onChange={(e) => handleCodingChange("leetcode", e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">HackerRank</label>
                    <input
                      type="url"
                      placeholder="https://hackerrank.com/username"
                      value={formData.codingProfiles.hackerrank}
                      onChange={(e) => handleCodingChange("hackerrank", e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">CodeChef</label>
                    <input
                      type="url"
                      placeholder="https://codechef.com/users/username"
                      value={formData.codingProfiles.codechef}
                      onChange={(e) => handleCodingChange("codechef", e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUMMARY / BIO */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {viewMode === "diff" && existingProfile?.summary && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-600 uppercase tracking-wide block">
                    Current Profile Bio / Summary:
                  </span>
                  <p className="text-slate-700 italic">{existingProfile.summary}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Extracted Summary / Bio (Will update profile bio)
                </label>
                <textarea
                  rows={4}
                  placeholder="Professional summary extracted from resume..."
                  value={formData.summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-slate-400 mt-1">
                  If left empty, your current profile bio will not be modified.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: EDUCATION */}
          {activeTab === "education" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Educational credentials found on your resume:</p>
                <button
                  type="button"
                  onClick={addEducation}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  + Add Education
                </button>
              </div>

              {formData.education.map((edu, idx) => {
                const alreadyExists = existingProfile?.education?.some(
                  (ee) => (ee.degree || "").toLowerCase() === (edu.degree || "").toLowerCase()
                );

                return (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                    <div className="flex items-center justify-between pr-8">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        alreadyExists ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {alreadyExists ? "Matches Existing Entry" : "+ NEW to Profile"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEducation(idx)}
                        className="text-slate-400 hover:text-red-600 text-sm p-1 cursor-pointer"
                        title="Remove this entry"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Institution / College</label>
                        <input
                          type="text"
                          value={edu.college}
                          onChange={(e) => handleEduChange(idx, "college", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Degree</label>
                        <input
                          type="text"
                          placeholder="e.g. B.Tech"
                          value={edu.degree}
                          onChange={(e) => handleEduChange(idx, "degree", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Branch / Specialization</label>
                        <input
                          type="text"
                          placeholder="e.g. Computer Science"
                          value={edu.branch}
                          onChange={(e) => handleEduChange(idx, "branch", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CGPA / %</label>
                          <input
                            type="text"
                            value={edu.cgpa}
                            onChange={(e) => handleEduChange(idx, "cgpa", e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Start</label>
                          <input
                            type="text"
                            placeholder="YYYY"
                            value={edu.startYear}
                            onChange={(e) => handleEduChange(idx, "startYear", e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">End</label>
                          <input
                            type="text"
                            placeholder="YYYY"
                            value={edu.endYear}
                            onChange={(e) => handleEduChange(idx, "endYear", e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: PROJECTS */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Projects identified from your resume:</p>
                <button
                  type="button"
                  onClick={addProject}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  + Add Project
                </button>
              </div>

              {formData.projects.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  No projects extracted. Click "+ Add Project" to add one manually.
                </div>
              ) : (
                formData.projects.map((proj, idx) => {
                  const alreadyExists = existingProfile?.projects?.some(
                    (ep) => (ep.name || "").toLowerCase() === (proj.name || "").toLowerCase()
                  );

                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                      <div className="flex items-center justify-between pr-8">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          alreadyExists ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {alreadyExists ? "Already In Profile" : "+ NEW Project"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProject(idx)}
                          className="text-slate-400 hover:text-red-600 text-sm p-1 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Project Name</label>
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => handleProjectChange(idx, "name", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Technologies Used</label>
                          <input
                            type="text"
                            placeholder="e.g. React, Node.js, MongoDB"
                            value={proj.technologies}
                            onChange={(e) => handleProjectChange(idx, "technologies", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Description / Key Features</label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => handleProjectChange(idx, "description", e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">GitHub Repo</label>
                          <input
                            type="url"
                            placeholder="https://github.com/..."
                            value={proj.github}
                            onChange={(e) => handleProjectChange(idx, "github", e.target.value)}
                            className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Live Demo Link</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={proj.live}
                            onChange={(e) => handleProjectChange(idx, "live", e.target.value)}
                            className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 6: EXPERIENCE */}
          {activeTab === "experience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Work experience / internships:</p>
                <button
                  type="button"
                  onClick={addExperience}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  + Add Experience
                </button>
              </div>

              {formData.experience.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  No experience entries found. Click "+ Add Experience" if applicable.
                </div>
              ) : (
                formData.experience.map((exp, idx) => {
                  const alreadyExists = existingProfile?.experience?.some(
                    (ee) => (ee.company || "").toLowerCase() === (exp.company || "").toLowerCase()
                  );

                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                      <div className="flex items-center justify-between pr-8">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          alreadyExists ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {alreadyExists ? "Already In Profile" : "+ NEW Experience"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExperience(idx)}
                          className="text-slate-400 hover:text-red-600 text-sm p-1 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Company / Organization</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => handleExpChange(idx, "company", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Role / Title</label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => handleExpChange(idx, "role", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Duration / Dates</label>
                          <input
                            type="text"
                            placeholder="e.g. Jun 2023 – Aug 2023"
                            value={exp.duration}
                            onChange={(e) => handleExpChange(idx, "duration", e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Responsibilities / Achievements</label>
                        <textarea
                          rows={2}
                          value={exp.description}
                          onChange={(e) => handleExpChange(idx, "description", e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 7: CERTIFICATIONS */}
          {activeTab === "certifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Certifications extracted from resume:</p>
                <button
                  type="button"
                  onClick={addCert}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  + Add Certification
                </button>
              </div>

              {formData.certifications.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  No certifications extracted.
                </div>
              ) : (
                formData.certifications.map((cert, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Certificate Name"
                      value={cert.name}
                      onChange={(e) => handleCertChange(idx, "name", e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Issuer (e.g. Coursera, AWS)"
                      value={cert.issuer}
                      onChange={(e) => handleCertChange(idx, "issuer", e.target.value)}
                      className="w-48 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={cert.year}
                      onChange={(e) => handleCertChange(idx, "year", e.target.value)}
                      className="w-20 h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCert(idx)}
                      className="text-slate-400 hover:text-red-600 text-sm p-1 cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 8: ACHIEVEMENTS */}
          {activeTab === "achievements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Honors, awards, and achievements:</p>
                <button
                  type="button"
                  onClick={addAch}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  + Add Achievement
                </button>
              </div>

              {formData.achievements.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                  No achievements extracted.
                </div>
              ) : (
                formData.achievements.map((ach, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Achievement / Award Title"
                      value={ach.title}
                      onChange={(e) => handleAchChange(idx, "title", e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeAch(idx)}
                      className="text-slate-400 hover:text-red-600 text-sm p-1 cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            🔒 Safe sync: Existing manually entered information is preserved and never blindly overwritten.
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {(onCancel || onClose) && (
              <button
                type="button"
                onClick={onCancel || onClose}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Skip / Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving to Profile...
                </>
              ) : (
                <>
                  <span>✓</span> Confirm & Save to Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
