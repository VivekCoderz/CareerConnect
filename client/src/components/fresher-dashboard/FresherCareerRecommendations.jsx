import { Link } from "react-router-dom";

const FresherCareerRecommendations = ({ recommendations = [] }) => {
  const STATIC_FALLBACK = [
    {
      id: "cr-1",
      type: "resume",
      title: "Optimize Your Resume for ATS",
      description: "Add targeted keywords from your target role's job description to pass automated screening filters.",
      ctaText: "Improve Resume",
      ctaAction: "/resume-builder",
    },
    {
      id: "cr-2",
      type: "project",
      title: "Showcase a Capstone Project",
      description: "Recruiters love candidates with demonstrable work. Add a full-stack or domain-specific project to stand out.",
      ctaText: "Add Project",
      ctaAction: "/fresher/profile?step=3",
    },
    {
      id: "cr-3",
      type: "skill",
      title: "Add In-Demand Skills to Your Profile",
      description: "Complete your skills section to unlock better matching and recruiter discovery.",
      ctaText: "Update Skills",
      ctaAction: "/fresher/profile?step=4",
    },
    {
      id: "cr-4",
      type: "course",
      title: "Earn a Verified Certification",
      description: "Certifications from Coursera, Udemy, or Google validate your skills and increase profile views by 3×.",
      ctaText: "Browse Courses",
      ctaAction: "/courses",
    },
  ];

  const TYPE_ICONS = {
    skill: "⚡",
    job: "💼",
    project: "🚀",
    resume: "📄",
    course: "🎓",
    internship: "🏢",
    profile: "👤",
  };

  const TYPE_COLORS = {
    skill: "bg-amber-50 border-amber-200 text-amber-800",
    job: "bg-blue-50 border-blue-200 text-blue-800",
    project: "bg-purple-50 border-purple-200 text-purple-800",
    resume: "bg-rose-50 border-rose-200 text-rose-800",
    course: "bg-indigo-50 border-indigo-200 text-indigo-800",
    internship: "bg-emerald-50 border-emerald-200 text-emerald-800",
    profile: "bg-slate-50 border-slate-200 text-slate-800",
  };

  const displayItems =
    recommendations.length > 0 ? recommendations : STATIC_FALLBACK;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Career Recommendations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            High-impact actions to boost your recruiter visibility and job readiness
          </p>
        </div>
        <Link
          to="/fresher/career-recommendations"
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition shrink-0"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {displayItems.slice(0, 4).map((rec) => {
          const typeColor =
            TYPE_COLORS[rec.type] || "bg-slate-50 border-slate-200 text-slate-800";
          const icon = TYPE_ICONS[rec.type] || "📌";
          const ctaAction = rec.ctaAction || "/jobs";
          const isInternalLink = typeof ctaAction === "string" && ctaAction.startsWith("/");

          return (
            <div
              key={rec.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition bg-white flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm shrink-0 border ${typeColor}`}
                  >
                    {icon}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {rec.title}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pl-9">
                  {rec.description}
                </p>
              </div>

              <div className="pl-9 pt-1">
                {isInternalLink ? (
                  <Link
                    to={ctaAction}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline"
                  >
                    {rec.ctaText || "Take Action"} →
                  </Link>
                ) : (
                  <a
                    href={ctaAction}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline"
                  >
                    {rec.ctaText || "Take Action"} →
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FresherCareerRecommendations;
