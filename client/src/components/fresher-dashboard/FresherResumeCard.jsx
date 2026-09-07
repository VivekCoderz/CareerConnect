import { Link } from "react-router-dom";

const FresherResumeCard = ({ resumeData = {} }) => {
  const hasResume = Boolean(resumeData?.resumeUrl || resumeData?.resumeName);
  const resumeName = resumeData?.resumeName || "Resume_Fresher_2026.pdf";
  const lastUpdated = resumeData?.uploadedAt
    ? new Date(resumeData.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Recently Updated";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Resume</h2>
          <p className="text-xs text-slate-500 mt-0.5">ATS-ready resume status and optimization tools</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-100">
          AI Analyzer Ready
        </span>
      </div>

      {!hasResume ? (
        <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1e3a8a] mx-auto flex items-center justify-center text-xl">
            📄
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Upload your resume to improve your job applications.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Our AI analyzer automatically audits your resume against target role ATS benchmarks.
            </p>
          </div>
          <Link
            to="/resume-builder"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Resume
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                PDF
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 line-clamp-1">{resumeName}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                  <span>Last updated: {lastUpdated}</span>
                  <span>·</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ATS Ready
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {resumeData.resumeUrl ? (
                <a
                  href={resumeData.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  View Resume
                </a>
              ) : (
                <Link
                  to="/resume-builder"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  View Resume
                </Link>
              )}

              <Link
                to="/resume-builder"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              >
                Update Resume
              </Link>

              <Link
                to="/resume-builder"
                className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Improve Resume
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FresherResumeCard;
