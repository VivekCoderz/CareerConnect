import { useState, useEffect } from "react";
import { FEATURES } from "../../config/features";
import { Link } from "react-router-dom";
import ViewDetailsButton from "../common/ViewDetailsButton";

const JobRecommendationsCard = ({ jobs = [], onSave, onApply, savedIds = [], appliedJobIds = new Set(), limit = 1 }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset to page 1 if jobs list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [jobs.length]);

  const isFullView = !limit || limit === 0;
  const totalPages = isFullView ? Math.ceil(jobs.length / pageSize) || 1 : 1;
  const startIndex = isFullView ? (currentPage - 1) * pageSize : 0;
  const displayedJobs = isFullView
    ? jobs.slice(startIndex, startIndex + pageSize)
    : jobs.slice(0, limit);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">
              {isFullView ? "Jobs" : "Latest Jobs"}
            </h2>
            {isFullView ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1e3a8a] border border-blue-200">
                {jobs.length} Total Jobs
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Latest
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isFullView
              ? "Jobs from employers on E2Job and remote roles from job boards (10 per page)"
              : "The newest opening on E2Job"}
          </p>
        </div>
        {!isFullView && (
          <Link
            to="/jobs"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition whitespace-nowrap self-start sm:self-center"
          >
            <span>Explore All Jobs</span>
            <span>&rarr;</span>
          </Link>
        )}
      </div>

      {isFullView && jobs.length > 0 && (
        <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{startIndex + 1}–{Math.min(startIndex + pageSize, jobs.length)}</strong> of <strong className="text-slate-800">{jobs.length}</strong> jobs
          </span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      )}

      {displayedJobs && displayedJobs.length > 0 ? (
        <div className="space-y-4">
          {displayedJobs.map((job) => {
            const isSaved = savedIds.includes(job.id || job._id);
            const isApplied = appliedJobIds.has(String(job.id || job._id));
            const jobSkills = [job.skillsRequired, job.skills, job.requiredSkills].find((l) => Array.isArray(l) && l.length) || [];
            const jobCompany = job.company || job.companyName;
            const typeMode = [job.type, job.workMode].filter(Boolean).join(" • ");
            return (
              <div
                key={job.id || job._id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                    {typeMode && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {typeMode}
                      </span>
                    )}
                  </div>

                  {(jobCompany || job.location) && (
                    <p className="text-xs font-medium text-slate-600">
                      {jobCompany && <span className="font-semibold text-slate-800">{jobCompany}</span>}
                      {jobCompany && job.location ? " • " : ""}
                      {job.location || ""}
                    </p>
                  )}

                  {(job.salary || job.postedAt) && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {job.salary && (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {job.salary}
                        </span>
                      )}
                      {job.postedAt && <span>{job.salary ? "• " : ""}{job.postedAt}</span>}
                    </div>
                  )}

                  {jobSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {jobSkills.map((skill, sIdx) => (
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
                  {/* Saving isn't stored yet (/api/student/save returns 501) */}
                  {FEATURES.savedJobs && (
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
                  )}

                  <ViewDetailsButton item={job} type="Job" />

                  {isApplied ? (
                    <button type="button" disabled className="px-4 py-2.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-not-allowed">
                      ✓ Applied
                    </button>
                  ) : job.applyLink ? (
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

      {/* Pagination Controls for full list */}
      {isFullView && totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-500">
            Page <span className="text-slate-900 font-bold">{currentPage}</span> of{" "}
            <span className="text-slate-900 font-bold">{totalPages}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push("...");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition ${
                        currentPage === p
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRecommendationsCard;
