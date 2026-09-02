import { useState } from "react";

const SUGGESTED_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Software Engineer",
  "Junior Web Developer",
  "Data Analyst",
  "QA Automation Engineer",
  "DevOps Engineer",
  "Python Developer",
  "Java Developer",
];

const SUGGESTED_HEADLINES = [
  "Computer Science Graduate | Full Stack Developer | React & Node.js",
  "Aspiring Software Engineer | Problem Solver | Java, Spring Boot & SQL",
  "Frontend Developer | UI/UX Enthusiast | React, Tailwind & TypeScript",
  "Recent Tech Graduate | Data Analyst | Python, SQL & PowerBI",
];

const ProfessionalInformation = ({ profile, onChange }) => {
  const [headline, setHeadline] = useState(profile?.professionalHeadline || "");
  const [careerObjective, setCareerObjective] = useState(profile?.careerObjective || "");
  const [targetRole, setTargetRole] = useState(profile?.targetRole || "");
  const [targetIndustry, setTargetIndustry] = useState(profile?.targetIndustry || "Information Technology");

  const notifyChange = (updatedHeadline, updatedObjective, updatedRole, updatedIndustry) => {
    onChange({
      professionalHeadline: updatedHeadline,
      careerObjective: updatedObjective,
      targetRole: updatedRole,
      targetIndustry: updatedIndustry,
    });
  };

  const handleHeadlineChange = (val) => {
    setHeadline(val);
    notifyChange(val, careerObjective, targetRole, targetIndustry);
  };

  const handleObjectiveChange = (val) => {
    setCareerObjective(val);
    notifyChange(headline, val, targetRole, targetIndustry);
  };

  const handleRoleChange = (val) => {
    setTargetRole(val);
    notifyChange(headline, careerObjective, val, targetIndustry);
  };

  const handleIndustryChange = (val) => {
    setTargetIndustry(val);
    notifyChange(headline, careerObjective, targetRole, val);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
          💼
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Professional Identity</h2>
          <p className="text-xs text-slate-500">Your headline, target roles, and career objective</p>
        </div>
      </div>

      {/* Professional Headline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-700">
            Professional Headline <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400">{headline.length} / 180</span>
        </div>
        <input
          type="text"
          maxLength={180}
          required
          value={headline}
          onChange={(e) => handleHeadlineChange(e.target.value)}
          placeholder="e.g. Computer Science Graduate | Full Stack Developer | React & Node.js"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition font-medium"
        />
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Quick examples:</span>
          {SUGGESTED_HEADLINES.map((sh, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleHeadlineChange(sh)}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              {sh.split("|")[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Target Job Role & Target Industry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Primary Target Role <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={targetRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            placeholder="e.g. Junior Full Stack Developer"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
          />

          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGESTED_ROLES.slice(0, 5).map((role, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition font-medium ${
                  targetRole === role
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Industry</label>
          <select
            value={targetIndustry}
            onChange={(e) => handleIndustryChange(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition bg-white"
          >
            <option value="Information Technology">Information Technology & Software</option>
            <option value="Fintech & Banking">Fintech & Banking</option>
            <option value="E-Commerce & Retail">E-Commerce & Retail</option>
            <option value="Healthtech & Healthcare">Healthtech & Healthcare</option>
            <option value="EdTech & Education">EdTech & Education</option>
            <option value="AI & Robotics">AI & Data Science</option>
            <option value="Consulting & Services">IT Services & Consulting</option>
            <option value="Other">Other</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-2">
            Aligns career matching algorithm with industry-standard benchmarks.
          </p>
        </div>
      </div>

      {/* Career Objective */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Career Objective <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400">{careerObjective.length} / 600</span>
        </div>
        <textarea
          rows={3}
          maxLength={600}
          required
          value={careerObjective}
          onChange={(e) => handleObjectiveChange(e.target.value)}
          placeholder="Seeking an entry-level software development role where I can apply my programming skills in React and Node.js to build scalable applications and contribute to high-impact projects..."
          className="w-full p-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition leading-relaxed"
        />
        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
          <span>💡</span>
          <span>Be specific about your skills and the value you bring to prospective engineering teams.</span>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInformation;
