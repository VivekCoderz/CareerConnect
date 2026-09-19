import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import BrandLogo from "../../components/common/BrandLogo";
import JourneyLoader from "../../components/common/JourneyLoader";
import {
  analyzeATSResumeAPI,
  fetchAllResumesAPI,
  parseResumeAPI,
  tailorResumeAPI,
} from "../../services/resumeService";
import { getResumeHref } from "../../utils/resumeAccess";

const splitSkills = (value) => value
  .split(",")
  .map((skill) => skill.trim())
  .filter(Boolean)
  .slice(0, 50);

const ScoreRing = ({ score, label = "ATS match" }) => {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#2563eb" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-36 h-36 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)` }}
      />
      <div className="absolute inset-[10px] rounded-full bg-white flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900">{score}</span>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
    </div>
  );
};

const SkillPills = ({ items, tone, emptyText }) => (
  <div className="flex flex-wrap gap-2">
    {items?.length ? items.map((item) => (
      <span
        key={item}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tone === "good" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}
      >
        {item}
      </span>
    )) : <span className="text-sm text-slate-500">{emptyText}</span>}
  </div>
);

export default function ATSChecker() {
  const navigate = useNavigate();
  const [savedResumes, setSavedResumes] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [resumeLabel, setResumeLabel] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [afterAnalysis, setAfterAnalysis] = useState(null);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllResumesAPI()
      .then((response) => {
        const resumes = response.resumes || [];
        setSavedResumes(resumes);
        const preferred = resumes.find((resume) => resume.isPrimary && !resume.isTailored) || resumes.find((resume) => !resume.isTailored);
        if (preferred) {
          setResumeData(preferred.generatedData || preferred.rawData);
          setResumeLabel(preferred.title || "Saved resume");
        }
      })
      .catch(() => setSavedResumes([]))
      .finally(() => setLoadingSaved(false));
  }, []);

  const payload = useMemo(() => ({
    resumeData,
    jobTitle: jobTitle.trim(),
    jobDescription: jobDescription.trim(),
    requiredSkills: splitSkills(skillsText),
  }), [resumeData, jobTitle, jobDescription, skillsText]);

  const selectResume = (id) => {
    const resume = savedResumes.find((item) => item._id === id);
    setResumeData(resume ? (resume.generatedData || resume.rawData) : null);
    setResumeLabel(resume?.title || "");
    setAnalysis(null);
    setAfterAnalysis(null);
    setTailoredResume(null);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume for the basic ATS test.");
      return;
    }
    setUploading(true);
    setError("");
    setAnalysis(null);
    setAfterAnalysis(null);
    setTailoredResume(null);
    try {
      const response = await parseResumeAPI(file);
      if (!response.parsedData) throw new Error("The resume could not be read");
      setResumeData(response.parsedData);
      setResumeLabel(file.name);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || "Resume upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const validate = () => {
    if (!resumeData) return "Select or upload your resume.";
    if (!jobTitle.trim()) return "Enter the target job title.";
    if (jobDescription.trim().length < 30) return "Paste at least 30 characters of the job description.";
    return "";
  };

  const handleAnalyze = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setAnalyzing(true);
    setError("");
    setAfterAnalysis(null);
    setTailoredResume(null);
    try {
      const response = await analyzeATSResumeAPI(payload);
      setAnalysis(response.analysis);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "ATS analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTailor = async () => {
    if (!analysis) return;
    setTailoring(true);
    setError("");
    try {
      const opportunityData = {
        title: jobTitle.trim(),
        description: jobDescription.trim(),
        requiredSkills: splitSkills(skillsText),
      };
      const tailored = await tailorResumeAPI({
        opportunityType: "Job",
        opportunityData,
        sourceResumeData: resumeData,
        template: "classic",
        forceRegenerate: true,
      });
      const generatedData = tailored.generatedData || tailored.resume?.generatedData;
      if (!generatedData) throw new Error("Tailored resume was not generated");
      setTailoredResume(tailored.resume);
      const rescored = await analyzeATSResumeAPI({ ...payload, resumeData: generatedData });
      setAfterAnalysis(rescored.analysis);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Tailored resume generation failed");
    } finally {
      setTailoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
            <ArrowLeft size={18} /> Back
          </button>
          <BrandLogo className="h-9 w-auto" />
          <button onClick={() => navigate("/resume-builder")} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Resume Builder
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section className="rounded-3xl bg-linear-to-br from-blue-950 via-blue-800 to-indigo-700 text-white p-7 sm:p-10 shadow-xl shadow-blue-900/15 overflow-hidden relative">
          <div className="absolute w-64 h-64 rounded-full bg-cyan-400/15 blur-3xl -right-16 -top-16" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wide uppercase">
              <Sparkles size={14} /> Basic MVP
            </div>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight">ATS Resume Lab</h1>
            <p className="mt-3 text-blue-100 text-base sm:text-lg leading-relaxed">
              Compare your real resume with a job description, identify gaps, and create a role-specific ATS friendly version without inventing experience.
            </p>
          </div>
        </section>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center"><FileUp size={22} /></div>
              <div><h2 className="font-bold text-lg">1. Choose your resume</h2><p className="text-sm text-slate-500">Use a saved resume or upload a PDF.</p></div>
            </div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Saved resume</label>
            <select
              disabled={loadingSaved}
              onChange={(event) => selectResume(event.target.value)}
              value={savedResumes.find((item) => (item.generatedData || item.rawData) === resumeData)?._id || ""}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{loadingSaved ? "Loading resumes..." : "Select a saved resume"}</option>
              {savedResumes.filter((resume) => !resume.isTailored).map((resume) => <option key={resume._id} value={resume._id}>{resume.title}</option>)}
            </select>
            <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-px bg-slate-200 flex-1" />OR<span className="h-px bg-slate-200 flex-1" /></div>
            <label className="flex items-center justify-center gap-3 min-h-28 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              {uploading ? <JourneyLoader size="compact" message="Reading your resume" /> : <><FileUp className="text-blue-600" /><span className="font-semibold text-blue-800">Upload PDF resume</span></>}
              <input type="file" accept="application/pdf,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            {resumeLabel && <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> {resumeLabel}</div>}
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Target size={22} /></div>
              <div><h2 className="font-bold text-lg">2. Add target job</h2><p className="text-sm text-slate-500">Paste the original description for accurate matching.</p></div>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Job title</label><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={150} placeholder="e.g. Frontend Developer" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Required skills <span className="font-normal text-slate-400">(optional, comma separated)</span></label><input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="React, JavaScript, REST API" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Job description</label><textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={15000} rows={7} placeholder="Paste responsibilities, requirements and preferred skills..." className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" /></div>
            </div>
          </section>
        </div>

        <button onClick={handleAnalyze} disabled={analyzing || uploading} className="mt-6 w-full rounded-2xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-700/20 transition">
          {analyzing ? <><RefreshCw size={20} className="animate-spin" /> Analyzing match...</> : <><FileSearch size={20} /> Check ATS Match Score</>}
        </button>

        {analysis && (
          <section className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-7">
              <ScoreRing score={analysis.overallScore} />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">{analysis.rating}</p>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">Your resume versus {jobTitle}</h2>
                <p className="text-sm text-slate-500 mt-2">{analysis.disclaimer}</p>
                {afterAnalysis && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700">Tailored score: {afterAnalysis.overallScore}/100 · {afterAnalysis.overallScore - analysis.overallScore >= 0 ? "+" : ""}{afterAnalysis.overallScore - analysis.overallScore} points</div>}
              </div>
              <button onClick={handleTailor} disabled={tailoring} className="rounded-2xl bg-slate-950 hover:bg-blue-950 disabled:bg-slate-400 text-white px-6 py-4 font-bold flex items-center justify-center gap-2 min-w-56 transition">
                {tailoring ? <><RefreshCw size={19} className="animate-spin" /> Creating...</> : <><Sparkles size={19} /> Create ATS Resume</>}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {Object.entries(analysis.sections).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex justify-between text-sm font-semibold"><span className="capitalize text-slate-600">{key}</span><span>{value}/{analysis.sectionMaximums[key]}</span></div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, (value / analysis.sectionMaximums[key]) * 100)}%` }} /></div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mt-8">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5"><h3 className="font-bold text-emerald-900 mb-3">Matched skills</h3><SkillPills items={analysis.matchedSkills} tone="good" emptyText="No direct skill match detected yet." /></div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5"><h3 className="font-bold text-amber-900 mb-3">Missing or unsupported skills</h3><SkillPills items={analysis.missingSkills} tone="warn" emptyText="No major skill gaps detected." /></div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold mb-4">Recommended improvements</h3><div className="space-y-3">{analysis.suggestions.map((item, index) => <div key={`${item.section}-${index}`} className="flex gap-3 text-sm"><span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.priority === "high" ? "bg-red-500" : item.priority === "medium" ? "bg-amber-500" : "bg-blue-500"}`} /><div><span className="font-bold text-slate-800">{item.section}: </span><span className="text-slate-600">{item.message}</span></div></div>)}</div></div>

            {tailoredResume?.resumeUrl && (
              <div className="mt-6 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><p className="font-black text-lg">Your tailored resume is ready</p><p className="text-emerald-50 text-sm mt-1">Review it before applying. It only uses information from your selected resume.</p></div>
                <a href={getResumeHref(tailoredResume.resumeUrl)} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-emerald-700 px-5 py-3 font-bold flex items-center gap-2 hover:bg-emerald-50"><Download size={18} /> Open PDF</a>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
