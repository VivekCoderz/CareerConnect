import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  tailorResumeAPI,
  fetchTailoredResumeAPI,
  fetchAllResumesAPI,
  uploadResumeAPI,
} from "../../services/resumeService";
import { applyToInternship, applyToJob } from "../../services/applicationService";
import ResumePreview from "./ResumePreview";
import { RESUME_TEMPLATES } from "../../data/templates";

export default function TailoredResumeApplicationModal({
  isOpen,
  onClose,
  opportunity,
  opportunityType = "Job", // "Job" | "Internship"
  onApplicationSubmitted,
  onAppliedSuccess,
}) {
  const { user } = useSelector((state) => state.auth);
  const fileInputRef = useRef(null);

  // Flow State: 'select' | 'ai_tailor' | 'own_resume' | 'submitted'
  const [flowStep, setFlowStep] = useState("select");

  // General States
  const [error, setError] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Option 1: AI Tailoring States
  const [loadingAI, setLoadingAI] = useState(false);
  const [isReGenerating, setIsReGenerating] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");

  // Option 2: Own Resume States
  const [ownResumeTab, setOwnResumeTab] = useState("saved"); // 'saved' | 'upload'
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedOwnResume, setSelectedOwnResume] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const oppId = opportunity?._id || opportunity?.id;
  const oppTitle = opportunity?.title || "Opportunity";
  const compName = opportunity?.companyName || opportunity?.company || "";
  const oppLocation = opportunity?.location || "";
  const effectiveOppType =
    (opportunity?.type?.toLowerCase().includes("intern") ||
     opportunityType?.toLowerCase().includes("intern"))
      ? "Internship"
      : "Job";

  // Reset or initialize when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setFlowStep("select");
    setError("");
    setCoverNote("");
    setIsSubmitting(false);
    setSubmittedData(null);
    setIsEditing(false);
    setUploadError("");
    setUploadSuccess(false);
    setSelectedFile(null);

    // If user has a default profile resume, initialize selectedOwnResume
    if (user?.resumeUrl) {
      setSelectedOwnResume({
        id: "profile-resume",
        title: user.resumeName || "My Profile Resume.pdf",
        resumeUrl: user.resumeUrl,
        isPrimary: true,
        source: "profile",
      });
    }

    // Pre-fetch saved resumes for Option 2
    loadSavedResumes();

    // Check if an existing tailored resume was previously created for this opportunity
    if (oppId) {
      fetchTailoredResumeAPI(effectiveOppType, oppId)
        .then((res) => {
          if (res?.exists && res?.resume) {
            setTailoredResume(res.resume);
            setSelectedTemplate(res.resume.selectedTemplate || "classic");
            setEditedSummary(res.resume.generatedData?.summary || "");
          } else {
            setTailoredResume(null);
          }
        })
        .catch(() => {
          // ignore background check failure
        });
    }
  }, [isOpen, oppId, effectiveOppType, user]);

  // Load user saved resumes from backend
  const loadSavedResumes = async () => {
    try {
      setLoadingSaved(true);
      const res = await fetchAllResumesAPI();
      if (res?.success && Array.isArray(res.resumes)) {
        setSavedResumes(res.resumes);
        // If no resume selected yet, pick primary or first saved
        if (!selectedOwnResume) {
          const primary = res.resumes.find((r) => r.isPrimary && r.resumeUrl);
          const candidate = primary || res.resumes.find((r) => r.resumeUrl);
          if (candidate) {
            setSelectedOwnResume({
              id: candidate._id,
              title: candidate.title || "Saved Resume",
              resumeUrl: candidate.resumeUrl,
              isPrimary: candidate.isPrimary,
              selectedTemplate: candidate.selectedTemplate,
              generatedData: candidate.generatedData,
              source: "saved",
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch saved resumes:", e.message);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Generate or load AI Tailored Resume
  const triggerAITailoring = async (forceRegen = false, templateToUse = selectedTemplate) => {
    try {
      if (forceRegen) setIsReGenerating(true);
      else setLoadingAI(true);
      setError("");

      const genRes = await tailorResumeAPI({
        opportunityType: effectiveOppType,
        opportunityId: oppId,
        opportunityData: opportunity,
        template: templateToUse,
        forceRegenerate: forceRegen,
      });

      if (genRes?.resume) {
        setTailoredResume(genRes.resume);
        setSelectedTemplate(genRes.resume.selectedTemplate || templateToUse);
        setEditedSummary(genRes.resume.generatedData?.summary || "");
      } else {
        throw new Error(genRes?.message || "Failed to generate tailored resume");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to tailor resume for this opportunity. Please check your profile information."
      );
    } finally {
      setLoadingAI(false);
      setIsReGenerating(false);
    }
  };

  // Handle choice selection
  const handleSelectOption = (option) => {
    setError("");
    if (option === "ai") {
      setFlowStep("ai_tailor");
      // If tailored resume not loaded yet, generate now
      if (!tailoredResume) {
        triggerAITailoring(false, selectedTemplate);
      }
    } else if (option === "own") {
      setFlowStep("own_resume");
    }
  };

  // Save manual edit to summary
  const handleSaveEdit = () => {
    if (!tailoredResume?.generatedData) return;
    const updatedGeneratedData = {
      ...tailoredResume.generatedData,
      summary: editedSummary,
    };
    setTailoredResume((prev) => ({
      ...prev,
      generatedData: updatedGeneratedData,
    }));
    setIsEditing(false);
  };

  // Handle template change in AI flow
  const handleTemplateChange = (tplId) => {
    setSelectedTemplate(tplId);
    triggerAITailoring(true, tplId);
  };

  // Handle PDF file selection for upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError("");
    setUploadSuccess(false);
  };

  // Handle upload submit
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError("Please select a PDF file first.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      const res = await uploadResumeAPI(selectedFile);
      if (res?.success && res?.resumeUrl) {
        const uploadedItem = {
          id: `upload-${Date.now()}`,
          title: selectedFile.name,
          resumeUrl: res.resumeUrl,
          isPrimary: false,
          source: "uploaded",
        };
        setSelectedOwnResume(uploadedItem);
        setUploadSuccess(true);
        loadSavedResumes();
      } else {
        throw new Error(res?.message || "Failed to upload resume.");
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Final Application Submission
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setError("");

    let finalResumeUrl = "";
    if (flowStep === "ai_tailor") {
      finalResumeUrl = tailoredResume?.resumeUrl;
      if (!finalResumeUrl) {
        setError("Please wait until the AI tailored resume compiles to PDF or try re-tailoring.");
        return;
      }
    } else {
      finalResumeUrl = selectedOwnResume?.resumeUrl;
      if (!finalResumeUrl) {
        setError("Please select or upload a resume to submit with your application.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        coverNote: coverNote.trim(),
        resumeUrl: finalResumeUrl,
      };

      let res;
      if (effectiveOppType === "Internship") {
        res = await applyToInternship(oppId, payload);
      } else {
        res = await applyToJob(oppId, payload);
      }

      if (res?.success) {
        setSubmittedData({
          ...res,
          resumeUrl: finalResumeUrl,
          resumeTitle:
            flowStep === "ai_tailor"
              ? `AI Tailored Resume (${selectedTemplate.toUpperCase()})`
              : selectedOwnResume?.title || "My Resume",
        });
        setFlowStep("submitted");

        const callback = onApplicationSubmitted || onAppliedSuccess;
        if (callback) callback(res);
      } else {
        setError(res?.message || "Failed to submit application");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error submitting application. You may have already applied for this position."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const matchedSkills = tailoredResume?.generatedData?.tailoredMeta?.matchedSkills || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-up">

        {/* ─── MODAL HEADER ─── */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-blue-100 mb-2">
              <span>🎯</span> Application Flow · {effectiveOppType}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {oppTitle}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 flex items-center gap-2 flex-wrap">
              {compName && <span className="font-semibold">{compName}</span>}
              {oppLocation && <span>• 📍 {oppLocation}</span>}
              <span>• Choose which resume you want to submit</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg leading-none cursor-pointer transition"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ─── ERROR BANNER ─── */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-2xl flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ─── MODAL BODY ─── */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">

          {/* ====================================================================
              STEP 1: CHOOSE A RESUME (Two Main Options)
              ==================================================================== */}
          {flowStep === "select" && (
            <div className="space-y-6 py-2">
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <h3 className="text-xl font-bold text-slate-900">
                  Choose a Resume for this Application
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Decide how you would like to apply for <strong>{oppTitle}</strong>. You can generate an ATS-tailored resume specifically for this role or select/upload your own resume.
                </p>
              </div>

              {/* 2 Main Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">

                {/* Option 1: Build Resume with AI */}
                <div
                  onClick={() => handleSelectOption("ai")}
                  className="group relative bg-gradient-to-b from-white to-blue-50/40 rounded-3xl border-2 border-blue-500 hover:border-blue-600 p-6 sm:p-7 cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col justify-between shadow-sm ring-1 ring-blue-500/10"
                >
                  {/* Recommended Badge */}
                  <span className="absolute -top-3 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                    ✨ Recommended
                  </span>

                  <div>
                    <div className="w-13 h-13 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition">
                      ⚡
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition">
                      Build Resume with AI
                    </h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Create an ATS-friendly resume tailored specifically to this {effectiveOppType.toLowerCase()} using your existing verified profile and resume details.
                    </p>

                    <div className="mt-4 space-y-2 pt-3 border-t border-blue-100 text-[11px] text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Matches your real skills against job keywords</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Prioritizes relevant projects & experience</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="font-semibold text-blue-900">Zero fake information added</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">
                      Role-Specific ATS Resume
                    </span>
                    <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                      Build with AI →
                    </span>
                  </div>
                </div>

                {/* Option 2: Use My Own Resume */}
                <div
                  onClick={() => handleSelectOption("own")}
                  className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-slate-400 p-6 sm:p-7 cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition">
                      📁
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-slate-800 transition">
                      Use My Own Resume
                    </h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Select one of your existing saved resumes from CareerConnect or upload a new PDF resume from your computer.
                    </p>

                    <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">•</span>
                        <span>Select from your saved CareerConnect resumes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">•</span>
                        <span>Or upload a custom PDF (up to 10MB)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">•</span>
                        <span>Complete control over submitted document</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {savedResumes.length > 0 ? `${savedResumes.length} saved resume(s)` : "Upload or Choose"}
                    </span>
                    <span className="text-xs font-bold text-slate-700 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                      Select / Upload →
                    </span>
                  </div>
                </div>

              </div>

              {/* Safety Guarantee Note */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 text-center">
                🔒 <strong>Candidate Data Safety:</strong> Tailoring a resume generates an application-specific version for this listing. Your original Profile and primary saved Resume are never overwritten or altered.
              </div>
            </div>
          )}

          {/* ====================================================================
              STEP 2A: BUILD RESUME WITH AI FLOW
              ==================================================================== */}
          {flowStep === "ai_tailor" && (
            <div className="space-y-6">
              {/* Back to Choice button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowStep("select")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition hover:underline cursor-pointer"
                >
                  ← Back to Resume Choice
                </button>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Option 1: AI Tailored Resume
                </span>
              </div>

              {/* Loading State */}
              {loadingAI || isReGenerating ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">
                    {isReGenerating ? "Updating Tailored Resume..." : "Tailoring Your Resume with AI..."}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Analyzing required skills and responsibilities for <strong>{oppTitle}</strong>, prioritizing your verified background, and optimizing for ATS.
                  </p>
                </div>
              ) : tailoredResume?.generatedData ? (
                <div className="space-y-5">
                  {/* Verified Matched Skills Bar */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-900">✨ Verified Skills Matched:</span>
                        <span className="text-[11px] font-semibold text-blue-700">
                          {matchedSkills.length ? `${matchedSkills.length} skills highlighted` : "ATS Optimized"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {matchedSkills.length > 0 ? (
                          matchedSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-full bg-white text-blue-800 text-[11px] font-bold border border-blue-200 shadow-2xs"
                            >
                              ✓ {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">
                            Your verified projects and background prioritized for this role. Zero unverified skills added.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                      >
                        {isEditing ? "👁️ Preview Resume" : "✏️ Edit Summary"}
                      </button>
                      {tailoredResume.resumeUrl && (
                        <a
                          href={tailoredResume.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs"
                        >
                          ⬇ Download PDF
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerAITailoring(true, selectedTemplate)}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-2xs cursor-pointer"
                        title="Re-generate with AI"
                      >
                        ⚡ Re-tailor
                      </button>
                    </div>
                  </div>

                  {/* Template Selector Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                        <span>🎨</span> Template:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {RESUME_TEMPLATES.map((tpl) => {
                          const isActive = (selectedTemplate || "classic").toLowerCase() === tpl.id.toLowerCase();
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => handleTemplateChange(tpl.id)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: tpl.previewColor }}
                              />
                              {tpl.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Resume Display / Interactive Editor */}
                  {isEditing ? (
                    <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900">
                          ✏️ Edit Tailored Professional Summary
                        </h4>
                        <span className="text-xs text-slate-400">
                          You have full control before final submission
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Role-Specific Summary:
                        </label>
                        <textarea
                          rows={4}
                          value={editedSummary}
                          onChange={(e) => setEditedSummary(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          placeholder="Tailored summary for this role..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditedSummary(tailoredResume.generatedData?.summary || "");
                            setIsEditing(false);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition"
                        >
                          ✓ Save & Update Preview
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-[420px] overflow-y-auto bg-white p-4">
                      <ResumePreview
                        data={tailoredResume.generatedData}
                        templateId={selectedTemplate || "classic"}
                      />
                    </div>
                  )}

                  {/* Submission Form */}
                  <form onSubmit={handleSubmitApplication} className="space-y-4 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Cover Note to Recruiter (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Highlight your interest or add a personalized note for the hiring team..."
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <p className="text-[11px] text-slate-500">
                        Submitting tailored resume compiled specifically for {oppTitle}.
                      </p>
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setFlowStep("select")}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                          Change Option
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !tailoredResume?.resumeUrl}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <span>🚀</span> Submit Application with Tailored Resume
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Unable to load tailored resume. Please click below to try again.
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => triggerAITailoring(true, selectedTemplate)}
                      className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
                    >
                      Retry Tailoring
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
              STEP 2B: USE MY OWN RESUME FLOW
              ==================================================================== */}
          {flowStep === "own_resume" && (
            <div className="space-y-6">
              {/* Back to Choice button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFlowStep("select")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition hover:underline cursor-pointer"
                >
                  ← Back to Resume Choice
                </button>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Option 2: My Own Resume
                </span>
              </div>

              {/* Sub-Tabs: Select Saved vs Upload New */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setOwnResumeTab("saved")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    ownResumeTab === "saved"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Select from Saved Resumes ({savedResumes.length + (user?.resumeUrl ? 1 : 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setOwnResumeTab("upload")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    ownResumeTab === "upload"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Upload New PDF Resume
                </button>
              </div>

              {/* Sub-View A: Select from Saved Resumes */}
              {ownResumeTab === "saved" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Choose one of your saved resumes to submit with this application:
                  </p>

                  {loadingSaved ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 border-3 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Loading your saved resumes...</p>
                    </div>
                  ) : savedResumes.length === 0 && !user?.resumeUrl ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="text-3xl">📄</div>
                      <h4 className="text-sm font-bold text-slate-800">No Saved Resumes Found</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        You don't have any saved resumes yet. You can upload a PDF right now or use the AI builder.
                      </p>
                      <button
                        type="button"
                        onClick={() => setOwnResumeTab("upload")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                      >
                        Upload PDF Resume Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* Primary Profile Resume if exists */}
                      {user?.resumeUrl && (
                        <div
                          onClick={() =>
                            setSelectedOwnResume({
                              id: "profile-resume",
                              title: user.resumeName || "Primary Profile Resume.pdf",
                              resumeUrl: user.resumeUrl,
                              isPrimary: true,
                              source: "profile",
                            })
                          }
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            selectedOwnResume?.resumeUrl === user.resumeUrl
                              ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                Profile Active Resume
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 mt-1">
                                {user.resumeName || "Main Profile Resume"}
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                Attached to your CareerConnect profile
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="selected_resume"
                              checked={selectedOwnResume?.resumeUrl === user.resumeUrl}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <a
                              href={user.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              View PDF ↗
                            </a>
                            <span className="text-slate-400">Ready</span>
                          </div>
                        </div>
                      )}

                      {/* Saved Builder Resumes */}
                      {savedResumes.map((resume) => {
                        const isSelected = selectedOwnResume?.id === resume._id || selectedOwnResume?.resumeUrl === resume.resumeUrl;
                        return (
                          <div
                            key={resume._id}
                            onClick={() =>
                              setSelectedOwnResume({
                                id: resume._id,
                                title: resume.title || "Saved Resume",
                                resumeUrl: resume.resumeUrl,
                                isPrimary: resume.isPrimary,
                                selectedTemplate: resume.selectedTemplate,
                                generatedData: resume.generatedData,
                                source: "saved",
                              })
                            }
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {resume.isPrimary && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                      Primary
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                                    {resume.selectedTemplate || "classic"}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-900 mt-1">
                                  {resume.title || "CareerConnect Resume"}
                                </h5>
                                <p className="text-[11px] text-slate-500">
                                  Updated: {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <input
                                type="radio"
                                name="selected_resume"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 text-blue-600 cursor-pointer"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                              {resume.resumeUrl ? (
                                <a
                                  href={resume.resumeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 hover:underline font-semibold"
                                >
                                  View PDF ↗
                                </a>
                              ) : (
                                <span className="text-slate-400">PDF compiling</span>
                              )}
                              <span className="text-slate-400 font-medium">Saved</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-View B: Upload New PDF Resume */}
              {ownResumeTab === "upload" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Upload a custom PDF resume specifically to apply for this listing:
                  </p>

                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && selectedOwnResume && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span>✓</span>
                        <span>"{selectedOwnResume.title}" uploaded & selected!</span>
                      </div>
                      <a
                        href={selectedOwnResume.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-800 underline"
                      >
                        Preview PDF ↗
                      </a>
                    </div>
                  )}

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="application/pdf,.pdf"
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-xl mx-auto mb-2">
                      📄
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Click to browse or drop your resume here
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          PDF only, maximum 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedFile && !uploadSuccess && (
                    <button
                      type="button"
                      onClick={handleUploadSubmit}
                      disabled={isUploading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading Resume to Cloudinary...
                        </>
                      ) : (
                        "Upload and Select This Resume"
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Selected Resume Confirmation Card */}
              {selectedOwnResume && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Resume Selected for Application
                    </span>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>📄</span> {selectedOwnResume.title}
                    </p>
                  </div>
                  {selectedOwnResume.resumeUrl && (
                    <a
                      href={selectedOwnResume.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition"
                    >
                      Preview Resume ↗
                    </a>
                  )}
                </div>
              )}

              {/* Submission Form */}
              <form onSubmit={handleSubmitApplication} className="space-y-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cover Note to Recruiter (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Highlight your interest or add a personalized note for the hiring team..."
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-slate-500">
                    Applying with your selected resume.
                  </p>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setFlowStep("select")}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Change Option
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedOwnResume?.resumeUrl}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <span>🚀</span> Confirm & Submit Application
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ====================================================================
              STEP 3: SUBMISSION SUCCESS SCREEN
              ==================================================================== */}
          {flowStep === "submitted" && (
            <div className="py-14 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-900">Application Submitted!</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your application for <strong>{oppTitle}</strong> {compName ? `at ${compName}` : ""} has been successfully submitted.
              </p>

              {submittedData?.resumeUrl && (
                <div className="pt-2">
                  <a
                    href={submittedData.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    <span>📄 View Submitted Resume PDF ↗</span>
                  </a>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
