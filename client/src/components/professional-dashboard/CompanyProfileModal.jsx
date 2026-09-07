const CompanyProfileModal = ({ isOpen, onClose, company, onApplyRole }) => {
  if (!isOpen || !company) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-purple-600/20">
              {company.logoText || company.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{company.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {company.hiringTrend || "↑ 12%"} Hiring
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {company.openRoles || 12} Open Roles · {company.locations?.join(", ") || "Bangalore, Remote"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Company Overview */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Overview</h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {company.overview || "High-scale technology company actively expanding senior engineering and architectural teams."}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 font-medium block">Match Score</span>
            <span className="text-sm font-extrabold text-purple-700">{company.matchPercentage || 92}% Match</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 font-medium block">Listed Salary Range</span>
            <span className="text-sm font-bold text-slate-900">{company.listedSalaryRange || "₹40 - 65 LPA"}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
            <span className="text-slate-400 font-medium block">Primary Locations</span>
            <span className="text-xs font-bold text-slate-800 truncate block">{company.locations?.join(" · ") || "India"}</span>
          </div>
        </div>

        {/* Required Top Skills */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Most Requested Skills at {company.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {company.topSkills?.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200/60"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Current Matching Openings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Current Matching Openings ({company.matchingOpenings?.length || 1})
          </h3>
          <div className="space-y-2.5">
            {(company.matchingOpenings && company.matchingOpenings.length > 0
              ? company.matchingOpenings
              : [
                  {
                    title: `Senior / Staff Engineer - ${company.name}`,
                    location: company.locations?.[0] || "Bangalore",
                    salary: company.listedSalaryRange || "₹42 - 65 LPA",
                    experience: "5+ Years",
                    skills: company.topSkills || ["System Design", "Cloud Architecture"],
                  },
                ]
            ).map((job, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-purple-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {job.location} · {job.experience || "5+ Years"} · <span className="font-bold text-purple-700">{job.salary}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {job.skills?.map((s, i) => (
                      <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const preparedJob = {
                      ...job,
                      company: company.name,
                      companyName: company.name,
                      isExternal: !!job.url && job.url !== "#",
                      url: job.url || company.careerPageUrl || "#",
                    };
                    if (onApplyRole) onApplyRole(preparedJob, company);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0 shadow-xs transition"
                >
                  Apply Role
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          {company.careerPageUrl && company.careerPageUrl !== "#" ? (
            <a
              href={company.careerPageUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Visit {company.name} Careers</span>
              <span>↗</span>
            </a>
          ) : (
            <span className="text-slate-400">Verified Job Aggregation Pipeline</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileModal;
