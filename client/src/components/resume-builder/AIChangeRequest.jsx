import React, { useState } from "react";

const AIChangeRequest = ({ onSubmit, onCancel, isUpdating }) => {
  const [instruction, setInstruction] = useState("");

  const examples = [
    "Make project descriptions more impactful and results-oriented",
    "Shorten the professional summary to 2 sentences",
    "Focus the resume on frontend development skills",
    "Tailor the summary for a Software Development Engineer role",
    "Remove the certifications section",
    "Rewrite experience bullets with stronger action verbs",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    onSubmit(instruction.trim());
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0">
          🤖
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">AI Resume Refinement</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Describe the changes you need. AI will never invent new information.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Instruction Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Refinement Instructions
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition resize-y bg-slate-50 focus:bg-white"
            placeholder="e.g. Make the project descriptions more impactful and shorten the professional summary"
          />
        </div>

        {/* Quick Suggestion Pills */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent rounded-full transition cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2">
          <span className="text-amber-600 text-sm mt-0.5 shrink-0">ℹ️</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Zero Hallucination Policy:</strong> AI will only rewrite and reorder your existing verified data. 
            No new skills, companies, or experience will be fabricated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
          >
            ← Back to Preview
          </button>
          <button
            type="submit"
            disabled={!instruction.trim() || isUpdating}
            className="flex-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            {isUpdating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Applying…</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Apply AI Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChangeRequest;
