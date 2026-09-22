import React from "react";

/**
 * ATSScoreCard — Visual ATS match score display
 * Shows circular progress, weighted score breakdown (2x must-have vs 1x nice-to-have), matched keywords (green), missing keywords (amber)
 */
const ATSScoreCard = ({
  atsScore = 0,
  matchedKeywords = [],
  missingKeywords = [],
  targetRole = "",
  companyName = "",
  scoreBreakdown = null,
  honestSuggestions = [],
}) => {
  const score = Math.min(100, Math.max(0, Math.round(atsScore)));

  const scoreColor =
    score >= 80
      ? { ring: "#22c55e", bg: "bg-emerald-50", text: "text-emerald-700", label: "Excellent ATS Match", border: "border-emerald-200" }
      : score >= 60
      ? { ring: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", label: "Good ATS Match", border: "border-amber-200" }
      : { ring: "#ef4444", bg: "bg-red-50", text: "text-red-700", label: "Low ATS Match", border: "border-red-200" };

  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  const mustHaveMatched = scoreBreakdown?.mustHaveMatched || [];
  const mustHaveMissing = scoreBreakdown?.mustHaveMissing || [];
  const niceToHaveMatched = scoreBreakdown?.niceToHaveMatched || [];
  const niceToHaveMissing = scoreBreakdown?.niceToHaveMissing || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden no-print">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm flex-shrink-0">
            🎯
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">ATS Compatibility Score</h3>
            {(targetRole || companyName) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {targetRole}
                {companyName ? ` · ${companyName}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100">
            Must-Have: 2x weight
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-md">
            Nice-to-Have: 1x weight
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Circular Score */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={scoreColor.ring}
                  strokeWidth="10"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1.2s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{score}%</span>
                <span className="text-[10px] font-semibold text-slate-400">ATS Score</span>
              </div>
            </div>
            <div
              className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${scoreColor.bg} ${scoreColor.text} ${scoreColor.border} border`}
            >
              {scoreColor.label}
            </div>
          </div>

          {/* Keywords & Breakdown */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* Must-Have vs Nice-to-Have Pills (if breakdown exists) */}
            {(mustHaveMatched.length > 0 || mustHaveMissing.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Must-Have Tech Stack (2x)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Matched: <span className="font-bold text-emerald-600">{mustHaveMatched.length}</span> | Missing: <span className="font-bold text-amber-600">{mustHaveMissing.length}</span>
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Nice-to-Have / General (1x)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Matched: <span className="font-bold text-emerald-600">{niceToHaveMatched.length}</span> | Missing: <span className="font-bold text-slate-400">{niceToHaveMissing.length}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Matched Keywords */}
            {matchedKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    Matched Keywords ({matchedKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedKeywords.map((kw) => {
                    const isMust = mustHaveMatched.includes(kw);
                    return (
                      <span
                        key={kw}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isMust
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {kw} {isMust && "★"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            {missingKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    !
                  </span>
                  <span className="text-xs font-bold text-amber-700">
                    Missing in Profile ({missingKeywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missingKeywords.slice(0, 12).map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      {kw}
                    </span>
                  ))}
                  {missingKeywords.length > 12 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                      +{missingKeywords.length - 12} more
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  💡 These keywords appear in the JD but are not in your profile. They are{" "}
                  <strong>NOT added to your resume</strong> — only shown for your awareness.
                </p>
              </div>
            )}

            {matchedKeywords.length === 0 && missingKeywords.length === 0 && (
              <p className="text-xs text-slate-500">No keyword analysis available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATSScoreCard;
