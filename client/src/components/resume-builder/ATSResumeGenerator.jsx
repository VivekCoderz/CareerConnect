import { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../../api/api";
import JourneyLoader from "../common/JourneyLoader";
import ATSScoreCard from "./ATSScoreCard";
import ResumePreview from "./ResumePreview";
import TemplateSelector from "./TemplateSelector";
import { RESUME_TEMPLATES } from "../../data/templates";
import { saveFinalResume, fetchAllSavedResumes } from "../../redux/features/resumeSlice";
import LatexExportModal from "./LatexExportModal";

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RAW = {
  personal: { fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
  education: [],
  skills: { programmingLanguages: "", frameworks: "", tools: "", other: "" },
  projects: [],
  experience: [],
  certifications: [],
  achievements: [],
};

const Input = ({ label, value, onChange, placeholder, required, type = "text" }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
    />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 4, required }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y"
    />
  </div>
);

// ── Steps ────────────────────────────────────────────────────────────────────

const ATS_STEPS = [
  { label: "1. Job Description" },
  { label: "2. Profile Details" },
  { label: "3. Review & Export" },
];

const StepIndicator = ({ current }) => (
  <div className="flex items-center justify-center mb-6 sm:mb-8 px-2">
    {ATS_STEPS.map((s, idx) => {
      const done = idx < current;
      const active = idx === current;
      return (
        <div key={s.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border-2 transition-all ${
                done
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : active
                  ? "bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50 shadow-sm"
                  : "bg-white border-slate-300 text-slate-400"
              }`}
            >
              {done ? (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${
                active ? "text-blue-600 font-bold" : done ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {idx < ATS_STEPS.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-1.5 sm:mx-2 mb-3.5 sm:mb-5 transition-colors ${done ? "bg-blue-500" : "bg-slate-200"}`} />
          )}
        </div>
      );
    })}
  </div>
);

// ── Collapsible Card Component for Organized UI ─────────────────────────────

const CollapsibleCard = ({
  stepNum,
  title,
  subtitle,
  badgeText,
  badgeColor = "slate",
  isOpen,
  onToggle,
  actionButton,
  children,
}) => {
  const badgeClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/90 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
            {stepNum}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h3>
              {badgeText && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses[badgeColor] || badgeClasses.slate}`}>
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {actionButton && <div onClick={(e) => e.stopPropagation()}>{actionButton}</div>}
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▼
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

// ── Skill string helper ────────────────────────────────────────────────────────

const skillsToString = (val) => {
  if (!val) return "";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
};

const stringToSkillsArray = (str) =>
  (str || "").split(",").map((s) => s.trim()).filter(Boolean);

// ── Main Component ────────────────────────────────────────────────────────────

const ATSResumeGenerator = () => {
  const dispatch = useDispatch();
  const { rawData: profileRawData, profileFound } = useSelector((s) => s.resume);

  const [step, setStep] = useState(0);
  const [jobDetails, setJobDetails] = useState({ companyName: "", jobTitle: "", jobDescription: "" });

  const [rawData, setRawData] = useState(() => {
    if (profileRawData && profileRawData.personal?.fullName) {
      return {
        ...EMPTY_RAW,
        ...profileRawData,
        skills: {
          programmingLanguages: skillsToString(profileRawData.skills?.programmingLanguages),
          frameworks: skillsToString(profileRawData.skills?.frameworks),
          tools: skillsToString(profileRawData.skills?.tools),
          other: skillsToString(profileRawData.skills?.other),
        },
      };
    }
    return EMPTY_RAW;
  });

  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const previewRef = useRef(null);

  // Accordion open/collapse state for organized clean UI
  const [openSections, setOpenSections] = useState({
    personal: true,
    skills: true,
    projects: true,
    experience: true,
    achievements: true,
    education: true,
    certifications: false,
    template: false,
  });

  const toggleSection = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  const expandAll = () => setOpenSections({
    personal: true,
    skills: true,
    projects: true,
    experience: true,
    achievements: true,
    education: true,
    certifications: true,
    template: true,
  });
  const collapseAll = () => setOpenSections({
    personal: false,
    skills: false,
    projects: false,
    experience: false,
    achievements: false,
    education: false,
    certifications: false,
    template: false,
  });

  // ── Step 0: Job Details ─────────────────────────────────────────────────────
  const handleJobNext = () => {
    if (!jobDetails.jobDescription.trim()) {
      setError("Please paste the job description.");
      return;
    }
    setError("");
    setStep(1);
  };

  // ── Step 1: Your Info ───────────────────────────────────────────────────────
  const updatePersonal = (field, val) =>
    setRawData((p) => ({ ...p, personal: { ...p.personal, [field]: val } }));

  const updateSkills = (field, val) =>
    setRawData((p) => ({ ...p, skills: { ...p.skills, [field]: val } }));

  const addProject = () => {
    setRawData((p) => ({
      ...p,
      projects: [...(p.projects || []), { name: "", technologies: "", description: "", github: "", live: "" }],
    }));
    setOpenSections((p) => ({ ...p, projects: true }));
  };

  const updateProject = (idx, field, val) =>
    setRawData((p) => ({
      ...p,
      projects: (p.projects || []).map((proj, i) => (i === idx ? { ...proj, [field]: val } : proj)),
    }));

  const removeProject = (idx) =>
    setRawData((p) => ({ ...p, projects: (p.projects || []).filter((_, i) => i !== idx) }));

  const addExperience = () => {
    setRawData((p) => ({
      ...p,
      experience: [...(p.experience || []), { company: "", role: "", duration: "", description: "" }],
    }));
    setOpenSections((p) => ({ ...p, experience: true }));
  };

  const updateExperience = (idx, field, val) =>
    setRawData((p) => ({
      ...p,
      experience: (p.experience || []).map((exp, i) => (i === idx ? { ...exp, [field]: val } : exp)),
    }));

  const removeExperience = (idx) =>
    setRawData((p) => ({ ...p, experience: (p.experience || []).filter((_, i) => i !== idx) }));

  const addEducation = () => {
    setRawData((p) => ({
      ...p,
      education: [
        ...(p.education || []),
        { college: "", degree: "", branch: "", cgpa: "", startYear: "", endYear: "" },
      ],
    }));
    setOpenSections((p) => ({ ...p, education: true }));
  };

  const updateEducation = (idx, field, val) =>
    setRawData((p) => ({
      ...p,
      education: (p.education || []).map((edu, i) => (i === idx ? { ...edu, [field]: val } : edu)),
    }));

  const removeEducation = (idx) =>
    setRawData((p) => ({ ...p, education: (p.education || []).filter((_, i) => i !== idx) }));

  const addAchievement = () => {
    setRawData((p) => ({
      ...p,
      achievements: [...(p.achievements || []), { title: "", description: "" }],
    }));
    setOpenSections((p) => ({ ...p, achievements: true }));
  };

  const updateAchievement = (idx, field, val) =>
    setRawData((p) => ({
      ...p,
      achievements: (p.achievements || []).map((ach, i) => (i === idx ? { ...ach, [field]: val } : ach)),
    }));

  const removeAchievement = (idx) =>
    setRawData((p) => ({ ...p, achievements: (p.achievements || []).filter((_, i) => i !== idx) }));

  const addCertification = () => {
    setRawData((p) => ({
      ...p,
      certifications: [...(p.certifications || []), { name: "", issuer: "", year: "" }],
    }));
    setOpenSections((p) => ({ ...p, certifications: true }));
  };

  const updateCertification = (idx, field, val) =>
    setRawData((p) => ({
      ...p,
      certifications: (p.certifications || []).map((c, i) => (i === idx ? { ...c, [field]: val } : c)),
    }));

  const removeCertification = (idx) =>
    setRawData((p) => ({ ...p, certifications: (p.certifications || []).filter((_, i) => i !== idx) }));

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!rawData.personal.fullName?.trim() || !rawData.personal.email?.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setGeneratedResume(null);
    setStep(2);

    try {
      const apiRawData = {
        ...rawData,
        skills: {
          programmingLanguages: stringToSkillsArray(rawData.skills.programmingLanguages),
          frameworks: stringToSkillsArray(rawData.skills.frameworks),
          tools: stringToSkillsArray(rawData.skills.tools),
          other: stringToSkillsArray(rawData.skills.other),
        },
      };

      const res = await api.post("/resume/ats-generate", {
        rawData: apiRawData,
        jobDescription: jobDetails.jobDescription,
        companyName: jobDetails.companyName,
        template: selectedTemplate,
      });

      setGeneratedResume(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate ATS resume. Please try again.");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!generatedResume) return;
    setIsSaving(true);
    setSaveStatus("");
    try {
      const apiRawData = {
        ...rawData,
        skills: {
          programmingLanguages: stringToSkillsArray(rawData.skills.programmingLanguages),
          frameworks: stringToSkillsArray(rawData.skills.frameworks),
          tools: stringToSkillsArray(rawData.skills.tools),
          other: stringToSkillsArray(rawData.skills.other),
        },
      };
      await dispatch(
        saveFinalResume({
          title: `ATS Resume — ${jobDetails.companyName || jobDetails.jobTitle || "Job Application"}`,
          template: selectedTemplate,
          rawData: apiRawData,
          generatedData: generatedResume,
          isPrimary: false,
        })
      ).unwrap();
      dispatch(fetchAllSavedResumes());
      setSaveStatus("✅ Saved to My Resumes!");
    } catch {
      setSaveStatus("❌ Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="no-print">
        <StepIndicator current={step} />
      </div>

      {/* ══════════════════ STEP 0: Job Description & Target Role ══════════════════ */}
      {step === 0 && (
        <div className="max-w-2xl mx-auto px-2 sm:px-0">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 sm:p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🎯</span>
              <div>
                <h2 className="font-bold text-blue-950 text-base">Target Opportunity & Job Description</h2>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  Provide the hiring organization and job description. Our ATS optimization engine evaluates
                  keyword density, core technical qualifications, and role responsibilities to tailor your resume
                  for maximum ATS compatibility.{" "}
                  <strong>Single-page A4 format strictly enforced using your verified candidate data.</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hiring Company / Organization"
                value={jobDetails.companyName}
                onChange={(v) => setJobDetails((p) => ({ ...p, companyName: v }))}
                placeholder="e.g., Google, Microsoft, Infosys, Deloitte"
              />
              <Input
                label="Target Job Title / Designation"
                value={jobDetails.jobTitle}
                onChange={(v) => setJobDetails((p) => ({ ...p, jobTitle: v }))}
                placeholder="e.g., Software Development Engineer, Associate Consultant"
              />
            </div>

            <Textarea
              label="Official Job Description & Requirements"
              value={jobDetails.jobDescription}
              onChange={(v) => setJobDetails((p) => ({ ...p, jobDescription: v }))}
              placeholder="Paste the complete job description, required technical qualifications, and key responsibilities here..."
              rows={8}
              required
            />

            {error && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleJobNext}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                Continue to Candidate Credentials →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 1: Candidate Credentials & Profile Setup ══════════════════ */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto px-2 sm:px-0 space-y-4 sm:space-y-5">
          {/* Header & Quick Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Candidate Credentials & Profile Setup</h2>
              <p className="text-xs text-slate-500 mt-0.5">Structured for ATS compliance. Select any category to review or edit.</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={expandAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs font-semibold text-slate-600 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {profileFound && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-emerald-600 text-base sm:text-lg shrink-0">✅</span>
              <p className="text-xs font-semibold text-emerald-800">
                Verified CareerConnect profile data has been automatically loaded. You may adjust any section below.
              </p>
            </div>
          )}

          {/* 1. Contact & Identity Information */}
          <CollapsibleCard
            stepNum="1"
            title="Contact & Identity Information"
            subtitle={rawData.personal.fullName ? `${rawData.personal.fullName} • ${rawData.personal.email || ""}` : "Name, contact details, and professional portfolio links"}
            badgeText={rawData.personal.fullName && rawData.personal.email ? "Complete ✓" : "Required *"}
            badgeColor={rawData.personal.fullName && rawData.personal.email ? "emerald" : "amber"}
            isOpen={openSections.personal}
            onToggle={() => toggleSection("personal")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={rawData.personal.fullName} onChange={(v) => updatePersonal("fullName", v)} placeholder="e.g., Rahul Sharma" required />
              <Input label="Professional Email" value={rawData.personal.email} onChange={(v) => updatePersonal("email", v)} placeholder="e.g., rahul.sharma@email.com" required type="email" />
              <Input label="Phone Number" value={rawData.personal.phone} onChange={(v) => updatePersonal("phone", v)} placeholder="e.g., +91 98765 43210" />
              <Input label="Current Location" value={rawData.personal.location} onChange={(v) => updatePersonal("location", v)} placeholder="e.g., New Delhi, India" />
              <Input label="LinkedIn Profile URL" value={rawData.personal.linkedin} onChange={(v) => updatePersonal("linkedin", v)} placeholder="linkedin.com/in/username" />
              <Input label="GitHub Profile URL" value={rawData.personal.github} onChange={(v) => updatePersonal("github", v)} placeholder="github.com/username" />
            </div>
          </CollapsibleCard>

          {/* 2. Technical Competencies */}
          <CollapsibleCard
            stepNum="2"
            title="Technical Competencies"
            subtitle="Categorized skill sets for precision keyword matching by ATS scanners"
            badgeText={rawData.skills.programmingLanguages ? "Categorized ✓" : "Recommended"}
            badgeColor={rawData.skills.programmingLanguages ? "emerald" : "blue"}
            isOpen={openSections.skills}
            onToggle={() => toggleSection("skills")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Programming Languages" value={rawData.skills.programmingLanguages} onChange={(v) => updateSkills("programmingLanguages", v)} placeholder="e.g., C++, Java, Python, JavaScript, TypeScript" />
              <Input label="Frameworks & Libraries" value={rawData.skills.frameworks} onChange={(v) => updateSkills("frameworks", v)} placeholder="e.g., React.js, Node.js, Express.js, Tailwind CSS" />
              <Input label="Developer Tools & Databases" value={rawData.skills.tools} onChange={(v) => updateSkills("tools", v)} placeholder="e.g., MongoDB, PostgreSQL, Git, Docker, Postman" />
              <Input label="Core Computer Science Fundamentals" value={rawData.skills.other} onChange={(v) => updateSkills("other", v)} placeholder="e.g., Data Structures & Algorithms, OOP, DBMS, REST APIs" />
            </div>
          </CollapsibleCard>

          {/* 3. Technical Projects */}
          <CollapsibleCard
            stepNum="3"
            title="Technical Projects"
            subtitle={`${(rawData.projects || []).length} project(s) recorded`}
            badgeText={(rawData.projects || []).length > 0 ? `${rawData.projects.length} Added ✓` : "Recommended"}
            badgeColor={(rawData.projects || []).length > 0 ? "emerald" : "amber"}
            isOpen={openSections.projects}
            onToggle={() => toggleSection("projects")}
            actionButton={
              <button
                type="button"
                onClick={addProject}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
              >
                + Add Project
              </button>
            }
          >
            {!(rawData.projects || []).length ? (
              <div className="text-center py-5">
                <p className="text-xs text-slate-500 mb-2">No projects documented yet.</p>
                <button
                  type="button"
                  onClick={addProject}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Your First Project
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(rawData.projects || []).map((proj, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-700">Project #{idx + 1}</span>
                      <button type="button" onClick={() => removeProject(idx)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Input
                        label="Project Title"
                        value={proj.name}
                        onChange={(v) => updateProject(idx, "name", v)}
                        placeholder="e.g., CareerConnect Placement Portal"
                      />
                      <Input
                        label="Technologies & Frameworks"
                        value={proj.technologies}
                        onChange={(v) => updateProject(idx, "technologies", v)}
                        placeholder="e.g., React, Node.js, Express, MongoDB"
                      />
                      <Input
                        label="GitHub Repository Link"
                        value={proj.github}
                        onChange={(v) => updateProject(idx, "github", v)}
                        placeholder="github.com/username/project"
                      />
                      <Input
                        label="Live Deployment Link (Optional)"
                        value={proj.live}
                        onChange={(v) => updateProject(idx, "live", v)}
                        placeholder="project.vercel.app"
                      />
                    </div>
                    <Textarea
                      label="Key Contributions & Engineering Impact"
                      value={proj.description}
                      onChange={(v) => updateProject(idx, "description", v)}
                      placeholder="e.g., Designed a full-stack leaderboard application serving 5,000+ active users. Integrated secure JWT authentication and reduced database query latency by 35%."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>

          {/* 4. Professional Experience & Internships */}
          <CollapsibleCard
            stepNum="4"
            title="Professional Experience & Internships"
            subtitle={(rawData.experience || []).length > 0 ? `${rawData.experience.length} experience record(s)` : "Optional for entry-level candidates and freshers"}
            badgeText={(rawData.experience || []).length > 0 ? `${rawData.experience.length} Added` : "Optional"}
            badgeColor={(rawData.experience || []).length > 0 ? "emerald" : "slate"}
            isOpen={openSections.experience}
            onToggle={() => toggleSection("experience")}
            actionButton={
              <button
                type="button"
                onClick={addExperience}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
              >
                + Add Experience
              </button>
            }
          >
            {!(rawData.experience || []).length ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 mb-2">No prior experience listed (optional for college freshers).</p>
                <button
                  type="button"
                  onClick={addExperience}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Internship / Work Experience
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(rawData.experience || []).map((exp, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-700">Experience #{idx + 1}</span>
                      <button type="button" onClick={() => removeExperience(idx)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <Input label="Company / Organization" value={exp.company} onChange={(v) => updateExperience(idx, "company", v)} placeholder="e.g., Infosys / Tech Solutions" />
                      <Input label="Role / Designation" value={exp.role} onChange={(v) => updateExperience(idx, "role", v)} placeholder="e.g., Software Development Intern" />
                      <Input label="Duration / Period" value={exp.duration} onChange={(v) => updateExperience(idx, "duration", v)} placeholder="e.g., May 2024 – July 2024" />
                    </div>
                    <Textarea
                      label="Key Responsibilities & Quantified Outcomes"
                      value={exp.description}
                      onChange={(v) => updateExperience(idx, "description", v)}
                      placeholder="e.g., Engineered backend REST APIs in Node.js, reducing server response latency by 25%. Collaborated with a team of 4 engineers using Agile methodologies."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>

          {/* 5. Honors, Hackathons & Key Achievements */}
          <CollapsibleCard
            stepNum="5"
            title="Honors, Hackathons & Coding Achievements"
            subtitle="Hackathons (SIH), LeetCode problem solving, coding rankings — High ATS placement value"
            badgeText={(rawData.achievements || []).length > 0 ? `${rawData.achievements.length} Added ★` : "High Value"}
            badgeColor={(rawData.achievements || []).length > 0 ? "emerald" : "blue"}
            isOpen={openSections.achievements}
            onToggle={() => toggleSection("achievements")}
            actionButton={
              <button
                type="button"
                onClick={addAchievement}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
              >
                + Add Achievement
              </button>
            }
          >
            {!(rawData.achievements || []).length ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 mb-2">Highlight coding milestones (e.g., LeetCode 500+ problems, Smart India Hackathon finalist, Codeforces rating).</p>
                <button
                  type="button"
                  onClick={addAchievement}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Coding Milestone / Honor
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(rawData.achievements || []).map((ach, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-700">Achievement #{idx + 1}</span>
                      <button type="button" onClick={() => removeAchievement(idx)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Honor or Milestone Title"
                        value={ach.title}
                        onChange={(v) => updateAchievement(idx, "title", v)}
                        placeholder="e.g., Solved 500+ LeetCode Problems or SIH 2024 Finalist"
                      />
                      <Input
                        label="Key Details & Quantified Impact"
                        value={ach.description}
                        onChange={(v) => updateAchievement(idx, "description", v)}
                        placeholder="e.g., Top 8% in global coding contests; engineered prototype for Smart India Hackathon"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>

          {/* 6. Education & Academic Qualifications */}
          <CollapsibleCard
            stepNum="6"
            title="Education & Academic Qualifications"
            subtitle={`${(rawData.education || []).length} educational record(s)`}
            badgeText={(rawData.education || []).length > 0 ? `${rawData.education.length} Added ✓` : "Required *"}
            badgeColor={(rawData.education || []).length > 0 ? "emerald" : "amber"}
            isOpen={openSections.education}
            onToggle={() => toggleSection("education")}
            actionButton={
              <button
                type="button"
                onClick={addEducation}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
              >
                + Add Education
              </button>
            }
          >
            {!(rawData.education || []).length ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 mb-2">No academic qualifications added yet.</p>
                <button
                  type="button"
                  onClick={addEducation}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Academic Qualification
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(rawData.education || []).map((edu, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-700">Academic Qualification #{idx + 1}</span>
                      <button type="button" onClick={() => removeEducation(idx)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="College / University Name" value={edu.college} onChange={(v) => updateEducation(idx, "college", v)} placeholder="e.g., Delhi Technological University" />
                      <Input label="Degree & Program" value={edu.degree} onChange={(v) => updateEducation(idx, "degree", v)} placeholder="e.g., B.Tech in Computer Science / 12th Senior Secondary" />
                      <Input label="Major / Specialization" value={edu.branch} onChange={(v) => updateEducation(idx, "branch", v)} placeholder="e.g., Computer Science & Engineering" />
                      <Input label="Cumulative GPA / Percentage" value={edu.cgpa} onChange={(v) => updateEducation(idx, "cgpa", v)} placeholder="e.g., 8.4 CGPA or 91%" />
                      <Input label="Commencement Year" value={edu.startYear} onChange={(v) => updateEducation(idx, "startYear", v)} placeholder="2021" />
                      <Input label="Graduation Year" value={edu.endYear} onChange={(v) => updateEducation(idx, "endYear", v)} placeholder="2025" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>

          {/* 7. Professional Certifications (Optional) */}
          <CollapsibleCard
            stepNum="7"
            title="Professional Certifications"
            subtitle={(rawData.certifications || []).length > 0 ? `${rawData.certifications.length} certification(s)` : "Optional industry credentials"}
            badgeText={(rawData.certifications || []).length > 0 ? `${rawData.certifications.length} Added` : "Optional"}
            badgeColor={(rawData.certifications || []).length > 0 ? "emerald" : "slate"}
            isOpen={openSections.certifications}
            onToggle={() => toggleSection("certifications")}
            actionButton={
              <button
                type="button"
                onClick={addCertification}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 transition cursor-pointer"
              >
                + Add Certification
              </button>
            }
          >
            {!(rawData.certifications || []).length ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 mb-2">No professional certifications added (optional).</p>
                <button
                  type="button"
                  onClick={addCertification}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Certification
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(rawData.certifications || []).map((c, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-700">Certification #{idx + 1}</span>
                      <button type="button" onClick={() => removeCertification(idx)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                        ✕ Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="Certification Title" value={c.name} onChange={(v) => updateCertification(idx, "name", v)} placeholder="e.g., AWS Certified Cloud Practitioner" />
                      <Input label="Issuing Authority" value={c.issuer} onChange={(v) => updateCertification(idx, "issuer", v)} placeholder="e.g., Amazon Web Services" />
                      <Input label="Year of Award" value={c.year} onChange={(v) => updateCertification(idx, "year", v)} placeholder="2024" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleCard>

          {/* 8. Resume Typography & Layout Theme */}
          <CollapsibleCard
            stepNum="8"
            title="Resume Typography & Layout Theme"
            subtitle={`Selected Theme: ${selectedTemplate.toUpperCase()} (Can be changed anytime with instant preview)`}
            badgeText="Configured"
            badgeColor="blue"
            isOpen={openSections.template}
            onToggle={() => toggleSection("template")}
          >
            <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
          </CollapsibleCard>

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={() => { setError(""); setStep(0); }}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-sm transition cursor-pointer text-center"
            >
              ← Return to Job Description
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              Generate ATS-Optimized Resume
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 2: ATS Preview ══════════════════ */}
      {step === 2 && (
        <div>
          {isGenerating && (
            <div className="max-w-xl mx-auto text-center py-16 sm:py-20 px-4">
              <JourneyLoader variant="resume" size="md" />
              <p className="mt-5 font-bold text-slate-800 text-base sm:text-lg">Generating your ATS-Optimized Resume…</p>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Analyzing company keywords · Deriving quantified bullets · Enforcing 1-page A4 print standard
              </p>
            </div>
          )}

          {!isGenerating && generatedResume && (
            <div className="max-w-5xl mx-auto space-y-5 px-2 sm:px-0">
              {/* ATS Score Card */}
              <ATSScoreCard
                atsScore={generatedResume.atsScore || 0}
                matchedKeywords={generatedResume.matchedKeywords || []}
                missingKeywords={generatedResume.missingKeywords || []}
                targetRole={generatedResume.tailoredMeta?.targetRole || jobDetails.jobTitle}
                companyName={generatedResume.tailoredMeta?.companyName || jobDetails.companyName}
                scoreBreakdown={generatedResume.scoreBreakdown}
                honestSuggestions={generatedResume.honestSuggestions}
              />

              {/* Action Buttons Row */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer text-center"
                >
                  ← Modify Profile Details
                </button>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  {saveStatus && (
                    <span
                      className={`text-xs font-semibold px-3 py-2 rounded-xl text-center ${
                        saveStatus.includes("✅")
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {saveStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? "Saving…" : "💾 Save to My Resumes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLatexModalOpen(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Export ATS-optimized LaTeX source code (.tex) or compile with Overleaf"
                  >
                    <span className="font-mono font-bold text-[11px] bg-white/20 px-1 py-0.2 rounded">TEX</span>
                    <span>Export LaTeX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🖨️ Download / Print Official PDF
                  </button>
                </div>
              </div>

              {/* Mobile Swipeable Template Switcher Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm no-print">
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🎨</span> Resume Layout & Typography (Live Preview):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllTemplates(!showAllTemplates)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer shrink-0"
                  >
                    {showAllTemplates ? "Hide Gallery ▲" : "All Layouts ▼"}
                  </button>
                </div>

                {/* Horizontal touch scrollable pill bar */}
                <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
                  {RESUME_TEMPLATES.map((tpl) => {
                    const isActive = (selectedTemplate || "classic").toLowerCase() === tpl.id.toLowerCase();
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: tpl.previewColor }}
                        />
                        {tpl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Gallery */}
              {showAllTemplates && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 no-print">
                  <h4 className="font-bold text-slate-800 text-sm mb-3">All Available Resume Templates</h4>
                  <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
                </div>
              )}

              {/* Mobile Pinch/Scroll Hint */}
              <div className="sm:hidden text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-100/90 rounded-xl py-1.5 px-3 no-print">
                <span>↔️</span> Scroll horizontally to inspect full A4 document width
              </div>

              {/* Resume Preview — Responsive Scroll Container & Print Target */}
              <div className="w-full overflow-x-auto pb-4 -mx-1 sm:mx-0">
                <div
                  id="resume-print-area"
                  ref={previewRef}
                  className="min-w-[650px] sm:min-w-0 w-full max-w-[850px] mx-auto bg-white rounded-2xl shadow-lg border border-slate-200/90 overflow-hidden transition-all duration-200 print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:max-w-full print:min-w-0"
                >
                  <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between no-print bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Document Live Preview</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ ATS Match Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        📄 Guaranteed 1-Page A4 Standard
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                        {selectedTemplate}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 sm:p-6 print:p-0">
                    <ResumePreview data={generatedResume} templateId={selectedTemplate} />
                  </div>
                </div>
              </div>

              {/* Rewritten Bullets Panel */}
              {generatedResume.rewrittenBullets?.filter((b) => b.original && b.rewritten).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 no-print">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">✍️</span>
                    <h3 className="font-bold text-slate-800 text-sm">AI Phrasing & Metric Optimizations (Before vs. After)</h3>
                  </div>
                  <div className="space-y-3">
                    {generatedResume.rewrittenBullets.filter((b) => b.original && b.rewritten).map((bullet, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl p-3 sm:p-4 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{bullet.section}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                          <div className="bg-red-50/50 p-2 rounded-lg border border-red-100">
                            <p className="text-[10px] font-bold text-red-600 mb-0.5">Original Phrasing (Lacks Quantifiable Metrics)</p>
                            <p className="text-xs text-slate-700 leading-relaxed">{bullet.original}</p>
                          </div>
                          <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-700 mb-0.5">ATS-Optimized Phrasing (Action Verb + Quantified Metrics)</p>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">{bullet.rewritten}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Honest Suggestions Panel */}
              {generatedResume.honestSuggestions?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 no-print">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">💡</span>
                    <h3 className="font-bold text-amber-900 text-sm">Strategic Profile Recommendations for This Position</h3>
                  </div>
                  <ul className="space-y-2">
                    {generatedResume.honestSuggestions.map((s, idx) => (
                      <li key={idx} className="text-xs text-amber-900 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[9px] font-bold">{idx + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!isGenerating && !generatedResume && error && (
            <div className="max-w-xl mx-auto text-center py-16 px-4">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="font-bold text-red-700 text-base">{error}</p>
              <button
                type="button"
                onClick={() => { setError(""); setStep(1); }}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                ← Go Back & Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* LaTeX Export Modal */}
      <LatexExportModal
        isOpen={isLatexModalOpen}
        onClose={() => setIsLatexModalOpen(false)}
        resumeData={generatedResume || rawData}
        resumeTitle={jobDetails.jobTitle ? `${jobDetails.jobTitle}_Resume` : "ATS_Resume"}
      />
    </div>
  );
};

export default ATSResumeGenerator;

