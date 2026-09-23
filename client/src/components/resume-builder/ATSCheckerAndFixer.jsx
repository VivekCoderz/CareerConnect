import { useEffect, useState } from "react";
import { Download, FileCheck2, FileText, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { checkAtsPdfAPI, optimizeAtsPdfAPI } from "../../services/resumeService";

const FILE_LIMIT = 10 * 1024 * 1024;

function PdfInput({ id, title, file, onChange, disabled = false }) {
  return (
    <label htmlFor={id} className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/60">
      <input
        id={id}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-200">
        {file ? <FileCheck2 className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
      </span>
      <span className="text-base font-bold text-slate-900">{title}</span>
      <span className="mt-2 max-w-full break-all text-sm text-slate-600">{file ? file.name : "Choose a text-based PDF"}</span>
      <span className="mt-2 text-xs text-slate-500">Maximum 10 MB</span>
    </label>
  );
}

function ScoreCard({ label, score, className = "" }) {
  return (
    <div className={`rounded-2xl border p-5 text-center ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-4xl font-extrabold">{score}<span className="text-xl">/100</span></p>
    </div>
  );
}

export default function ATSCheckerAndFixer() {
  const [jobDescription, setJobDescription] = useState(null);
  const [resume, setResume] = useState(null);
  const [audit, setAudit] = useState(null);
  const [optimized, setOptimized] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [guidance, setGuidance] = useState(null);
  const [additionalEvidence, setAdditionalEvidence] = useState("");
  const [confirmedSkills, setConfirmedSkills] = useState([]);
  const [confirmedEvidence, setConfirmedEvidence] = useState(false);


  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  const validateFile = (file) => {
    if (!file) return false;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > FILE_LIMIT) {
      setError("Please choose a PDF file no larger than 10 MB.");
      return false;
    }
    setError("");
    setAudit(null);
    setOptimized(null);
    setGuidance(null);
    setAdditionalEvidence("");
    setConfirmedSkills([]);
    setConfirmedEvidence(false);
    setDownloadUrl("");
    return true;
  };

  const runAudit = async () => {
    if (!jobDescription || !resume) {
      setError("Upload the job description PDF and the resume PDF to continue.");
      return;
    }
    setBusy("check");
    setError("");
    setGuidance(null);
    setOptimized(null);
    setDownloadUrl("");
    try {
      const result = await checkAtsPdfAPI(resume, jobDescription);
      setAudit(result);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The PDFs could not be checked. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const optimize = async () => {
    if (!audit || !resume || !jobDescription) return;
    if (guidance && ((!additionalEvidence.trim() && !confirmedSkills.length) || !confirmedEvidence)) return;
    setBusy("optimize");
    setError("");
    setOptimized(null);
    setDownloadUrl("");
    try {
      const result = await optimizeAtsPdfAPI(
        resume,
        jobDescription,
        guidance ? additionalEvidence : "",
        guidance ? confirmedSkills : [],
        guidance ? confirmedEvidence : false
      );
      const bytes = Uint8Array.from(atob(result.pdfBase64), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setDownloadUrl(url);
      setOptimized(result);
      setGuidance(null);
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.code === "INSUFFICIENT_EVIDENCE") {
        setGuidance(response);
      } else {
        setError(response?.message || "The optimized PDF could not be generated. Please try again.");
      }
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-7 text-white shadow-lg sm:p-10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-200">
          <ShieldCheck className="h-4 w-4" /> Resume compatibility
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Check your resume against a job</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
          Upload the job description and the resume you plan to submit. We score the readable text in both PDFs and show the evidence behind your result.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <PdfInput id="ats-job-pdf" title="1. Job description PDF" file={jobDescription} disabled={Boolean(busy)} onChange={(file) => { if (validateFile(file)) setJobDescription(file); }} />
        <PdfInput id="ats-resume-pdf" title="2. Your resume PDF" file={resume} disabled={Boolean(busy)} onChange={(file) => { if (validateFile(file)) setResume(file); }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="max-w-xl text-sm text-slate-600">Scoring is an estimate based on the job description. The actual employer may use different screening rules.</p>
        <button type="button" onClick={runAudit} disabled={Boolean(busy) || !resume || !jobDescription} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          {busy === "check" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {busy === "check" ? "Checking both PDFs…" : "Check resume match"}
        </button>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</div>}
      {guidance && (
        <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950" role="status">
          <div>
            <h3 className="text-base font-bold">Strengthen your fresher resume</h3>
            <p className="mt-1">Reformatting your current resume scored {guidance.optimized.atsScore}/100, compared with {guidance.original.atsScore}/100 before. The target is {guidance.targetScore}/100. Work experience is not required: relevant skills, coursework and academic projects can help.</p>
          </div>
          {guidance.optimized.missingSkills.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="font-semibold">Select skills you genuinely have but left off your resume</legend>
              <div className="flex flex-wrap gap-2">
                {guidance.optimized.missingSkills.map((skill) => (
                  <label key={skill} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2">
                    <input type="checkbox" checked={confirmedSkills.includes(skill)} onChange={(event) => setConfirmedSkills((current) => event.target.checked ? [...current, skill] : current.filter((item) => item !== skill))} disabled={Boolean(busy)} />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div>
            <label htmlFor="ats-additional-evidence" className="font-semibold">Add coursework, academic projects, volunteering or work details (optional)</label>
            <p className="mt-1 text-xs">Describe what you actually did or learned. You can leave this blank if you only need to add skills.</p>
            <textarea id="ats-additional-evidence" value={additionalEvidence} onChange={(event) => setAdditionalEvidence(event.target.value)} disabled={Boolean(busy)} maxLength={2500} rows={5} className="mt-2 w-full rounded-xl border border-amber-300 bg-white p-3 text-slate-900 focus:border-blue-600 focus:outline-none disabled:opacity-60" placeholder="Example: Completed a database coursework project using SQL and Python..." />
          </div>
          <label className="flex items-start gap-2"><input type="checkbox" checked={confirmedEvidence} onChange={(event) => setConfirmedEvidence(event.target.checked)} disabled={Boolean(busy)} className="mt-1" /><span>I confirm the selected skills and details are accurate and belong to me.</span></label>
          <button type="button" onClick={optimize} disabled={Boolean(busy) || (!additionalEvidence.trim() && !confirmedSkills.length) || !confirmedEvidence} className="rounded-xl bg-amber-900 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy === "optimize" ? "Rebuilding and checking PDF…" : "Rebuild with my skills and projects"}</button>
        </div>
      )}

      {audit && (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Match report</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-950">{audit.targetRole}</h3>
              <p className="mt-1 text-sm text-slate-600">Scores below 70 can be considered for a verified resume rebuild.</p>
            </div>
            <ScoreCard label="Current resume" score={audit.atsScore} className="min-w-44 border-blue-200 bg-blue-50 text-blue-950" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {audit.scoreParameters.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between gap-3 text-sm font-semibold text-slate-800"><span>{item.label}</span><span>{item.earned}/{item.maximum}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${100 * item.earned / item.maximum}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="font-bold text-emerald-950">Skills found in your PDF</h4>
              <p className="mt-2 text-sm text-emerald-900">{audit.matchedSkills.length ? audit.matchedSkills.join(", ") : "No listed job skills were detected."}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-bold text-amber-950">Requirements without resume evidence</h4>
              <p className="mt-2 text-sm text-amber-900">{audit.missingSkills.length ? audit.missingSkills.join(", ") : "No listed skill gaps were detected."}</p>
            </div>
          </div>

          {audit.requiresFix && !guidance && !optimized ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-950 p-5 text-white">
              <div><h4 className="font-bold">Rebuild and verify your resume</h4><p className="mt-1 max-w-lg text-xs leading-5 text-slate-300">We retain your source content and check the generated PDF against the same job description. If the available evidence cannot improve the score, we will show what is missing.</p></div>
              <button type="button" onClick={optimize} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50">
                {busy === "optimize" && <RefreshCw className="h-4 w-4 animate-spin" />}
                {busy === "optimize" ? "Creating and checking PDF…" : "Rebuild my resume"}
              </button>
            </div>
          ) : !audit.requiresFix ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Your resume meets the 70-point threshold. A replacement is not required.</p> : null}
        </div>
      )}

      {optimized && downloadUrl && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h3 className="text-xl font-bold text-emerald-950">Improved PDF ready to download</h3><p className="mt-1 text-sm text-emerald-900">We read the generated PDF and confirmed its score against the same job description.</p></div>
            <div className="flex gap-3"><ScoreCard label="Before" score={optimized.original.atsScore} className="border-emerald-200 bg-white text-emerald-950" /><ScoreCard label="After" score={optimized.optimized.atsScore} className="border-emerald-300 bg-white text-emerald-950" /></div>
          </div>
          <p className="mt-5 text-sm font-semibold text-emerald-950">Verified improvement: +{optimized.improvement} points.</p>
          {optimized.optimized.atsScore < 80 && <p className="mt-2 text-sm text-emerald-950">This is a meaningful improvement, although it is still below the 80-point goal. Add only genuine skills or project details to strengthen it further.</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={downloadUrl} download={optimized.fileName} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"><Download className="h-4 w-4" /> Download PDF</a>
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-white">Preview PDF</a>
            <a href={`data:text/x-tex;charset=utf-8,${encodeURIComponent(optimized.latex)}`} download="CareerConnect_ATS_Resume.tex" className="inline-flex items-center rounded-xl border border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-white">Download LaTeX source</a>
          </div>
        </div>
      )}
    </section>
  );
}
