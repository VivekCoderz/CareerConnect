import { Link } from "react-router-dom";

const FresherCareerRecommendations = ({ recommendations = [] }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recommended For You</h2>
          <p className="text-xs text-slate-500 mt-0.5">High-impact actions to boost your recruiter visibility and job readiness</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
          Career Insights
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/20 transition bg-white flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-base">
                  {rec.type === "skill" && "⚡"}
                  {rec.type === "job" && "💼"}
                  {rec.type === "project" && "🚀"}
                  {rec.type === "resume" && "📄"}
                  {rec.type === "course" && "🎓"}
                </span>
                <h3 className="text-xs font-bold text-slate-900 leading-snug">{rec.title}</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-6">{rec.description}</p>
            </div>

            <div className="pl-6 pt-1">
              {rec.ctaAction.startsWith("/") ? (
                <Link
                  to={rec.ctaAction}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline"
                >
                  {rec.ctaText} →
                </Link>
              ) : (
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline"
                >
                  {rec.ctaText} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FresherCareerRecommendations;
