import { useState } from "react";
import { Link } from "react-router-dom";

const FresherRecommendedJobs = ({ jobs = [], targetRole = "Full Stack Developer", onSaveJob, onApplyJob }) => {
  const [savedIds, setSavedIds] = useState(new Set());

  const handleToggleSave = (jobId) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    if (onSaveJob) onSaveJob(jobId);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recommended Jobs</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] text-[11px] font-bold border border-blue-100">
              {jobs.length} Matches
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Entry-level openings curated for <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/jobs"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1"
        >
          View All Opportunities →
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="py-10 text-center rounded-xl bg-slate-50 border border-slate-200/70 p-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1e3a8a] mx-auto flex items-center justify-center text-xl mb-3">
            💼
          </div>
          <h3 className="text-sm font-bold text-slate-800">No recommended jobs yet.</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your target role or location preferences to unlock more relevant matches.
          </p>
          <Link
            to="/jobs"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#1e40af] transition shadow-xs"
          >
            Explore Jobs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.slice(0, 4).map((job) => {
            const isSaved = savedIds.has(job.id || job._id);
            const isTargetMatch = (job.title || "").toLowerCase().includes(targetRole.toLowerCase().split(" ")[0]);

            return (
              <div
                key={job.id || job._id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col justify-between space-y-4 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {job.logo ? (
                      <img
                        src={job.logo}
                        alt={job.company}
                        className="w-11 h-11 rounded-xl object-contain border border-slate-200 p-1 bg-white"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a8a] font-bold text-sm flex items-center justify-center shrink-0">
                        {(job.company || "C")[0]}
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1e3a8a] transition leading-snug line-clamp-1">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">{job.company}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSave(job.id || job._id)}
                    className={`p-2 rounded-xl border transition ${
                      isSaved
                        ? "bg-amber-50 border-amber-300 text-amber-600"
                        : "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label="Save Job"
                  >
                    <svg
                      className="w-4 h-4"
                      fill={isSaved ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                </div>

                {/* Match Banner Pill */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {isTargetMatch ? "Matches your target role" : "Entry-level Graduate Fit"}
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    📍 {job.location || "Multiple Locations"}
                  </span>
                  <span>·</span>
                  <span>💼 {job.type || "Full-Time"}</span>
                  <span>·</span>
                  <span>🏠 {job.workMode || "Hybrid"}</span>
                  <span>·</span>
                  <span className="text-slate-700 font-semibold">{job.salary || "Competitive CTC"}</span>
                </div>

                {/* Skills tags */}
                {job.skillsRequired && job.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.skillsRequired.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {job.postedAt || "Active"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/opportunities?search=${encodeURIComponent(job.title)}`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      View Job
                    </Link>

                    {onApplyJob ? (
                      <button
                        type="button"
                        onClick={() => onApplyJob(job)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                      >
                        Apply Now
                      </button>
                    ) : job.applyUrl || job.applyLink ? (
                      <a
                        href={job.applyUrl || job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-xs"
                      >
                        Apply Now
                      </a>
                    ) : (
                      <Link
                        to={`/opportunities?search=${encodeURIComponent(job.title)}`}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-xs"
                      >
                        Apply Now
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FresherRecommendedJobs;
