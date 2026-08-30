import React, { useState } from "react";

const suggestedValues = [
  "Innovation",
  "Integrity",
  "Teamwork",
  "Customer First",
  "Excellence",
  "Continuous Learning",
  "Transparency",
  "Diversity & Inclusion",
  "Speed & Agility",
];

const suggestedHighlights = [
  "10+ Years in Industry",
  "500+ Happy Employees",
  "100+ Global Enterprise Clients",
  "Funded by Top Tier VCs",
  "Great Place to Work Certified",
  "Fastest Growing Tech Leader",
];

const AboutCompany = ({
  formData,
  handleChange,
  setFormData,
  fieldErrors = {},
}) => {
  const [newValue, setNewValue] = useState("");
  const [newHighlight, setNewHighlight] = useState("");

  const handleAddCoreValue = (val) => {
    const valueToAdd = (val || newValue).trim();
    if (!valueToAdd) return;
    const current = formData.coreValues || [];
    if (!current.includes(valueToAdd)) {
      setFormData((prev) => ({
        ...prev,
        coreValues: [...current, valueToAdd],
      }));
    }
    setNewValue("");
  };

  const handleRemoveCoreValue = (valToRemove) => {
    setFormData((prev) => ({
      ...prev,
      coreValues: (prev.coreValues || []).filter((v) => v !== valToRemove),
    }));
  };

  const handleAddHighlight = (highlight) => {
    const hToAdd = (highlight || newHighlight).trim();
    if (!hToAdd) return;
    const current = formData.companyHighlights || [];
    if (!current.includes(hToAdd)) {
      setFormData((prev) => ({
        ...prev,
        companyHighlights: [...current, hToAdd],
      }));
    }
    setNewHighlight("");
  };

  const handleRemoveHighlight = (hToRemove) => {
    setFormData((prev) => ({
      ...prev,
      companyHighlights: (prev.companyHighlights || []).filter((h) => h !== hToRemove),
    }));
  };

  const descLength = (formData.description || "").length;

  const textareaClass = (field) =>
    `w-full rounded-xl border bg-white p-3.5 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-[#f59e0b] focus:ring-[#f59e0b]/15"
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Tell candidates about your company
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Highlight your company ethos, purpose, and workplace advantages
        </p>
      </div>

      {/* Company Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[13px] font-semibold text-slate-700">
            Company Overview / Description <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-xs font-semibold ${
              descLength > 500 ? "text-red-500" : descLength > 450 ? "text-amber-500" : "text-slate-400"
            }`}
          >
            {descLength}/500 chars
          </span>
        </div>
        <textarea
          name="description"
          rows={4}
          value={formData.description || ""}
          onChange={handleChange}
          maxLength={500}
          placeholder="Describe your company's core mission, products, scale, and what makes your team exceptional..."
          className={textareaClass("description")}
        />
        {fieldErrors.description && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>
        )}
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Mission Statement
          </label>
          <textarea
            name="mission"
            rows={3}
            value={formData.mission || ""}
            onChange={handleChange}
            placeholder="e.g. Empower every business to scale seamless digital operations effortlessly."
            className={textareaClass("mission")}
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Vision Statement
          </label>
          <textarea
            name="vision"
            rows={3}
            value={formData.vision || ""}
            onChange={handleChange}
            placeholder="e.g. To become the world's most trusted partner in technological transformation."
            className={textareaClass("vision")}
          />
        </div>
      </div>

      {/* Core Values */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Core Values
        </label>
        <div className="flex flex-wrap gap-2">
          {(formData.coreValues || []).map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/80 text-[#92400e] text-xs font-bold border border-amber-200"
            >
              {val}
              <button
                type="button"
                onClick={() => handleRemoveCoreValue(val)}
                className="w-4 h-4 rounded-full bg-amber-200/80 hover:bg-amber-300 text-[#78350f] flex items-center justify-center text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCoreValue();
              }
            }}
            placeholder="Add a core value (e.g. Innovation) and press Enter"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={() => handleAddCoreValue()}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition"
          >
            Add
          </button>
        </div>

        {/* Suggestions */}
        <div className="pt-2">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
            Quick Suggestions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedValues.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddCoreValue(s)}
                disabled={(formData.coreValues || []).includes(s)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-amber-400 hover:text-[#b45309] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Why Work With Us */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
          Why Work With Us? (Candidate Value Proposition)
        </label>
        <textarea
          name="whyWorkWithUs"
          rows={3}
          value={formData.whyWorkWithUs || ""}
          onChange={handleChange}
          placeholder="Explain career growth opportunities, mentorship culture, state-of-the-art tech stack, or unique perks..."
          className={textareaClass("whyWorkWithUs")}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Help students and professionals envision their journey and growth inside your organization.
        </p>
      </div>

      {/* Company Highlights */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Company Highlights & Milestones
        </label>
        <div className="flex flex-wrap gap-2">
          {(formData.companyHighlights || []).map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-300"
            >
              ★ {h}
              <button
                type="button"
                onClick={() => handleRemoveHighlight(h)}
                className="w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-700 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newHighlight}
            onChange={(e) => setNewHighlight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddHighlight();
              }
            }}
            placeholder="e.g. 50+ Patents Filed, Forbes Top Employer"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={() => handleAddHighlight()}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestedHighlights.map((sh) => (
            <button
              key={sh}
              type="button"
              onClick={() => handleAddHighlight(sh)}
              disabled={(formData.companyHighlights || []).includes(sh)}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-amber-400 hover:text-[#b45309] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              + {sh}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutCompany;
