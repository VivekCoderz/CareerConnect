import { useState } from "react";

const CAREER_LEVELS = [
  "Mid-Level",
  "Senior",
  "Lead / Staff",
  "Principal",
  "Manager / Director",
  "Executive (VP/CTO)",
];

const SUGGESTED_SPECIALIZATIONS = [
  "Full Stack & Cloud Architecture",
  "Distributed Backend Systems",
  "Frontend Architecture & Design Systems",
  "Cloud Infrastructure & DevOps",
  "Engineering Management & Agile Delivery",
  "Data Engineering & High Scale Pipelines",
  "AI / Machine Learning Engineering",
];

const SUGGESTED_HEADLINES = [
  "Senior Full Stack Developer | 6+ Years Exp | React, Node.js, AWS & Microservices",
  "Staff Backend Engineer | Distributed Systems & High Concurrency | Go, Kafka, Kubernetes",
  "Engineering Lead | Building High-Performance SaaS Platforms & Mentoring 10+ Engineers",
  "Principal Solutions Architect | Cloud Modernization & Multi-Region Resiliency (AWS/GCP)",
];

const ProfessionalIdentity = ({ profile, onChange }) => {
  const [headline, setHeadline] = useState(profile?.professionalHeadline || "");
  const [summary, setSummary] = useState(profile?.professionalSummary || "");
  const [specialization, setSpecialization] = useState(
    profile?.careerSpecialization || "Full Stack & Cloud Architecture"
  );
  const [currentLevel, setCurrentLevel] = useState(profile?.currentLevel || "Senior");
  const [targetLevel, setTargetLevel] = useState(profile?.targetLevel || "Lead / Staff");

  const notify = (h, s, spec, curLvl, tgtLvl) => {
    onChange({
      professionalHeadline: h,
      professionalSummary: s,
      careerSpecialization: spec,
      currentLevel: curLvl,
      targetLevel: tgtLvl,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
          💼
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Professional Identity & Executive Summary</h2>
          <p className="text-xs text-slate-500">Your professional positioning, seniority level, and executive summary</p>
        </div>
      </div>

      {/* Professional Headline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-700">
            Professional Headline <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400">{headline.length} / 200</span>
        </div>
        <input
          type="text"
          maxLength={200}
          required
          value={headline}
          onChange={(e) => {
            setHeadline(e.target.value);
            notify(e.target.value, summary, specialization, currentLevel, targetLevel);
          }}
          placeholder="e.g. Senior Full Stack Developer | 6+ Years Experience | React, Node.js, AWS & System Design"
          className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm font-medium outline-none transition"
        />

        {/* Quick Headline Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Quick examples:</span>
          {SUGGESTED_HEADLINES.map((sh, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setHeadline(sh);
                notify(sh, summary, specialization, currentLevel, targetLevel);
              }}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition"
            >
              {sh.split("|")[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Seniority & Specialization */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Current Seniority Level <span className="text-rose-500">*</span>
          </label>
          <select
            value={currentLevel}
            onChange={(e) => {
              setCurrentLevel(e.target.value);
              notify(headline, summary, specialization, e.target.value, targetLevel);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500 font-medium"
          >
            {CAREER_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Target Progression Level
          </label>
          <select
            value={targetLevel}
            onChange={(e) => {
              setTargetLevel(e.target.value);
              notify(headline, summary, specialization, currentLevel, e.target.value);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500 font-medium"
          >
            {CAREER_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Career Specialization
          </label>
          <input
            type="text"
            value={specialization}
            onChange={(e) => {
              setSpecialization(e.target.value);
              notify(headline, summary, e.target.value, currentLevel, targetLevel);
            }}
            placeholder="e.g. Distributed Cloud Architecture"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Specialization Pills */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_SPECIALIZATIONS.map((spec, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSpecialization(spec);
              notify(headline, summary, spec, currentLevel, targetLevel);
            }}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition ${
              specialization === spec
                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Comprehensive Professional Summary */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Executive / Professional Summary <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400">{summary.length} / 1200</span>
        </div>
        <textarea
          rows={4}
          maxLength={1200}
          required
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            notify(headline, e.target.value, specialization, currentLevel, targetLevel);
          }}
          placeholder="Summarize your engineering journey, key system architectures delivered, team leadership scope, and core technical proficiencies..."
          className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm outline-none transition leading-relaxed"
        />
        <p className="text-[11px] text-slate-500 mt-2">
          💡 Executive recruiters evaluate summaries for architectural breadth, leadership scope, and quantifiable achievements.
        </p>
      </div>
    </div>
  );
};

export default ProfessionalIdentity;
