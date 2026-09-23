import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAtsAPI, fixAtsResumeAPI } from "../../services/resumeService";
import { saveFinalResume, fetchAllSavedResumes, fetchProfileForResume } from "../../redux/features/resumeSlice";
import ATSSafeResumeRenderer from "./templates/ATSSafeResumeRenderer";
import {
  Sparkles,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Download,
  Save,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  Eye,
  MapPin,
  ChevronRight,
  Briefcase,
  Zap,
  ShieldCheck,
  Target,
  Columns,
  ClipboardList,
  UserCheck,
  Check,
} from "lucide-react";

export default function ATSCheckerAndFixer({ onSwitchToManualEdit }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { rawData: savedProfileData } = useSelector((state) => state.resume);

  // Phase: 'input' | 'report' | 'fixed'
  const [phase, setPhase] = useState("input");

  // Input source: 'upload' | 'paste' | 'profile'
  const [inputSource, setInputSource] = useState("upload");

  // Form inputs
  const [resumeFile, setResumeFile] = useState(null);
  const [pastedResumeText, setPastedResumeText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Loading & error
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Analysis result & fixed resume
  const [auditResult, setAuditResult] = useState(null);
  const [fixedData, setFixedData] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic"); // 'classic' | 'modern' | 'minimal'
  const [comparisonView, setComparisonView] = useState("fixed"); // 'fixed' | 'side-by-side' | 'original'
  const [activeMistakeFilter, setActiveMistakeFilter] = useState("all");

  const previewRef = useRef(null);

  // Ensure latest profile data is loaded when user arrives
  useEffect(() => {
    dispatch(fetchProfileForResume());
  }, [dispatch]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle ATS Scan
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setErrorMessage("Please paste the Job Description to check ATS compatibility.");
      return;
    }

    if (inputSource === "upload" && !resumeFile) {
      setErrorMessage("Please upload your resume file (PDF or DOCX).");
      return;
    }
    if (inputSource === "paste" && !pastedResumeText.trim()) {
      setErrorMessage("Please paste your resume text in the box.");
      return;
    }

    setErrorMessage("");
    setIsScanning(true);

    try {
      let payload;
      if (inputSource === "upload" && resumeFile) {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        formData.append("jobDescription", jobDescription.trim());
        formData.append("targetRole", targetRole.trim());
        formData.append("companyName", companyName.trim());
        payload = formData;
      } else if (inputSource === "paste") {
        payload = {
          resumeText: pastedResumeText.trim(),
          jobDescription: jobDescription.trim(),
          targetRole: targetRole.trim(),
          companyName: companyName.trim(),
        };
      } else {
        payload = {
          resumeData: {
            ...(savedProfileData || {}),
            personal: {
              ...(savedProfileData?.personal || {}),
              fullName: savedProfileData?.personal?.fullName || user?.name || user?.fullName || "Candidate",
              email: savedProfileData?.personal?.email || user?.email || "",
              phone: savedProfileData?.personal?.phone || user?.phone || "",
            },
          },
          jobDescription: jobDescription.trim(),
          targetRole: targetRole.trim(),
          companyName: companyName.trim(),
        };
      }

      const response = await checkAtsAPI(payload);
      if (response && response.atsScore !== undefined) {
        setAuditResult(response);
        setPhase("report");
      } else {
        setErrorMessage("Could not parse ATS report. Please try again.");
      }
    } catch (err) {
      console.error("ATS Check error:", err);
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to scan resume. Please ensure file or text is valid."
      );
    } finally {
      setIsScanning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Handle 1-Click Fix Your Resume
  // ─────────────────────────────────────────────────────────────────────────
  const handleFixResume = async () => {
    if (!auditResult) return;
    setIsFixing(true);
    setErrorMessage("");

    try {
      const candidateInfo = auditResult.candidateData || savedProfileData || {};
      const enrichedCandidate = {
        ...candidateInfo,
        personal: {
          ...(candidateInfo.personal || {}),
          fullName: candidateInfo.personal?.fullName || user?.name || user?.fullName || "Candidate",
          email: candidateInfo.personal?.email || user?.email || "",
          phone: candidateInfo.personal?.phone || user?.phone || "",
        },
      };

      const payload = {
        candidateData: enrichedCandidate,
        jobDescription: jobDescription.trim(),
        gapAnalysis: auditResult,
        template: selectedTemplate,
      };

      const res = await fixAtsResumeAPI(payload);
      if (res && res.fixedResume) {
        setFixedData(res);
        setPhase("fixed");
      } else {
        setErrorMessage("Failed to generate fixed resume. Please try again.");
      }
    } catch (err) {
      console.error("ATS Fix error:", err);
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to fix resume. Please try again."
      );
    } finally {
      setIsFixing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save fixed resume to user profile & database
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveFixedResume = async () => {
    if (!fixedData?.fixedResume) return;
    setIsSaving(true);
    setSaveMessage("");

    try {
      const title = `${companyName ? `${companyName} ` : ""}${targetRole || "ATS Optimized"} Resume`;
      const resultAction = await dispatch(
        saveFinalResume({
          title,
          isPrimary: false,
          overrideData: fixedData.fixedResume,
        })
      );

      if (saveFinalResume.fulfilled.match(resultAction)) {
        setSaveMessage("✅ Successfully saved to My Resumes!");
        dispatch(fetchAllSavedResumes());
      } else {
        setSaveMessage("Failed to save resume. Please try again.");
      }
    } catch (err) {
      setSaveMessage("Error saving resume.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper color for score
  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 border-emerald-500 bg-emerald-50";
    if (score >= 65) return "text-blue-600 border-blue-500 bg-blue-50";
    if (score >= 50) return "text-amber-600 border-amber-500 bg-amber-50";
    return "text-red-600 border-red-500 bg-red-50";
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: "High ATS Match (Interview Ready)", color: "bg-emerald-100 text-emerald-800" };
    if (score >= 65) return { label: "Good Potential (Minor Gaps)", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { label: "Moderate Match (Fix Needed)", color: "bg-amber-100 text-amber-800" };
    return { label: "High Rejection Risk (Mistakes Detected)", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ───────────────────────────────────────────────────────────────────
          PHASE 1: INPUT FORM (Upload Resume + Paste Job Description)
          ─────────────────────────────────────────────────────────────────── */}
      {phase === "input" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                AI ATS Gap Scanner & Auto-Fixer
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Audit Your Resume Against Any Job Description
              </h2>
              <p className="text-blue-100/80 text-xs sm:text-sm mt-2 leading-relaxed">
                Upload your resume, paste the target Job Description, and get an instant breakdown of your ATS score,
                missing skills with placement tips, exact mistake locations, and a 1-click AI resume repair.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartScan} className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: 3-Way Resume Input Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    1. Provide Your Resume <span className="text-red-500">*</span>
                  </label>
                </div>

                {/* 3-Way Tab Switcher */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInputSource("upload")}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputSource === "upload"
                        ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputSource("paste")}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputSource === "paste"
                        ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Paste Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputSource("profile")}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputSource === "profile"
                        ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Saved Profile</span>
                  </button>
                </div>

                {/* Option 1: File Upload */}
                {inputSource === "upload" && (
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/60 group">
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setResumeFile(file);
                          setErrorMessage("");
                        }
                      }}
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      {resumeFile ? (
                        <div>
                          <p className="text-sm font-bold text-slate-800">{resumeFile.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {(resumeFile.size / 1024).toFixed(1)} KB · Click to choose different file
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            Upload resume PDF or DOCX or <span className="text-blue-600 underline">Browse</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Accepts PDF, DOCX up to 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Option 2: Paste Raw Resume Text */}
                {inputSource === "paste" && (
                  <div className="space-y-2">
                    <textarea
                      value={pastedResumeText}
                      onChange={(e) => setPastedResumeText(e.target.value)}
                      placeholder="Paste your complete resume text here (Summary, Work Experience, Projects, Skills, Education)..."
                      rows={8}
                      className="w-full border border-slate-300 rounded-2xl p-4 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y leading-relaxed"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Pure plain text parsing enabled</span>
                      <span>{pastedResumeText.length} characters</span>
                    </div>
                  </div>
                )}

                {/* Option 3: Saved Profile Data */}
                {inputSource === "profile" && (
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-blue-950">Active CareerConnect Profile</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Using verified details directly from your account for{" "}
                      <strong className="text-slate-900">
                        {savedProfileData?.personal?.fullName || user?.fullName || user?.name || "Candidate"}
                      </strong>
                      :
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-semibold block">Education:</span>
                        <span className="font-bold text-slate-800">
                          {savedProfileData?.education?.length || 0} entries on file
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                        <span className="text-slate-500 font-semibold block">Experience &amp; Projects:</span>
                        <span className="font-bold text-slate-800">
                          {(savedProfileData?.experience?.length || 0) + (savedProfileData?.projects?.length || 0)} entries
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Role & Company Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Role (Optional)
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., Full Stack Engineer"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Company (Optional)
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Google, Amazon, TCS"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Job Description */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    2. Paste Job Description <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {jobDescription.length} characters
                  </span>
                </label>

                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job posting or requirements here (responsibilities, required tech stack, qualifications)..."
                  rows={9}
                  className="w-full border border-slate-300 rounded-2xl p-4 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                  required
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isScanning}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Resume Against Job...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Run ATS Audit &amp; Gap Check →</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          PHASE 2: ATS AUDIT REPORT & MISTAKE BREAKDOWN
          ─────────────────────────────────────────────────────────────────── */}
      {phase === "report" && auditResult && (
        <div className="space-y-6">
          {/* Top Score Summary Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                {/* Radial / Circle ATS Score */}
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-8 flex flex-col items-center justify-center font-black shadow-inner shrink-0 ${getScoreColor(
                    auditResult.atsScore
                  )}`}
                >
                  <span className="text-3xl sm:text-4xl leading-none">{auditResult.atsScore}%</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-500">
                    ATS Score
                  </span>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${getScoreBadge(auditResult.atsScore).color}">
                    {getScoreBadge(auditResult.atsScore).label}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Match Analysis for {auditResult.targetRole || "Target Opportunity"}
                  </h3>
                  {auditResult.companyName && (
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Target Company: {auditResult.companyName}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-2 max-w-lg leading-relaxed">
                    We identified{" "}
                    <strong className="text-red-600">
                      {(auditResult.mistakesAndIssues || []).length} mistake(s)
                    </strong>{" "}
                    and{" "}
                    <strong className="text-blue-600">
                      {(auditResult.skillGapAnalysis?.missingCriticalSkills || []).length} missing critical skill(s)
                    </strong>{" "}
                    that may hurt your interview shortlisting chances.
                  </p>
                </div>
              </div>

              {/* Big CTA: Fix Your Resume */}
              <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleFixResume}
                  disabled={isFixing}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
                >
                  {isFixing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Repairing All Mistakes with LaTeX Format…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Fix My Resume ✨</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center sm:text-right">
                  Automatically rewrites weak bullets, fixes all mistakes &amp; applies LaTeX ATS layout
                </p>
              </div>
            </div>

            {/* Score Component Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-[11px] font-semibold text-slate-500">Keywords Match</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {auditResult.scoreBreakdown?.keywordMatch || 60}%
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-[11px] font-semibold text-slate-500">Experience &amp; Metrics</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {auditResult.scoreBreakdown?.experienceImpact || 55}%
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-[11px] font-semibold text-slate-500">ATS Layout &amp; Clarity</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {auditResult.scoreBreakdown?.formattingAndClarity || 90}%
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-[11px] font-semibold text-slate-500">Skills Coverage</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {auditResult.scoreBreakdown?.skillsCoverage || 50}%
                </p>
              </div>
            </div>
          </div>

          {/* Skill Gap Analysis Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Skill Gap Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Technologies required by this job vs what is detected in your resume, with exact placement advice.
                </p>
              </div>
            </div>

            {/* Missing Critical Skills with Where to Add */}
            {(auditResult.skillGapAnalysis?.missingCriticalSkills || []).length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Missing Critical Skills ({auditResult.skillGapAnalysis.missingCriticalSkills.length}) — High Priority
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {auditResult.skillGapAnalysis.missingCriticalSkills.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-red-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          Required
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold shrink-0">💡 Kaha add karein:</span>
                        <span>{item.whereToAdd || "Add to Skills section or mention in relevant Project bullet"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Preferred Skills */}
            {(auditResult.skillGapAnalysis?.missingPreferredSkills || []).length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Missing Preferred / Nice-to-Have Skills ({auditResult.skillGapAnalysis.missingPreferredSkills.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {auditResult.skillGapAnalysis.missingPreferredSkills.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Bonus
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold shrink-0">💡 Kaha add karein:</span>
                        <span>{item.whereToAdd || "Add to Skills > Tools & Technologies"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Skills Already Present */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Matching Skills Found ({auditResult.skillGapAnalysis?.matchingSkills?.length || 0})
              </p>
              <div className="flex flex-wrap gap-2">
                {(auditResult.skillGapAnalysis?.matchingSkills || []).map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold"
                  >
                    <span>✓</span>
                    <span>{m.name || m}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mistakes & Issues Audit with Exact Locations */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Mistakes &amp; Weaknesses Detected ({auditResult.mistakesAndIssues?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specific lines, passive verbs, and missing metrics with their exact section locations.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMistakeFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeMistakeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  All ({auditResult.mistakesAndIssues?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMistakeFilter("verb")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeMistakeFilter === "verb" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Weak Verbs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMistakeFilter("metric")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeMistakeFilter === "metric" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Missing Metrics
                </button>
              </div>
            </div>

            {/* List of Mistakes */}
            <div className="space-y-4">
              {(auditResult.mistakesAndIssues || [])
                .filter((issue) => {
                  if (activeMistakeFilter === "verb") return issue.issueType?.toLowerCase().includes("verb");
                  if (activeMistakeFilter === "metric") return issue.issueType?.toLowerCase().includes("metric");
                  return true;
                })
                .map((issue, idx) => (
                  <div
                    key={issue.id || idx}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    {/* Location Badge & Issue Type */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-100/70 text-blue-900 font-bold text-xs">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Kaha mistake hai: {issue.location}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {issue.issueType || "Weakness"}
                      </span>
                    </div>

                    {/* Original Snippet */}
                    {issue.originalSnippet && (
                      <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/70">
                        <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide mb-0.5">
                          Current Text in Resume:
                        </p>
                        <p className="text-xs text-slate-800 italic">"{issue.originalSnippet}"</p>
                      </div>
                    )}

                    {/* Description of why it's a mistake */}
                    <p className="text-xs text-slate-600 leading-relaxed">{issue.description}</p>

                    {/* Suggested Replacement */}
                    {issue.suggestion && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide mb-0.5">
                          ✨ Suggested Improvement / Fix:
                        </p>
                        <p className="text-xs text-slate-900 font-medium">{issue.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Bottom CTA to Trigger 1-Click Fix */}
            <div className="pt-4 flex items-center justify-between flex-wrap gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPhase("input")}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                ← Scan Another Job
              </button>
              <button
                type="button"
                onClick={handleFixResume}
                disabled={isFixing}
                className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fixing Your Resume…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply All Fixes &amp; Generate Resume (1-Click) →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          PHASE 3: FIXED RESUME & LIVE PREVIEW & DOWNLOAD
          ─────────────────────────────────────────────────────────────────── */}
      {phase === "fixed" && fixedData && (
        <div className="space-y-6">
          {/* PROMINENT BEFORE VS AFTER COMPARISON BANNER */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden no-print">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  All Mistakes Resolved &amp; ATS Tailored
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">Your Resume Has Been Upgraded!</h2>
                <p className="text-emerald-100/80 text-xs sm:text-sm max-w-xl">
                  Rephrased weak bullets with engineering action verbs, integrated quantifiable metrics, and formatted
                  into a clean single-column ATS layout for maximum recruiter visibility.
                </p>
              </div>

              {/* Bold Score Comparison Display */}
              <div className="flex items-center gap-3 sm:gap-5 bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 shrink-0">
                <div className="text-center px-2">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Pehle (Original)
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-300 mt-0.5">
                    {fixedData.previousAtsScore || auditResult?.atsScore || 58}%
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 font-semibold">
                    Rejection Risk
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">➔</span>
                  <span className="text-[10px] font-bold text-emerald-300 mt-1">
                    +{(fixedData.improvedAtsScore || 94) - (fixedData.previousAtsScore || auditResult?.atsScore || 58)}%
                  </span>
                </div>

                <div className="text-center px-2">
                  <p className="text-[10px] sm:text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                    Fix Ke Baad
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-400 mt-0.5">
                    {fixedData.improvedAtsScore || 94}%
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-semibold">
                    Interview Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Badges of fixes */}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/15 text-xs text-emerald-200">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Replaced passive verbs with power action verbs
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Added measurable impact &amp; metrics
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% Single-Column Layout (Zero ATS Traps)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Professional 11pt Readable Hierarchy
              </span>
            </div>
          </div>

          {/* Action Toolbar: Back, View Switcher, Save, Download */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhase("report")}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer text-center"
              >
                ← Mistakes Audit
              </button>

              {/* Before vs After View Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setComparisonView("fixed")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    comparisonView === "fixed"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fixed Resume</span>
                </button>

                <button
                  type="button"
                  onClick={() => setComparisonView("side-by-side")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    comparisonView === "side-by-side"
                      ? "bg-white text-blue-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-blue-600" />
                  <span>Side-by-Side</span>
                </button>

                <button
                  type="button"
                  onClick={() => setComparisonView("original")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    comparisonView === "original"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Original</span>
                </button>
              </div>
            </div>

            {/* Actions: Save Resume & Download Resume ONLY */}
            <div className="flex flex-wrap items-center gap-2">
              {saveMessage && (
                <span
                  className={`text-xs font-semibold px-3 py-2 rounded-xl text-center ${
                    saveMessage.includes("✅")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {saveMessage}
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveFixedResume}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving…" : "💾 Save Resume"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (comparisonView !== "fixed") {
                    setComparisonView("fixed");
                    setTimeout(() => window.print(), 100);
                  } else {
                    window.print();
                  }
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>📥 Download Resume</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: FIXED RESUME (FULL VIEW - PRINT TARGET)
              ───────────────────────────────────────────────────────────── */}
          {comparisonView === "fixed" && (
            <div className="w-full overflow-x-auto pb-6 print:overflow-visible print:pb-0 print:p-0">
              <div
                id="resume-print-area"
                ref={previewRef}
                className="min-w-[650px] sm:min-w-0 w-full max-w-[850px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden transition-all duration-200 print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:max-w-full print:min-w-0 print:overflow-visible"
              >
                {/* Visual Header bar in UI */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between no-print bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Fixed &amp; Optimized Resume</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ATS Score: {fixedData.improvedAtsScore || 94}%
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">
                    Theme: {selectedTemplate} ATS
                  </span>
                </div>

                {/* Pure single-column ATS Renderer */}
                <div className="p-4 sm:p-6 print:p-0">
                  <ATSSafeResumeRenderer data={fixedData.fixedResume} templateId={selectedTemplate} />
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 2: SIDE-BY-SIDE COMPARISON (ORIGINAL VS FIXED)
              ───────────────────────────────────────────────────────────── */}
          {comparisonView === "side-by-side" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 no-print">
              {/* Left Column: Original Pre-Fix Resume */}
              <div className="bg-white rounded-2xl shadow-md border border-red-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-red-100 bg-red-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-950">Original Resume (Before)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800 border border-red-300">
                      ATS: {fixedData.previousAtsScore || auditResult?.atsScore || 58}%
                    </span>
                  </div>
                  <span className="text-[11px] text-red-600 font-semibold">Contains Weaknesses</span>
                </div>
                <div className="p-4 sm:p-5 opacity-85">
                  <ATSSafeResumeRenderer
                    data={auditResult?.candidateData || savedProfileData}
                    templateId={selectedTemplate}
                  />
                </div>
              </div>

              {/* Right Column: AI-Fixed Resume */}
              <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-500/80 overflow-hidden">
                <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50/90 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950">AI-Optimized (After Fix)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-400 font-black">
                      ATS: {fixedData.improvedAtsScore || 94}%
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">✨ Power Verbs + Metrics</span>
                </div>
                <div className="p-4 sm:p-5">
                  <ATSSafeResumeRenderer data={fixedData.fixedResume} templateId={selectedTemplate} />
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 3: ORIGINAL RESUME ONLY
              ───────────────────────────────────────────────────────────── */}
          {comparisonView === "original" && (
            <div className="w-full overflow-x-auto pb-6 no-print">
              <div className="min-w-[650px] sm:min-w-0 w-full max-w-[850px] mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Original Resume View</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                    ATS Score: {fixedData.previousAtsScore || auditResult?.atsScore || 58}%
                  </span>
                </div>
                <div className="p-4 sm:p-6">
                  <ATSSafeResumeRenderer
                    data={auditResult?.candidateData || savedProfileData}
                    templateId={selectedTemplate}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          DEDICATED ATS PRINT STYLESHEET
          ─────────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header:not(.resume-header), nav, footer {
            display: none !important;
          }
          #resume-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #resume-print-area header.resume-header,
          #resume-print-area .resume-header {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
          }
          #resume-print-area .resume-contact-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px 8px !important;
            width: 100% !important;
          }
          #resume-print-area .resume-contact-row.is-modern {
            justify-content: flex-start !important;
          }
          #resume-print-area .resume-contact-item,
          #resume-print-area .resume-contact-link {
            display: inline-block !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
          }
          #resume-print-area .resume-contact-separator {
            display: inline-block !important;
            padding: 0 6px !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          a[href]:after {
            content: "" !important;
          }
        }
      `}</style>

    </div>
  );
}
