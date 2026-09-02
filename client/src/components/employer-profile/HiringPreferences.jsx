import React, { useState } from "react";

const candidateTypeOptions = [
  "Students",
  "Freshers",
  "Working Professionals",
  "Interns",
];

const popularSkills = [
  "Java",
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "MongoDB",
  "SQL",
  "AWS",
  "Docker",
  "Machine Learning",
  "UI/UX Design",
  "Data Structures & Algorithms",
  "Spring Boot",
  "DevOps",
  "Digital Marketing",
  "Business Analysis",
];

const qualificationOptions = [
  "B.Tech / B.E.",
  "BCA",
  "MCA",
  "MBA / PGDM",
  "M.Tech",
  "BBA",
  "B.Sc / M.Sc",
  "Diploma",
  "Any Graduate",
];

const branchOptions = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration & Management",
  "Artificial Intelligence & Data Science",
  "Commerce & Finance",
  "All Disciplines",
];

const experienceOptions = [
  "0–1 years",
  "1–3 years",
  "3–5 years",
  "5–8 years",
  "8+ years",
];

const jobTypeOptions = [
  "Full-time",
  "Internship",
  "Part-time",
  "Contract",
  "Freelance",
];

const workModeOptions = ["Remote", "Hybrid", "On-site"];

const HiringPreferences = ({
  formData,
  handleChange,
  setFormData,
  fieldErrors = {},
}) => {
  const [skillInput, setSkillInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const hiringPrefs = formData.hiringPreferences || {};
  const recruiter = formData.recruiter || {};

  const handleToggleCandidateType = (type) => {
    const current = hiringPrefs.candidateTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        candidateTypes: updated,
      },
    }));
  };

  const handleAddSkill = (skill) => {
    const sToAdd = (skill || skillInput).trim();
    if (!sToAdd) return;
    const current = hiringPrefs.skills || [];
    if (!current.includes(sToAdd)) {
      setFormData((prev) => ({
        ...prev,
        hiringPreferences: {
          ...(prev.hiringPreferences || {}),
          skills: [...current, sToAdd],
        },
      }));
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        skills: (prev.hiringPreferences?.skills || []).filter(
          (s) => s !== skillToRemove
        ),
      },
    }));
  };

  const handleToggleQualification = (qual) => {
    const current = hiringPrefs.qualifications || [];
    const updated = current.includes(qual)
      ? current.filter((q) => q !== qual)
      : [...current, qual];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        qualifications: updated,
      },
    }));
  };

  const handleToggleBranch = (branch) => {
    const current = hiringPrefs.specializations || [];
    const updated = current.includes(branch)
      ? current.filter((b) => b !== branch)
      : [...current, branch];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        specializations: updated,
      },
    }));
  };

  const handleToggleExperience = (exp) => {
    const current = hiringPrefs.experienceLevels || [];
    const updated = current.includes(exp)
      ? current.filter((e) => e !== exp)
      : [...current, exp];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        experienceLevels: updated,
      },
    }));
  };

  const handleToggleJobType = (jt) => {
    const current = hiringPrefs.jobTypes || [];
    const updated = current.includes(jt)
      ? current.filter((t) => t !== jt)
      : [...current, jt];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        jobTypes: updated,
      },
    }));
  };

  const handleToggleWorkMode = (wm) => {
    const current = hiringPrefs.workModes || [];
    const updated = current.includes(wm)
      ? current.filter((m) => m !== wm)
      : [...current, wm];

    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        workModes: updated,
      },
    }));
  };

  const handleAddLocation = () => {
    const loc = locationInput.trim();
    if (!loc) return;
    const current = hiringPrefs.locations || [];
    if (!current.includes(loc)) {
      setFormData((prev) => ({
        ...prev,
        hiringPreferences: {
          ...(prev.hiringPreferences || {}),
          locations: [...current, loc],
        },
      }));
    }
    setLocationInput("");
  };

  const handleRemoveLocation = (locToRemove) => {
    setFormData((prev) => ({
      ...prev,
      hiringPreferences: {
        ...(prev.hiringPreferences || {}),
        locations: (prev.hiringPreferences?.locations || []).filter(
          (l) => l !== locToRemove
        ),
      },
    }));
  };

  const handleRecruiterChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      recruiter: {
        ...(prev.recruiter || {}),
        [name]: value,
      },
    }));
  };

  const inputClass = (field) =>
    `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-[#f59e0b] focus:ring-[#f59e0b]/15"
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Tell us what kind of talent you're looking for
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Define candidate profiles, preferred technical skills, academic qualifications, and hiring roles
        </p>
      </div>

      {/* Who Can Apply */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Target Candidate Categories <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {candidateTypeOptions.map((type) => {
            const isSelected = (hiringPrefs.candidateTypes || []).includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleToggleCandidateType(type)}
                className={`py-3 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                }`}
              >
                <span>{isSelected ? "✓" : "+"}</span>
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Technical Skills */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Preferred Technical & Core Skills
        </label>
        <div className="flex flex-wrap gap-2">
          {(hiringPrefs.skills || []).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-[#92400e] text-xs font-bold border border-amber-200"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                className="w-4 h-4 rounded-full bg-amber-200 text-[#78350f] flex items-center justify-center text-xs hover:bg-amber-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSkill();
              }
            }}
            placeholder="Type skill (e.g. React, Node.js, Python) and press Enter"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={() => handleAddSkill()}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition"
          >
            Add Skill
          </button>
        </div>

        <div className="pt-2">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
            Quick Add Top Tech Skills:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popularSkills.map((ps) => (
              <button
                key={ps}
                type="button"
                onClick={() => handleAddSkill(ps)}
                disabled={(hiringPrefs.skills || []).includes(ps)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-amber-400 hover:text-[#b45309] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                + {ps}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Qualifications & Minimum CGPA */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-2">
            Eligible Degrees & Qualifications
          </label>
          <div className="flex flex-wrap gap-2">
            {qualificationOptions.map((q) => {
              const isSelected = (hiringPrefs.qualifications || []).includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleToggleQualification(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    isSelected
                      ? "bg-[#92400e] text-white border-[#92400e] shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Minimum Academic Cut-off (CGPA or %)
            </label>
            <input
              type="text"
              name="minimumCGPA"
              value={hiringPrefs.minimumCGPA || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hiringPreferences: {
                    ...(prev.hiringPreferences || {}),
                    minimumCGPA: e.target.value,
                  },
                }))
              }
              placeholder="e.g. 6.5 CGPA or 60%"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Application Receiver Email (Optional)
            </label>
            <input
              type="email"
              name="applicationEmail"
              value={hiringPrefs.applicationEmail || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hiringPreferences: {
                    ...(prev.hiringPreferences || {}),
                    applicationEmail: e.target.value,
                  },
                }))
              }
              placeholder="careers@company.com"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b]"
            />
          </div>
        </div>
      </div>

      {/* Target Branches */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Target University Branches & Specializations
        </label>
        <div className="flex flex-wrap gap-2">
          {branchOptions.map((branch) => {
            const isSelected = (hiringPrefs.specializations || []).includes(branch);
            return (
              <button
                key={branch}
                type="button"
                onClick={() => handleToggleBranch(branch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {branch}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience, Job Types & Work Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Experience */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Experience Level
          </label>
          <div className="space-y-1.5">
            {experienceOptions.map((exp) => {
              const isSelected = (hiringPrefs.experienceLevels || []).includes(exp);
              return (
                <button
                  key={exp}
                  type="button"
                  onClick={() => handleToggleExperience(exp)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-100 text-[#92400e]"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{exp}</span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Job Types */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Opportunity Types
          </label>
          <div className="space-y-1.5">
            {jobTypeOptions.map((jt) => {
              const isSelected = (hiringPrefs.jobTypes || []).includes(jt);
              return (
                <button
                  key={jt}
                  type="button"
                  onClick={() => handleToggleJobType(jt)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-100 text-[#92400e]"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{jt}</span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work Modes */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Work Modes
          </label>
          <div className="space-y-1.5">
            {workModeOptions.map((wm) => {
              const isSelected = (hiringPrefs.workModes || []).includes(wm);
              return (
                <button
                  key={wm}
                  type="button"
                  onClick={() => handleToggleWorkMode(wm)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-100 text-[#92400e]"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{wm}</span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Target Hiring Locations */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Target Job Locations / Hubs
        </label>
        <div className="flex flex-wrap gap-2">
          {(hiringPrefs.locations || []).map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs"
            >
              📍 {loc}
              <button
                type="button"
                onClick={() => handleRemoveLocation(loc)}
                className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLocation();
              }
            }}
            placeholder="e.g. Gurugram, Noida, Bangalore, Remote, Pan-India"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={handleAddLocation}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition"
          >
            Add Location
          </button>
        </div>
      </div>

      {/* Recruiter / Contact Person */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Designated Recruiter / Campus Coordinator
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Contact Person Name
            </label>
            <input
              type="text"
              name="name"
              value={recruiter.name || ""}
              onChange={handleRecruiterChange}
              placeholder="e.g. Priya Sharma"
              className={inputClass("recruiterName")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Designation
            </label>
            <input
              type="text"
              name="designation"
              value={recruiter.designation || ""}
              onChange={handleRecruiterChange}
              placeholder="e.g. Talent Acquisition Lead"
              className={inputClass("recruiterDesignation")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Official Email
            </label>
            <input
              type="email"
              name="email"
              value={recruiter.email || ""}
              onChange={handleRecruiterChange}
              placeholder="priya.hr@company.com"
              className={inputClass("recruiterEmail")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Contact Phone / Mobile
            </label>
            <input
              type="tel"
              name="phone"
              value={recruiter.phone || ""}
              onChange={handleRecruiterChange}
              placeholder="+91 98765 00000"
              className={inputClass("recruiterPhone")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiringPreferences;
