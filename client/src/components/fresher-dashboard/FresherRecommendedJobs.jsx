import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Briefcase, Check, Clock, ExternalLink, IndianRupee, Loader2, MapPin, Pencil, SearchX } from "lucide-react";
import { FEATURES } from "../../config/features";
import OpportunityTitleLink from "../common/OpportunityTitleLink";
import { getRecommendedJobs } from "../../services/fresherDashboardService";

const PAGE_SIZE = 10;
const FILTERS = [
  { value: "", label: "All" },
  { value: "internship", label: "Internship" },
  { value: "full-time", label: "Full-time" },
  { value: "remote", label: "Remote" },
];

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

const postedLabel = (date) => {
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
};

const JobCardSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="h-11 w-11 rounded-xl bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-slate-100" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-5 w-16 rounded bg-slate-100" />
      <div className="h-5 w-20 rounded bg-slate-100" />
      <div className="h-5 w-14 rounded bg-slate-100" />
    </div>
  </div>
);

const JobCard = ({ job, isApplied, isSaved, onToggleSave, onApply }) => {
  const matched = new Set((job.matchedSkills || []).map((s) => s.toLowerCase()));
  const name = job.company || job.title;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {job.logo ? (
          <img src={job.logo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-[#1e3a8a]" aria-hidden>
            {initialsOf(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-snug text-slate-900">
                <OpportunityTitleLink item={job} type="Job">{job.title}</OpportunityTitleLink>
              </h3>
              {job.company && <p className="text-xs text-slate-600">{job.company}</p>}
            </div>
            {job.matchScore != null && (
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {job.matchScore}% match
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {job.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{job.location}</span>
            )}
            {job.jobType && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{job.jobType}</span>
            )}
            {job.workMode && job.workMode !== job.location && (
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" aria-hidden />{job.workMode}</span>
            )}
            {job.pay && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <IndianRupee className="h-3.5 w-3.5" aria-hidden />{job.pay.replace(/^₹/, "")}
              </span>
            )}
          </div>

          {job.skills?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 6).map((skill) => {
                const isMatch = matched.has(skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      isMatch ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isMatch && <Check className="h-3 w-3" aria-label="You have this skill" />}
                    {skill}
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-400">{postedLabel(job.postedAt)}</span>
            <div className="flex items-center gap-2">
              {/* Saving isn't stored yet (/api/student/save returns 501) */}
              {FEATURES.savedJobs && (
                <button
                  type="button"
                  onClick={() => onToggleSave(job.id)}
                  aria-pressed={isSaved}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    isSaved ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={isSaved ? "currentColor" : "none"} aria-hidden />
                  {isSaved ? "Saved" : "Save"}
                </button>
              )}
              {isApplied ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-500">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Applied
                </span>
              ) : job.isExternal ? (
                job.applyUrl && (
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a8a] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
                  >
                    Apply <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onApply(job)}
                  className="rounded-xl bg-[#1e3a8a] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

/**
 * "Jobs for you": fresher jobs scored against the fresher's preferences. Refetches when
 * `refreshKey` changes (preferences saved, application sent).
 */
const FresherRecommendedJobs = ({ refreshKey = 0, appliedJobIds = new Set(), onApplyJob, onEditPreferences }) => {
  const [filter, setFilter] = useState("");
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [noPreferences, setNoPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(() => new Set());
  // Only the newest request may update the list (filters can change mid-request).
  const requestId = useRef(0);

  const load = useCallback((nextPage, type) => {
    const id = ++requestId.current;
    const isLatest = () => id === requestId.current;
    return getRecommendedJobs({ page: nextPage, limit: PAGE_SIZE, type })
      .then((res) => {
        if (!isLatest()) return;
        const data = res?.data || {};
        setJobs((prev) => (nextPage === 1 ? data.jobs || [] : [...prev, ...(data.jobs || [])]));
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
        setNoPreferences(Boolean(data.noPreferences));
        setError("");
      })
      .catch(() => {
        if (isLatest()) setError("Jobs load nahi ho paye. Dobara try karo.");
      })
      .finally(() => {
        if (isLatest()) {
          setLoading(false);
          setLoadingMore(false);
        }
      });
  }, []);

  useEffect(() => {
    load(1, filter);
  }, [load, filter, refreshKey]);

  const changeFilter = (value) => {
    if (value === filter) return;
    setLoading(true);
    setFilter(value);
  };

  const loadMore = () => {
    setLoadingMore(true);
    load(page + 1, filter);
  };

  const toggleSave = (jobId) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

  const handleApply = (job) =>
    onApplyJob?.({ ...job, type: job.jobType, skillsRequired: job.skills });

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Jobs for you</h2>
          <p className="text-xs text-slate-500">
            {noPreferences ? "Latest fresher jobs. Preferences set karo for better matches." : "Based on your preferences"}
          </p>
        </div>
        <Link to="/jobs" className="text-xs font-semibold text-[#1e3a8a] hover:underline">
          View all jobs
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter jobs">
        {FILTERS.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => changeFilter(value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === value
                ? "border-[#1e3a8a] bg-[#1e3a8a] text-white"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1, 2].map((i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : error && jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">{error}</p>
          <button type="button" onClick={() => { setLoading(true); load(1, filter); }} className="mt-2 text-xs font-semibold text-[#1e3a8a] hover:underline">
            Retry
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <SearchX className="h-8 w-8 text-slate-400" aria-hidden />
          <p className="mt-3 max-w-sm text-sm text-slate-600">
            {noPreferences
              ? "Abhi koi fresher job open nahi hai. Thodi der baad dekho."
              : "Abhi aapki preferences se koi job match nahi hui. Preferences update karke dekho."}
          </p>
          <button
            type="button"
            onClick={() => onEditPreferences?.()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit preferences
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isApplied={job.hasApplied || appliedJobIds.has(job.id)}
                isSaved={savedIds.has(job.id)}
                onToggleSave={toggleSave}
                onApply={handleApply}
              />
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default FresherRecommendedJobs;
