import React from "react";

const SkillGapMatrix = ({ skillGaps = [], on1ClickAssign }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skillGaps.map((dept, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{dept.department}</h4>
                  <p className="text-xs text-slate-500">
                    {dept.totalEmployees} Employees Analyzed
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                    dept.gapPercentage > 40
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {dept.gapPercentage}% Skill Gap
                </span>
              </div>

              {/* Verified Strong Skills */}
              <div className="mt-3.5 space-y-1">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Mastered Competencies ({dept.strongSkills?.length || 0})
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(dept.strongSkills || []).map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Gaps */}
              <div className="mt-3 space-y-1">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Target Missing Skills ({dept.missingSkills?.length || 0})
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(dept.missingSkills || []).map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold"
                    >
                      ✕ {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended LMS Courses */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                Recommended Upskilling Courses
              </p>
              <div className="space-y-1.5">
                {(dept.recommendedCourses || []).length > 0 ? (
                  dept.recommendedCourses.map((c) => (
                    <div
                      key={c._id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.domain} · {c.duration} {c.durationUnit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => on1ClickAssign && on1ClickAssign(c, dept.department)}
                        className="px-2.5 py-1 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-white text-[10.5px] font-bold flex-shrink-0 shadow-2xs transition"
                      >
                        1-Click Assign
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific gap courses recommended.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillGapMatrix;
