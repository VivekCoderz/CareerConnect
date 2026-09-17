import { useState } from "react";
import { Link } from "react-router-dom";

const SAMPLE_JOBS = [
  {
    _id: "sample-1",
    title: "Junior Full Stack Developer",
    company: "TechCorp India",
    location: "Bangalore",
    type: "Full-Time",
    workMode: "Hybrid",
    salary: "₹4–6 LPA",
    skillsRequired: ["React", "Node.js", "MongoDB"],
    postedAt: "2 days ago",
  },
  {
    _id: "sample-2",
    title: "Associate Software Engineer",
    company: "Infosys",
    location: "Pune",
    type: "Full-Time",
    workMode: "Onsite",
    salary: "₹3.5–5 LPA",
    skillsRequired: ["Java", "Spring Boot", "SQL"],
    postedAt: "4 days ago",
  },
  {
    _id: "sample-3",
    title: "Frontend Developer",
    company: "Razorpay",
    location: "Remote",
    type: "Full-Time",
    workMode: "Remote",
    salary: "₹5–8 LPA",
    skillsRequired: ["React", "TypeScript", "CSS"],
    postedAt: "1 week ago",
  },
];

const FresherRecommendedJobs = ({
  jobs = [],
  targetRole = "Full Stack Developer",
  onSaveJob,
  onApplyJob,
}) => {
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

  const displayJobs = jobs.length > 0 ? jobs : SAMPLE_JOBS;
  const isStaticData = jobs.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Recommended Jobs
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              {isStaticData ? "Sample" : `${displayJobs.length} Match${displayJobs.length !== 1 ? "es" : ""}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Curated entry-level openings for{" "}
            <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/jobs"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1 shrink-0"
        >
          View All Jobs →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {displayJobs.slice(0, 3).map((job) => {
          const jobId = job.id || job._id;
          const isSaved = savedIds.has(jobId);
          const isTargetMatch = (job.title || "")
            .toLowerCase()
            .includes(targetRole.toLowerCase().split(" ")[0]);

          return (
            <div
              key={jobId}
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-white group"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: logo + info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {job.logo ? (
                    <img
                      src={job.logo}
                      alt={job.company}
                      className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-1 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a8a] font-bold text-sm flex items-center justify-center shrink-0">
                      {(job.company || "C")[0]}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1e3a8a] transition leading-snug line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">{job.company}</p>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={() => handleToggleSave(jobId)}
                  className={`p-2 rounded-xl border transition shrink-0 ${
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

              {/* Match badge + meta */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {isTargetMatch ? "Role Match" : "Entry-Level Fit"}
                </span>

                <span className="text-xs text-slate-500">
                  📍 {job.location || "Multiple Locations"}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">
                  🏠 {job.workMode || "Hybrid"}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-slate-700">
                  {job.salary || "Competitive CTC"}
                </span>
              </div>

              {/* Skills */}
              {job.skillsRequired && job.skillsRequired.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
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

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                    >
                      Quick Apply
                    </button>
                  ) : job.applyUrl || job.applyLink ? (
                    <a
                      href={job.applyUrl || job.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-sm"
                    >
                      Apply Now
                    </a>
                  ) : (
                    <Link
                      to={`/opportunities?search=${encodeURIComponent(job.title)}`}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold transition shadow-sm"
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

      {/* Browse more CTA */}
      <div className="text-center pt-1">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline transition"
        >
          Browse all entry-level openings on CareerConnect →
        </Link>
      </div>
    </div>
  );
};

export default FresherRecommendedJobs;
