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

const TIMELINES = [
  "Immediate (1-3 Months)",
  "Next 6 Months",
  "Next 1-2 Years",
  "Exploring Long-term",
];

const CareerGoalsSection = ({ careerGoal = {}, onChange }) => {
  const [formData, setFormData] = useState({
    goal:
      careerGoal?.goal ||
      "Transition into a high-scale Engineering Lead / Staff Architect role leading distributed cloud systems.",
    targetRole: careerGoal?.targetRole || "Engineering Lead / Staff Engineer",
    targetIndustry: careerGoal?.targetIndustry || "Information Technology & SaaS",
    targetLevel: careerGoal?.targetLevel || "Lead / Staff",
    timeline: careerGoal?.timeline || "Next 6 Months",
  });

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange({ careerGoal: updated });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
          🎯
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Career Goals & Transition Objectives</h2>
          <p className="text-xs text-slate-500">Define your target promotion, dream leadership role, and timeline</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Primary Career Transition Goal <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.goal}
            onChange={(e) => handleFieldChange("goal", e.target.value)}
            placeholder="e.g. Lead an engineering team building multi-region cloud infrastructure..."
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm outline-none transition font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Position / Designation <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.targetRole}
              onChange={(e) => handleFieldChange("targetRole", e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-rose-500 font-medium"
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
              Target Transition Timeline
            </label>
            <select
              value={formData.timeline}
              onChange={(e) => handleFieldChange("timeline", e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-rose-500"
            >
              {TIMELINES.map((tl) => (
                <option key={tl} value={tl}>
                  {tl}
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
              placeholder="e.g. SaaS Platforms / FinTech / AI Tech"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Seniority Level
            </label>
            <input
              type="text"
              value={formData.targetLevel}
              onChange={(e) => handleFieldChange("targetLevel", e.target.value)}
              placeholder="e.g. Staff / Lead Architect"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerGoalsSection;
