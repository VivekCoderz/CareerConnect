import React from "react";

const CandidateCard = ({ candidate, onScheduleInterview, onAssignAssessment, onViewDetails }) => {
  const matchScore = candidate.matchPercentage || 85;

  return (
    <div className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              {candidate.fullName?.[0] || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">{candidate.fullName}</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#92400e]">
                  {candidate.userType || "Student"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                {candidate.degree} · CGPA {candidate.cgpa}
              </p>
              <p className="text-[11px] text-slate-400">
                {candidate.institution} · Class of {candidate.graduationYear}
              </p>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <span>⚡</span> {matchScore}% Match
            </div>
          </div>
        </div>

        {/* Strong & Missing Skills Matrix */}
        <div className="mt-3.5 space-y-2">
          {candidate.strongSkills?.length > 0 && (
            <div>
              <p className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Matching Skills
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {candidate.strongSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-100"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.missingSkills?.length > 0 && (
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Missing Skill Gaps
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {candidate.missingSkills.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-medium"
                  >
                    ✕ {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onScheduleInterview(candidate)}
          className="py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
        >
          <span>📅</span> Interview
        </button>
        <button
          type="button"
          onClick={() => onAssignAssessment && onAssignAssessment(candidate)}
          className="py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
        >
          <span>📝</span> Test
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;
