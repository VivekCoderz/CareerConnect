import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getById } from "../../services/internshipService";
import { applyToInternship } from "../../services/applicationService";

export default function InternshipDetail({ id, onBack, embedded = false }) {
  const { id: paramId } = useParams();
  const internshipId = id || paramId;

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getById(internshipId);
        if (res.success) setInternship(res.internship);
        else setError(res.message || "Failed to load internship details");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load internship details");
      } finally {
        setLoading(false);
      }
    };
    if (internshipId) fetchDetail();
  }, [internshipId]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setApplying(true);
      setError("");
      setSuccessMsg("");
      const res = await applyToInternship(internshipId, { coverNote, resumeUrl });
      if (res.success) {
        setSuccessMsg(res.message || "Application submitted successfully!");
        setCoverNote("");
        setResumeUrl("");
      } else {
        setError(res.message || "Failed to submit application");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error submitting application. You may have already applied."
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${embedded ? "" : "min-h-screen bg-[#f8fafc]"}`}>
        <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading details...</p>
      </div>
    );
  }

  if (error && !internship) {
    return (
      <div className={`flex items-center justify-center px-4 py-16 ${embedded ? "" : "min-h-screen bg-[#f8fafc]"}`}>
        <div className="max-w-md w-full text-center py-10 px-6 bg-white border border-slate-200 rounded-3xl">
          <p className="text-sm font-semibold text-red-600 mb-4">{error}</p>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold"
            >
              Back to Internships
            </button>
          ) : (
            <Link
              to="/internships"
              className="inline-flex h-10 px-5 items-center rounded-xl bg-[#1e3a8a] text-white text-xs font-bold"
            >
              Back to Internships
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!internship) return null;

  const body = (
    <>
      <div className="mb-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-[#1e3a8a]"
          >
            ← Back to listings
          </button>
        ) : (
          <Link to="/internships" className="text-xs font-bold text-slate-500 hover:text-[#1e3a8a]">
            ← Back to listings
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#f59e0b]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 mb-3">
            {internship.isExternal ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 border border-white/20">
                External · {internship.source || "API"}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 border border-emerald-300/30 text-emerald-100">
                ✓ Campus Exclusive
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 border border-white/15">
              {internship.workMode}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{internship.title}</h1>
          <p className="mt-2 text-base font-semibold text-blue-100">
            {internship.companyName || internship.employerId?.companyName}
          </p>
          <p className="mt-1 text-sm text-blue-100/80">📍 {internship.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
              Role description
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {internship.description}
            </p>
          </section>

          {internship.responsibilities?.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                Key responsibilities
              </h2>
              <ul className="space-y-2">
                {internship.responsibilities.map((resp, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1e3a8a] shrink-0" />
                    {resp}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {internship.requiredSkills?.length > 0 && (
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                Required skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {internship.requiredSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Overview
            </h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Stipend
                </dt>
                <dd className="text-sm font-bold text-[#1e3a8a] mt-0.5">
                  {internship.stipend || "Not disclosed"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Duration
                </dt>
                <dd className="text-sm font-semibold text-slate-800 mt-0.5">
                  {internship.duration || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Eligibility
                </dt>
                <dd className="text-sm font-semibold text-slate-800 mt-0.5">
                  {internship.eligibility || internship.education || "Open to students"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Deadline
                </dt>
                <dd className="text-sm font-semibold text-slate-800 mt-0.5">
                  {internship.deadline
                    ? new Date(internship.deadline).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Open"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            {successMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center mb-2">
                <p className="text-sm font-bold text-emerald-800">{successMsg}</p>
                {!embedded && (
                  <Link
                    to="/applications"
                    className="mt-2 inline-block text-xs font-bold text-[#1e3a8a] hover:underline"
                  >
                    View My Applications →
                  </Link>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-3">
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}

            {internship.isExternal ? (
              <div>
                <p className="text-xs text-slate-500 mb-4">
                  External listing — apply on the company website.
                </p>
                <a
                  href={internship.applyUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-bold"
                >
                  Apply on company site ↗
                </a>
              </div>
            ) : (
              !successMsg && (
                <form onSubmit={handleApply} className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Apply via CareerConnect</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Resume link
                    </label>
                    <input
                      type="url"
                      placeholder="Google Drive / Dropbox URL"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      required
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Cover note (optional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Why are you a good fit?"
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none resize-none focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={applying}
                    className="w-full h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-60 text-white text-sm font-bold"
                  >
                    {applying ? "Submitting..." : "Submit application"}
                  </button>
                </form>
              )
            )}
          </section>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="w-full space-y-2">{body}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold">
              GU
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Geeta University
              </p>
              <p className="text-sm font-bold text-slate-900">CareerConnect</p>
            </div>
          </Link>
          <Link to="/applications" className="text-xs font-bold text-[#1e3a8a]">
            My Applications →
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{body}</main>
    </div>
  );
}