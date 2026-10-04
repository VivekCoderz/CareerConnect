import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getJobById } from "../../services/jobService";
import { getMyAppliedIds } from "../../services/applicationService";
import { applyToOpportunity, externalApplyUrl } from "../../utils/opportunityApply";
import { isCandidateUser } from "../../utils/userRoles";
import ShareButtons from "../../components/common/ShareButtons";
import ReportListingButton from "../../components/common/ReportListingButton";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const formatLakh = (n) => `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;

// Salary is shown only when the employer entered one.
const formatPay = (job) => {
  if (job.employmentType === "Internship" && job.stipend) return job.stipend;
  const { min = 0, max = 0, isNegotiable } = job.salaryRange || {};
  if (!min && !max) return null;
  const range = min && max && min !== max ? `${formatLakh(min)} – ${formatLakh(max)}` : formatLakh(max || min);
  return `${range} / yr${isNegotiable ? " (negotiable)" : ""}`;
};

const formatExperience = (exp) => {
  if (!exp) return null;
  const { minYears, maxYears, level } = exp;
  const years = Number.isFinite(minYears) && Number.isFinite(maxYears) && maxYears > 0
    ? `${minYears}–${maxYears} yrs`
    : null;
  return [level, years].filter(Boolean).join(" · ") || null;
};

// headquarters is stored as { city, state, country } (older profiles may have a string).
const formatHeadquarters = (hq) =>
  typeof hq === "string" ? hq : [hq?.city, hq?.state, hq?.country].filter(Boolean).join(", ");

const isClosed = (job) =>
  job.status !== "Published" || (job.deadline && new Date(job.deadline) < new Date());

const Header = ({ user }) => (
  <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
    <Link to="/home" className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
        CC
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">CAREERCONNECT</p>
        <p className="text-[10px] text-blue-600 font-bold tracking-wide uppercase mt-0.5">Jobs Hub</p>
      </div>
    </Link>
    <nav className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
      <Link to="/jobs" className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
        💼 All Jobs
      </Link>
      {user ? (
        isCandidateUser(user) && (
          <Link to="/applications" className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs">
            My Applications
          </Link>
        )
      ) : (
        <Link to="/login" className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs">
          Log in
        </Link>
      )}
    </nav>
  </header>
);

const Skeleton = () => (
  <div className="space-y-4 animate-pulse" aria-label="Loading job">
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3">
      <div className="h-7 bg-slate-200 rounded-lg w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-10 bg-slate-200 rounded-xl w-40 mt-4" />
    </div>
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-11/12" />
      <div className="h-4 bg-slate-200 rounded w-4/5" />
    </div>
  </div>
);

const StatusMessage = ({ title, text, children }) => (
  <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
    {text && <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{text}</p>}
    <div className="flex items-center justify-center gap-3 pt-2">{children}</div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 space-y-3">
    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
    {children}
  </section>
);

const SkillList = ({ skills }) => (
  <div className="flex flex-wrap gap-1.5">
    {skills.map((skill, i) => (
      <span key={`${skill}-${i}`}className="px-2.5 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200">
        {skill}
      </span>
    ))}
  </div>
);

const Fact = ({ label, value }) =>
  value ? (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  ) : null;

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // The result is tagged with the request it answers, so a new id or a retry shows
  // the skeleton until its own response arrives.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, status: "loading", job: null });
  const [appliedIds, setAppliedIds] = useState([]);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);

  const isCandidate = isCandidateUser(user);
  const validId = OBJECT_ID.test(id || "");
  const requestKey = `${id}:${attempt}`;
  const status = !validId ? "notfound" : result.key === requestKey ? result.status : "loading"; // loading | ready | notfound | error
  const job = status === "ready" ? result.job : null;
  const applied = appliedIds.includes(String(id));

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!validId) return;
    let active = true;
    getJobById(id)
      .then((res) => {
        if (active) setResult({ key: requestKey, status: res?.job ? "ready" : "notfound", job: res?.job || null });
      })
      .catch((err) => {
        if (active) setResult({ key: requestKey, status: err.response?.status === 404 ? "notfound" : "error", job: null });
      });
    return () => { active = false; };
  }, [id, validId, requestKey]);

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    getMyAppliedIds()
      .then((res) => {
        if (active) setAppliedIds((res.jobIds || []).map(String));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isCandidate]);

  const markApplied = () => setAppliedIds((ids) => (ids.includes(String(id)) ? ids : [...ids, String(id)]));

  const handleApply = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setApplying(true);
    try {
      const res = await applyToOpportunity(job, "Job");
      if (res.external) {
        if (!res.opened) showToast("This listing has no apply link.", "error");
        return;
      }
      if (res?.success) {
        markApplied();
        showToast(res.message || `Application submitted for "${job.title}"!`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Application could not be submitted.";
      if (/already applied/i.test(msg)) markApplied();
      showToast(msg, "error");
    } finally {
      setApplying(false);
    }
  };

  const companyName = job?.employerId?.companyName || job?.companyName || job?.company || "";
  const shareUrl = `${window.location.origin}/jobs/${id}`;
  const shareText = job ? `${job.title}${companyName ? ` at ${companyName}` : ""} – apply on E2Job: ${shareUrl}` : shareUrl;

  const renderApply = () => {
    if (job.isExternal) {
      const url = externalApplyUrl(job);
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition">
          Apply on {job.source || "company site"} ↗
        </a>
      ) : null;
    }
    // Employers and admins can view the job but not apply.
    if (user && !isCandidate) return null;
    if (applied) {
      return (
        <span className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
          ✓ Applied
        </span>
      );
    }
    return (
      <button type="button" onClick={handleApply} disabled={applying}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition">
        {applying ? "Applying…" : user ? "Apply Now" : "Log in to Apply"}
      </button>
    );
  };

  const renderJob = () => {
    const company = job.employerId && typeof job.employerId === "object" ? job.employerId : null;
    const pay = formatPay(job);
    const experience = formatExperience(job.experience);
    const place = job.location || [job.city, job.state].filter(Boolean).join(", ");

    return (
      <div className="space-y-4">
        <div className="p-5 sm:p-8 rounded-3xl bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-start gap-4">
            {company?.logo && (
              <img src={company.logo} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 shrink-0" />
            )}
            <div className="space-y-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight wrap-break-word">{job.title}</h1>
              {companyName && (company?._id ? (
                <Link to={`/companies/${company._id}`} className="text-sm font-bold text-blue-700 hover:underline">
                  {companyName}
                </Link>
              ) : (
                <p className="text-sm font-bold text-slate-700">{companyName}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {place && <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">📍 {place}</span>}
            {job.workMode && <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-semibold">{job.workMode}</span>}
            {job.employmentType && <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">{job.employmentType}</span>}
            {pay && <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">{pay}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {renderApply()}
            <ShareButtons url={shareUrl} text={shareText} onNotify={showToast} />
          </div>
        </div>

        <Section title="Job overview">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Fact label="Experience" value={experience} />
            <Fact label="Education" value={job.education} />
            <Fact label="Openings" value={job.openings > 0 ? job.openings : null} />
            <Fact label="Apply by" value={formatDate(job.deadline)} />
            <Fact label="Posted" value={formatDate(job.createdAt)} />
            <Fact label="Category" value={job.category} />
          </dl>
          {job.eligibility && <p className="text-sm text-slate-600">{job.eligibility}</p>}
        </Section>

        {job.requiredSkills?.length > 0 && (
          <Section title="Skills required">
            <SkillList skills={job.requiredSkills} />
            {job.preferredSkills?.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 pt-1">Good to have</p>
                <SkillList skills={job.preferredSkills} />
              </>
            )}
          </Section>
        )}

        {job.description && (
          <Section title="About the job">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line wrap-break-word">{job.description}</p>
          </Section>
        )}

        {job.responsibilities?.length > 0 && (
          <Section title="Responsibilities">
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
              {job.responsibilities.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </Section>
        )}

        {company && (company.description || company.industry || formatHeadquarters(company.headquarters)) && (
          <Section title={companyName ? `About ${companyName}` : "About the company"}>
            <p className="text-xs text-slate-500">{[company.industry, formatHeadquarters(company.headquarters)].filter(Boolean).join(" · ")}</p>
            {company.description && <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{company.description}</p>}
            <Link to={`/companies/${company._id}`} className="inline-block text-xs font-bold text-blue-700 hover:underline">
              View company profile →
            </Link>
          </Section>
        )}

        <div className="text-center px-4 space-y-2">
          <p className="text-[11px] text-slate-400">
            E2Job never asks candidates to pay for a job. If an employer asks you for money, don't pay.
          </p>
          {/* Visitors (asked to log in) and candidates can report; employers and admins can't. */}
          {!job.isExternal && (!user || isCandidate) && (
            <ReportListingButton opportunityType="Job" opportunityId={String(job._id)} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      {toast && (
        <div role="status" className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 ${
          toast.type === "error" ? "bg-rose-900 text-white border border-rose-700" : "bg-slate-900 text-white border border-slate-700"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 space-y-4">
        <Link to="/jobs" className="inline-block text-xs font-bold text-slate-500 hover:text-slate-800">← Back to jobs</Link>

        {status === "loading" && <Skeleton />}

        {(status === "notfound" || (status === "ready" && isClosed(job))) && (
          <StatusMessage title="This job is closed or no longer available"
            text="The employer may have filled the position or removed the listing.">
            <Link to="/jobs" className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition">
              Browse open jobs
            </Link>
          </StatusMessage>
        )}

        {status === "error" && (
          <StatusMessage title="We couldn't load this job" text="Check your internet connection and try again.">
            <button type="button" onClick={() => setAttempt((n) => n + 1)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">
              Retry
            </button>
          </StatusMessage>
        )}

        {status === "ready" && !isClosed(job) && renderJob()}
      </main>
    </div>
  );
}
