import { useState } from "react";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Consultant", "Co-founder"];
const WORK_MODES = ["Hybrid", "Remote", "On-site"];
const INDUSTRIES = [
  "Information Technology & Services",
  "FinTech & Digital Banking",
  "SaaS & Enterprise Cloud",
  "E-Commerce & Retail Tech",
  "Healthcare & HealthTech",
  "EdTech & Learning Platforms",
  "Artificial Intelligence & ML",
  "Cybersecurity",
  "Consulting",
  "Other",
];

const CurrentEmployment = ({ currentEmployment = {}, onChange }) => {
  const [formData, setFormData] = useState({
    company: currentEmployment?.company || "",
    jobTitle: currentEmployment?.jobTitle || "",
    department: currentEmployment?.department || "Engineering",
    employmentType: currentEmployment?.employmentType || "Full-time",
    industry: currentEmployment?.industry || "Information Technology & Services",
    location: currentEmployment?.location || "",
    workMode: currentEmployment?.workMode || "Hybrid",
    joiningDate: currentEmployment?.joiningDate ? currentEmployment.joiningDate.split("T")[0] : "",
    currentlyWorking: currentEmployment?.currentlyWorking ?? true,
    description: currentEmployment?.description || "",
    responsibilities: currentEmployment?.responsibilities || "",
    companyWebsite: currentEmployment?.companyWebsite || "",
  });

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange({ currentEmployment: updated });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
          🏢
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Current Employment</h2>
          <p className="text-xs text-slate-500">Details of your active organization, designation, and primary responsibilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Current Company Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => handleFieldChange("company", e.target.value)}
            placeholder="e.g. Microsoft / Stripe / Atlassian"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Current Job Title / Designation <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.jobTitle}
            onChange={(e) => handleFieldChange("jobTitle", e.target.value)}
            placeholder="e.g. Senior Software Engineer / Tech Lead"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department / Team</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => handleFieldChange("department", e.target.value)}
            placeholder="e.g. Platform Engineering / Cloud Infrastructure"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industry</label>
          <select
            value={formData.industry}
            onChange={(e) => handleFieldChange("industry", e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-500"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Joining Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.joiningDate}
            onChange={(e) => handleFieldChange("joiningDate", e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Mode</label>
          <select
            value={formData.workMode}
            onChange={(e) => handleFieldChange("workMode", e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-500 font-medium"
          >
            {WORK_MODES.map((wm) => (
              <option key={wm} value={wm}>
                {wm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Office Location / City</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleFieldChange("location", e.target.value)}
            placeholder="e.g. Bangalore, Karnataka"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
          <select
            value={formData.employmentType}
            onChange={(e) => handleFieldChange("employmentType", e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-indigo-500"
          >
            {EMPLOYMENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Responsibilities */}
      <div className="pt-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Key Responsibilities & Scope
        </label>
        <textarea
          rows={3}
          value={formData.responsibilities}
          onChange={(e) => handleFieldChange("responsibilities", e.target.value)}
          placeholder="e.g. Leading architectural modernization, driving sprint deliverables for a team of 8 engineers, reviewing mission-critical pull requests..."
          className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition leading-relaxed"
        />
      </div>
    </div>
  );
};

export default CurrentEmployment;
