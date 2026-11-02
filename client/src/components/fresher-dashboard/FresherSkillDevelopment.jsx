import { Link } from "react-router-dom";
import { FEATURES } from "../../config/features";

// Shows only the skills the fresher saved and what the server recommends, never sample data.
const FresherSkillDevelopment = ({ userSkills = [], recommendedSkills = [], targetRole = "Full Stack Developer" }) => {

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Skill Development
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
              Gap Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare your skills against top requirements for{" "}
            <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>
        
        {FEATURES.courses && (
        <Link
          to="/courses"
          className="px-4 py-2 rounded-xl bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 font-bold text-xs transition border border-blue-200 inline-flex items-center gap-1.5 shrink-0"
        >
          Explore Skills →
        </Link>
        )}
      </div>


      {/* Always show two-column layout */}
      <div className="space-y-4">
        {/* Your Current Skills */}
        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Your Skills ({userSkills.length})
            </span>
            <Link
              to="/fresher/profile?step=4"
              className="text-[11px] font-bold text-[#1e3a8a] hover:underline"
            >
              {userSkills.length === 0 ? "+ Add Skills" : "Edit Skills"}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {userSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                {skill}
              </span>
            ))}
            {userSkills.length === 0 && (
              <p className="text-[11px] text-slate-500">
                You haven't added any skills yet. Add them to your profile to see what to learn next.
              </p>
            )}
          </div>
        </div>

        {/* Recommended Skills to Learn */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
            Recommended for {targetRole}
          </span>

          <div className="space-y-2">
            {recommendedSkills.length === 0 && (
              <p className="text-[11px] text-slate-500">No recommendations yet.</p>
            )}
            {recommendedSkills.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 transition flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#1e3a8a]">→ {item.name}</span>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      High Demand
                    </span>
                  </div>
                  {item.reason && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.reason}</p>
                  )}
                </div>
                   
                   {FEATURES.courses && (
                <Link
                  to={item.resourceUrl || `/courses?search=${encodeURIComponent(item.name)}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#1e3a8a] hover:text-white text-slate-700 text-[11px] font-semibold transition shrink-0"
                >
                  Learn →
                </Link>
                   )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FresherSkillDevelopment;
