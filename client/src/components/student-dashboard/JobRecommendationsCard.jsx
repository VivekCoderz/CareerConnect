<<<<<<< HEAD
import { Link } from "react-router-dom";

const JobRecommendationsCard = ({ jobs = [], onSave, onApply, savedIds = [], limit = 1 }) => {
  const displayedJobs = limit ? jobs.slice(0, limit) : jobs;

=======
const JobRecommendationsCard = ({ jobs = [], onSave, onApply, savedIds = [], onViewAll }) => {
>>>>>>> origin/develop
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold text-slate-900">Trending & Recommended Job</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Top #1 Pick
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Top trending full-time opportunity curated for entry-level and campus graduates
          </p>
        </div>
<<<<<<< HEAD
        <Link
          to="/jobs"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition whitespace-nowrap self-start sm:self-center"
        >
          <span>Explore All Jobs</span>
          <span>&rarr;</span>
        </Link>
=======
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition"
          >
            View All Jobs →
          </button>
        )}
>>>>>>> origin/develop
      </div>

      {displayedJobs && displayedJobs.length > 0 ? (
        <div className="space-y-4">
          {displayedJobs.map((job) => {
            const isSaved = savedIds.includes(job.id);
            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      🔥 Trending Now
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {job.type} • {job.workMode}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600">
                    <span className="font-semibold text-slate-800">{job.company}</span> • {job.location}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {job.salary}
                    </span>
                    <span>• {job.postedAt}</span>
                  </div>

                  {job.skillsRequired && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skillsRequired.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    onClick={() => onSave(job)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSaved
                        ? "bg-amber-50 border-amber-300 text-amber-600"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    title={isSaved ? "Saved" : "Save Job"}
                  >
                    {isSaved ? "★ Saved" : "☆ Save"}
                  </button>

                  {job.applyLink ? (
                    <a
                      href={job.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
                    >
                      <span>Apply Online</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <button
                      onClick={() => onApply(job)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">No matching jobs found at this moment.</p>
        </div>
      )}
    </div>
  );
};

export default JobRecommendationsCard;
