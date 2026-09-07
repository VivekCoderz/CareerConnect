import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setTemplate,
  nextStep,
  prevStep,
  setStep,
  updateRawSection,
  generateResume,
  updateResumeWithAI,
  setLastChangeRequest,
  clearError,
  fetchSavedResume,
  fetchProfileForResume,
  saveManualEdit,
} from "../../redux/features/resumeSlice";
import { updateUserProfile } from "../../redux/features/authSlice";
import { uploadResumeAPI } from "../../services/resumeService";
import { validateRawData } from "../../utils/resumeHelpers";

import TemplateSelector from "../../components/resume-builder/TemplateSelector";
import MultiStepForm from "../../components/resume-builder/MultiStepForm";
import ResumePreview from "../../components/resume-builder/ResumePreview";
import ReviewActions from "../../components/resume-builder/ReviewActions";
import AIChangeRequest from "../../components/resume-builder/AIChangeRequest";
import ManualEditor from "../../components/resume-builder/ManualEditor";

// ─── Step indicator for AI flow ──────────────────────────────────────────────
const FLOW_STEPS = [
  { label: "Review Info" },
  { label: "Choose Template" },
  { label: "Your Resume" },
];

const FlowStepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center mb-8 no-print">
    {FLOW_STEPS.map((step, idx) => {
      const isCompleted = idx < currentStep;
      const isActive = idx === currentStep;
      return (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                isCompleted
                  ? "bg-blue-600 border-blue-600 text-white"
                  : isActive
                    ? "bg-white border-blue-600 text-blue-600"
                    : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {isCompleted ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                isActive
                  ? "text-blue-600"
                  : isCompleted
                    ? "text-blue-500"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < FLOW_STEPS.length - 1 && (
            <div
              className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-all ${
                idx < currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Profile auto-load banner ─────────────────────────────────────────────────
const ProfileBanner = ({ profileFound, onDismiss }) => {
  if (profileFound === null) return null;
  return (
    <div
      className={`mb-5 rounded-xl flex items-start justify-between gap-3 px-4 py-3.5 border ${
        profileFound
          ? "bg-blue-50/80 border-blue-200 text-blue-900"
          : "bg-amber-50/80 border-amber-200 text-amber-900"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-base">
          {profileFound ? "✨" : "ℹ️"}
        </span>
        <p className="text-xs sm:text-sm leading-relaxed">
          {profileFound
            ? "Your existing CareerConnect profile information has been automatically imported below. Review and edit any section before generating your resume."
            : "No profile details found yet. Fill in your details below and check the option at the end to save them directly to your profile."}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-lg leading-none opacity-50 hover:opacity-100 p-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ResumeBuilder = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    currentStep,
    selectedTemplate,
    rawData,
    generatedResume,
    isGenerating,
    isUpdating,
    error,
    profileLoading,
    profileFound,
  } = useSelector((state) => state.resume);

  // View modes: 'existing' | 'choose' | 'upload' | 'ai'
  const [viewMode, setViewMode] = useState("loading");
  const [reviewMode, setReviewMode] = useState("preview"); // 'preview' | 'askAI' | 'manual'
  const [syncProfile, setSyncProfile] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerProfileFound, setBannerProfileFound] = useState(null);

  // Upload Resume state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Initial data load: fetch saved resume & profile
  useEffect(() => {
    dispatch(fetchProfileForResume());
    dispatch(fetchSavedResume());
  }, [dispatch]);

  // Determine initial view mode once loading concludes or from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "ai") {
      setViewMode("ai");
      dispatch(setStep(0));
      return;
    }
    if (mode === "upload") {
      setViewMode("upload");
      return;
    }
    if (mode === "choose" || mode === "new") {
      setViewMode("choose");
      return;
    }

    if (!profileLoading) {
      if (generatedResume || user?.resumeUrl) {
        setViewMode("existing");
      } else {
        setViewMode("choose");
      }
    }
  }, [profileLoading, generatedResume, user?.resumeUrl, dispatch]);

  // Show profile banner in AI mode once profile data is ready
  useEffect(() => {
    if (!profileLoading && profileFound !== undefined) {
      setBannerProfileFound(profileFound);
      setBannerVisible(true);
    }
  }, [profileLoading, profileFound]);

  // ─── Template & Generation Handlers ─────────────────────────────────────────
  const handleSelectTemplate = (id) => {
    dispatch(setTemplate(id));
  };

  const handleTemplateNext = () => {
    const templateToUse = selectedTemplate || "classic";
    if (!selectedTemplate) {
      dispatch(setTemplate("classic"));
    }
    const errors = validateRawData(rawData);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    dispatch(
      generateResume({ rawData, template: templateToUse, syncProfile }),
    );
  };

  const handleUpdateSection = (section, data) => {
    dispatch(updateRawSection({ section, data }));
  };

  const handleAskAI = () => setReviewMode("askAI");
  const handleEditManually = () => setReviewMode("manual");

  const handleAIChangeSubmit = (instruction) => {
    dispatch(setLastChangeRequest(instruction));
    dispatch(
      updateResumeWithAI({ currentResume: generatedResume, instruction }),
    )
      .unwrap()
      .then(() => setReviewMode("preview"))
      .catch(() => {});
  };

  const handleManualSave = (updated) => {
    dispatch(saveManualEdit(updated))
      .unwrap()
      .then(() => setReviewMode("preview"))
      .catch(() => {});
  };

  const handleFinalize = () => {
    window.print();
  };

  // ─── Upload Handlers ────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setUploadError("Only PDF files are allowed.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be under 10 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError("");
    setUploadSuccess(false);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError("Please select a PDF file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const res = await uploadResumeAPI(selectedFile);
      setUploadSuccess(true);
      if (res?.resumeUrl) {
        dispatch(
          updateUserProfile({
            resumeUrl: res.resumeUrl,
            resumeName: res.resumeName || selectedFile.name,
          }),
        );
      }
    } catch (err) {
      setUploadError(err.message || "Failed to upload resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Check whether user already has an active resume
  const hasExisting = Boolean(generatedResume || user?.resumeUrl);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex justify-between items-center no-print">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-xs underline ml-3 font-semibold hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ====================================================================
            VIEW 1: EXISTING RESUME
            ==================================================================== */}
        {viewMode === "existing" && (
          <div className="space-y-6">
            {/* Header with Title & "Build a New Resume" button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 no-print">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  My Resume
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  View, edit, or download your current active resume
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("choose")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Build a New Resume
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold shrink-0">
                  📄
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 truncate">
                    {generatedResume?.personal?.fullName
                      ? `${generatedResume.personal.fullName}'s Professional Resume`
                      : user?.resumeName || "My Active Resume"}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                    {selectedTemplate && (
                      <span className="text-xs text-slate-500 capitalize">
                        Template: {selectedTemplate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Preview / Update Resume / Download PDF */}
              <div className="flex flex-wrap items-center gap-2 sm:self-center">
                {generatedResume ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("resume-print-area");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("ai");
                        dispatch(setStep(0));
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Update Resume
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalize}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      Download PDF
                    </button>
                  </>
                ) : user?.resumeUrl ? (
                  <>
                    <a
                      href={user.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      Preview ↗
                    </a>
                    <a
                      href={user.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                    >
                      Download PDF
                    </a>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setViewMode("choose")}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  + Build a New Resume
                </button>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────
                Distinct, Visible "+ Build a New Resume" Banner/Card
                ──────────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>✨</span> Build a New Resume
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Create another ATS resume using AI from your profile or upload an existing PDF file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("choose")}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span> Build a New Resume
              </button>
            </div>

            {/* Resume Display Area */}
            {generatedResume ? (
              <div className="space-y-6">
                {reviewMode === "preview" && (
                  <>
                    <div id="resume-print-area" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <ResumePreview
                        data={generatedResume}
                        templateId={selectedTemplate || "classic"}
                      />
                    </div>

                    <ReviewActions
                      onFinalize={handleFinalize}
                      onAskAI={handleAskAI}
                      onEditManually={handleEditManually}
                      onBuildNew={() => setViewMode("choose")}
                      isUpdating={isUpdating}
                    />
                  </>
                )}

                {reviewMode === "askAI" && (
                  <AIChangeRequest
                    onSubmit={handleAIChangeSubmit}
                    onCancel={() => setReviewMode("preview")}
                    isUpdating={isUpdating}
                  />
                )}

                {reviewMode === "manual" && (
                  <ManualEditor
                    resume={generatedResume}
                    onSave={handleManualSave}
                    onCancel={() => setReviewMode("preview")}
                  />
                )}
              </div>
            ) : user?.resumeUrl ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mx-auto text-blue-600">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {user.resumeName || "Uploaded Resume"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Your resume PDF is uploaded and securely hosted. You can view it live or build a fresh ATS resume using AI.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <a
                    href={user.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    View PDF in New Tab ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewMode("choose")}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    + Build a New Resume
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ====================================================================
            VIEW 2: BUILD A NEW RESUME — CHOICE (Upload vs Build with AI)
            ==================================================================== */}
        {viewMode === "choose" && (
          <div className="py-6 sm:py-10">
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-10">
              {hasExisting && (
                <button
                  type="button"
                  onClick={() => setViewMode("existing")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-4 hover:underline"
                >
                  ← Back to My Resume
                </button>
              )}
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                How do you want to create your resume?
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Choose the method that works best for you to get placement-ready
              </p>
            </div>

            {/* Two Cards: Upload Resume vs Build with AI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Option A: Upload Resume */}
              <div
                onClick={() => {
                  setViewMode("upload");
                  setUploadError("");
                  setUploadSuccess(false);
                }}
                className="group relative bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-50 group-hover:border group-hover:border-blue-200 flex items-center justify-center text-2xl mb-5 transition">
                    📁
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Upload Resume
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    Already have a resume in PDF format? Upload it directly to your profile to apply for internships and jobs instantly.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">PDF up to 10MB</span>
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                    Upload PDF →
                  </span>
                </div>
              </div>

              {/* Option B: Build with AI */}
              <div
                onClick={() => {
                  setViewMode("ai");
                  dispatch(setStep(0));
                }}
                className="group relative bg-white rounded-2xl border-2 border-blue-500/60 hover:border-blue-600 p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col justify-between shadow-xs ring-1 ring-blue-500/10"
              >
                {/* Recommended Badge */}
                <span className="absolute -top-3 right-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                  ✨ Recommended
                </span>

                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl mb-5 transition">
                    ⚡
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Build with AI
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    Automatically pulls details from your CareerConnect Profile. Review, edit, choose an ATS-friendly template, and generate your resume in minutes.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 font-semibold">
                    Auto-fills Profile
                  </span>
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                    Start AI Builder →
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 3: UPLOAD RESUME FLOW
            ==================================================================== */}
        {viewMode === "upload" && (
          <div className="max-w-2xl mx-auto py-6">
            <button
              type="button"
              onClick={() => setViewMode("choose")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 hover:underline"
            >
              ← Back to Options
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload Your Resume
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload your completed resume in PDF format to attach to your profile
                </p>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {uploadError}
                </div>
              )}

              {uploadSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">
                      Resume Uploaded Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Your resume has been saved to your profile and is ready for internship applications.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    {user?.resumeUrl && (
                      <a
                        href={user.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                      >
                        View Live Resume ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewMode("existing")}
                      className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-xl transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* File Drop / Select Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="application/pdf,.pdf"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-2xl mx-auto mb-3">
                      📄
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Click to browse or drag and drop your resume
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PDF only, maximum size 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("choose")}
                      className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile || isUploading}
                      onClick={handleUploadSubmit}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {isUploading && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {isUploading ? "Uploading to Cloud..." : "Upload & Save to Profile"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 4: BUILD WITH AI FLOW (Step 0: Review Info -> Step 1: Template -> Step 2: Preview)
            ==================================================================== */}
        {viewMode === "ai" && (
          <div>
            {/* Navigation back to choices or existing */}
            <div className="mb-4 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => {
                  if (hasExisting) {
                    setViewMode("existing");
                  } else {
                    setViewMode("choose");
                  }
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
              >
                ← {hasExisting ? "Back to My Resume" : "Back to Creation Options"}
              </button>
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(setStep(0))}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Edit Profile Info
                </button>
              )}
            </div>

            {/* AI Builder Header */}
            <div className="text-center mb-6 no-print">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                AI Resume Builder
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Create an ATS-optimized professional resume using your profile data
              </p>
            </div>

            {/* Step indicator */}
            {!isGenerating && (
              <FlowStepIndicator currentStep={currentStep} />
            )}

            {/* ── STEP 0: Review & Edit Info ── */}
            {currentStep === 0 && (
              <>
                {profileLoading ? (
                  <div className="text-center py-20 text-slate-500">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-medium text-sm">
                      Loading your profile information…
                    </p>
                  </div>
                ) : (
                  <>
                    {bannerVisible && (
                      <ProfileBanner
                        profileFound={bannerProfileFound}
                        onDismiss={() => setBannerVisible(false)}
                      />
                    )}
                    <MultiStepForm
                      rawData={rawData}
                      onUpdateSection={handleUpdateSection}
                      onSubmit={() => dispatch(nextStep())}
                      onBack={() => setViewMode("choose")}
                      profileFound={profileFound}
                      syncProfile={syncProfile}
                      onSyncProfileChange={setSyncProfile}
                    />
                  </>
                )}
              </>
            )}

            {/* ── STEP 1: Choose Template ── */}
            {currentStep === 1 && (
              <>
                <TemplateSelector
                  selected={selectedTemplate}
                  onSelect={handleSelectTemplate}
                />
                <div className="flex justify-between mt-8 max-w-5xl mx-auto no-print">
                  <button
                    type="button"
                    onClick={() => dispatch(prevStep())}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm transition"
                  >
                    ← Back to Info
                  </button>
                  <button
                    type="button"
                    onClick={handleTemplateNext}
                    disabled={isGenerating}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
                  >
                    {isGenerating ? "Generating…" : "Generate Resume →"}
                  </button>
                </div>
              </>
            )}

            {/* ── Generating Spinner ── */}
            {isGenerating && (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-800 font-bold text-lg">
                  AI is crafting your professional resume…
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Improving wording · ATS optimization · Formatting layout
                </p>
              </div>
            )}

            {/* ── STEP 2: Your Resume / Preview ── */}
            {currentStep === 2 && !isGenerating && generatedResume && (
              <div className="space-y-6">
                {reviewMode === "preview" && (
                  <>
                    <div className="flex justify-between items-center mb-4 no-print">
                      <h2 className="text-lg font-bold text-slate-900">
                        Resume Preview
                      </h2>
                      <button
                        type="button"
                        onClick={() => dispatch(setStep(0))}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        ← Edit original details
                      </button>
                    </div>

                    <div id="resume-print-area" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <ResumePreview
                        data={generatedResume}
                        templateId={selectedTemplate || "classic"}
                      />
                    </div>

                    <ReviewActions
                      onFinalize={handleFinalize}
                      onAskAI={handleAskAI}
                      onEditManually={handleEditManually}
                      onBuildNew={() => setViewMode("choose")}
                      isUpdating={isUpdating}
                    />
                  </>
                )}

                {reviewMode === "askAI" && (
                  <AIChangeRequest
                    onSubmit={handleAIChangeSubmit}
                    onCancel={() => setReviewMode("preview")}
                    isUpdating={isUpdating}
                  />
                )}

                {reviewMode === "manual" && (
                  <ManualEditor
                    resume={generatedResume}
                    onSave={handleManualSave}
                    onCancel={() => setReviewMode("preview")}
                  />
                )}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ResumeBuilder;
