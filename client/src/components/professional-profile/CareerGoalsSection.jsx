import { useState } from "react";

const TARGET_ROLES = [
  "Engineering Lead / Staff Engineer",
  "Engineering Manager",
  "Solution Architect / Cloud Architect",
  "Senior Full Stack Developer",
  "Senior Backend Architect",
  "Principal Engineer",
  "Director of Engineering",
  "VP of Engineering / CTO",
  "Product Manager (Technical)",
];

const TARGET_SENIORITIES = [
  "Senior Level (L5 / Senior)",
  "Lead Level (L6 / Staff / Tech Lead)",
  "Principal Level (L7 / Principal Architect)",
  "Executive Management (Director / VP / CTO)",
];

const TIMELINES = [
  "Immediate (1-3 Months)",
  "Next 6 Months",
  "Next 1-2 Years",
  "Exploring Long-term",
];

const CAREER_PATH_OPTIONS = [
  "Individual Contributor (IC) Track (Staff → Principal)",
  "Engineering Management Track (Lead → Manager → Director)",
  "Solutions & Enterprise Architecture Track",
  "Technical Product & Strategy Track",
];

const CareerGoalsSection = ({ careerGoal = {}, onChange }) => {
  const [formData, setFormData] = useState({
    goal:
      careerGoal?.goal ||
      "Transition into an Engineering Lead / Staff Architect role overseeing high-throughput cloud platforms.",
    targetRole: careerGoal?.targetRole || "Engineering Lead / Staff Engineer",
    targetSeniority: careerGoal?.targetSeniority || "Lead Level (L6 / Staff / Tech Lead)",
    targetIndustry: careerGoal?.targetIndustry || "Information Technology & SaaS",
    timeline: careerGoal?.timeline || "Next 6 Months",
    interestedCareerPaths:
      careerGoal?.interestedCareerPaths || [
        "Individual Contributor (IC) Track (Staff → Principal)",
        "Engineering Management Track (Lead → Manager → Director)",
      ],
  });

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange({ careerGoal: updated });
  };

  const handleTogglePath = (path) => {
    const current = formData.interestedCareerPaths || [];
    const updated = current.includes(path)
      ? current.filter((p) => p !== path)
      : [...current, path];
    handleFieldChange("interestedCareerPaths", updated);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
          🎯
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Career Transition & Aspirations</h2>
          <p className="text-xs text-slate-500">
            Where do you want to go next? This will populate &quot;Your Career Direction&quot; on your Dashboard.
          </p>
        </div>
      </div>

      {/* Primary Goal */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Primary Career Goal / Vision <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.goal}
            onChange={(e) => handleFieldChange("goal", e.target.value)}
            placeholder="e.g. Transition into an Engineering Lead role overseeing high-throughput cloud platforms..."
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm outline-none transition font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.targetRole}
              onChange={(e) => handleFieldChange("targetRole", e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500 font-medium"
            >
              {TARGET_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Seniority Level
            </label>
            <select
              value={formData.targetSeniority}
              onChange={(e) => handleFieldChange("targetSeniority", e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500 font-medium"
            >
              {TARGET_SENIORITIES.map((sn) => (
                <option key={sn} value={sn}>
                  {sn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Industry
            </label>
            <input
              type="text"
              value={formData.targetIndustry}
              onChange={(e) => handleFieldChange("targetIndustry", e.target.value)}
              placeholder="e.g. Information Technology & SaaS, FinTech, AI"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Transition Timeline
            </label>
            <select
              value={formData.timeline}
              onChange={(e) => handleFieldChange("timeline", e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500"
            >
              {TIMELINES.map((tl) => (
                <option key={tl} value={tl}>
                  {tl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interested Career Paths */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Interested Career Paths
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CAREER_PATH_OPTIONS.map((path) => {
              const isSelected = formData.interestedCareerPaths?.includes(path);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleTogglePath(path)}
                  className={`p-3 rounded-2xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                    isSelected
                      ? "bg-purple-50 border-purple-300 text-purple-900 shadow-xs"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{path}</span>
                  <span className={isSelected ? "text-purple-600 font-bold" : "text-slate-300"}>
                    {isSelected ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerGoalsSection;
