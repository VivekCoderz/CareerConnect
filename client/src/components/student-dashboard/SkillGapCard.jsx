import { Link } from "react-router-dom";

const SkillGapCard = ({ skillGap }) => {
  const targetRole = skillGap?.targetRole || "Full Stack Developer";
  const mastered = skillGap?.mastered || ["JavaScript", "React", "Node.js"];
  const recommendedToLearn = skillGap?.recommendedToLearn || ["TypeScript", "Docker", "Redux"];
  const matchPercentage = skillGap?.matchPercentage ?? 60;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Skill Gap Analysis</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
              Role Match: {matchPercentage}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmarks your skills against industry standards for: <span className="font-semibold text-slate-800">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          Change Target Role →
        </Link>
      </div>

      {/* 2 Column Comparison: Mastered vs Recommended */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mastered */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </span>
            <h3 className="text-xs font-bold text-emerald-900">
              Skills You Have ({mastered.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mastered.length > 0 ? (
              mastered.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 shadow-2xs"
                >
                  ✓ {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-slate-500">No matching skills detected for this role.</p>
            )}
          </div>
        </div>

        {/* Recommended to Learn */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              ○
            </span>
            <h3 className="text-xs font-bold text-indigo-900">
              Recommended to Learn ({recommendedToLearn.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recommendedToLearn.length > 0 ? (
              recommendedToLearn.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white text-indigo-800 text-xs font-semibold rounded-lg border border-indigo-200 shadow-2xs"
                >
                  + {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-emerald-700 font-semibold">
                You have mastered all standard skills for this role! 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillGapCard;
