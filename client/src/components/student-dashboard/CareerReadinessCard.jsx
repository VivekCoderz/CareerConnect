import { Link } from "react-router-dom";

const CareerReadinessCard = ({ readiness }) => {
  const score = readiness?.score || 0;
  const breakdown = readiness?.breakdown || {
    profileStrength: { score: 70 },
    skillsScore: { score: 60 },
    projectsScore: { score: 50 },
    resumeScore: { score: 80 },
    certificationsScore: { score: 40 },
  };
  const tips = readiness?.tips || ["Complete your profile sections to improve readiness."];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Career Readiness Score</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
              Live Index
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluates your portfolio strength, project proof, and credential readiness against hiring benchmarks.
          </p>
        </div>

        {/* Big Score Badge */}
        <div className="flex items-baseline gap-1 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shrink-0 self-start sm:self-center shadow-xs">
          <span className="text-2xl font-extrabold text-emerald-400">{score}</span>
          <span className="text-xs font-semibold text-slate-400">/ 100</span>
        </div>
      </div>

      {/* 5-Factor Score Breakdown */}
      <div className="space-y-3 mb-6">
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Profile Completeness</span>
            <span className="font-semibold text-slate-900">{breakdown.profileStrength?.score || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${breakdown.profileStrength?.score || 0}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Technical & Soft Skills</span>
            <span className="font-semibold text-slate-900">{breakdown.skillsScore?.score || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${breakdown.skillsScore?.score || 0}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Project Portfolio</span>
            <span className="font-semibold text-slate-900">{breakdown.projectsScore?.score || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${breakdown.projectsScore?.score || 0}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Resume Status</span>
            <span className="font-semibold text-slate-900">{breakdown.resumeScore?.score || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${breakdown.resumeScore?.score || 0}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
            <span>Certifications & Proofs</span>
            <span className="font-semibold text-slate-900">{breakdown.certificationsScore?.score || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${breakdown.certificationsScore?.score || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actionable Suggestions */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
        <h3 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
          <span>💡</span> Recommendations to Boost Score:
        </h3>
        <ul className="space-y-1.5 text-xs text-blue-800">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-right">
          <Link
            to="/student/profile"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
          >
            Upgrade Profile Now →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CareerReadinessCard;
