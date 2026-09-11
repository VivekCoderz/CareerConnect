import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardPath } from "../../utils/dashboardRedirect";
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
  fetchAllSavedResumes,
  saveFinalResume,
  setPrimaryResume,
  deleteSavedResume,
  loadSpecificResume,
  startNewResume,
  setResumeTitle,
  setActiveResumeId,
  fetchProfileForResume,
  saveManualEdit,
  updateRawData,
} from "../../redux/features/resumeSlice";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  uploadResumeAPI,
  parseResumeAPI,
  confirmParsedProfileAPI,
} from "../../services/resumeService";
import ResumeUploadInput from "../../components/common/ResumeUploadInput";
import { validateRawData, extractSkillsList } from "../../utils/resumeHelpers";
import { RESUME_TEMPLATES } from "../../data/templates";

import TemplateSelector from "../../components/resume-builder/TemplateSelector";
import MultiStepForm from "../../components/resume-builder/MultiStepForm";
import ResumePreview from "../../components/resume-builder/ResumePreview";
import ReviewActions from "../../components/resume-builder/ReviewActions";
import AIChangeRequest from "../../components/resume-builder/AIChangeRequest";
import ManualEditor from "../../components/resume-builder/ManualEditor";
import ParsedResumeReviewModal from "../../components/resume-builder/ParsedResumeReviewModal";

// ─── Step indicator for AI flow ──────────────────────────────────────────────
const FLOW_STEPS = [
  { label: "1. Information", step: 0 },
  { label: "2. Choose Template", step: 1 },
  { label: "3. Resume Preview", step: 2 },
];

const FlowStepIndicator = ({ currentStep, onStepClick, hasResume }) => (
  <div className="flex items-center justify-center mb-8 no-print">
    {FLOW_STEPS.map((step, idx) => {
      const isCompleted = idx < currentStep;
      const isActive = idx === currentStep;
      const isClickable = hasResume || isCompleted || isActive;
      return (
        <div key={step.label} className="flex items-center">
          <button
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onStepClick(step.step)}
            className={`flex flex-col items-center group transition ${
              isClickable ? "cursor-pointer" : "cursor-default opacity-60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shadow-xs ${
                isCompleted
                  ? "bg-blue-600 border-blue-600 text-white"
                  : isActive
                    ? "bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50"
                    : "bg-white border-slate-300 text-slate-400"
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
              className={`mt-1.5 text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? "text-blue-600"
                  : isCompleted
                    ? "text-slate-700 group-hover:text-blue-600"
                    : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </button>
          {idx < FLOW_STEPS.length - 1 && (
            <div
              className={`h-0.5 w-14 sm:w-24 mx-2 mb-5 transition-all ${
                idx < currentStep ? "bg-blue-600" : "bg-slate-200"
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
      className={`mb-6 rounded-2xl flex items-start justify-between gap-3 px-5 py-4 border shadow-xs ${
        profileFound
          ? "bg-blue-50/90 border-blue-200 text-blue-950"
          : "bg-amber-50/90 border-amber-200 text-amber-950"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">
          {profileFound ? "✨" : "ℹ️"}
        </span>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 text-blue-900">
            {profileFound ? "Profile Data Auto-Imported" : "Ready to Build"}
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
            {profileFound
              ? "Your CareerConnect profile details (education, experience, projects, skills) have been imported below. Feel free to review or update before generating your resume."
              : "No saved profile details were found. Fill in your details below to generate your ATS resume."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg hover:bg-white/60 transition cursor-pointer"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

// ─── Main ResumeBuilder Component ─────────────────────────────────────────────
const ResumeBuilder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const dashboardPath = getDashboardPath(user?.userType || user?.role, user);
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
    savedResumes,
    activeResumeId,
    resumeTitle,
  } = useSelector((state) => state.resume);

  // Active navigation tab: 'editor' | 'my-resumes' | 'upload'
  const [activeTab, setActiveTab] = useState("editor");
  const [reviewMode, setReviewMode] = useState("preview"); // 'preview' | 'askAI' | 'manual'
  const [syncProfile, setSyncProfile] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerProfileFound, setBannerProfileFound] = useState(null);

  // Upload Resume state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState("");
  const [uploadedResumeName, setUploadedResumeName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);
  const [existingProfileData, setExistingProfileData] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const hasInitializedRef = useRef(false);

  // Initial data load: fetch saved resume, all saved resumes & profile
  useEffect(() => {
    dispatch(fetchProfileForResume());
    dispatch(fetchSavedResume());
    dispatch(fetchAllSavedResumes());
  }, [dispatch]);

  // Initial active tab determination (runs only once upon initial load)
  useEffect(() => {
    if (hasInitializedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    if (mode === "ai" || mode === "new") {
      hasInitializedRef.current = true;
      dispatch(startNewResume());
      setActiveTab("editor");
      dispatch(setStep(0));
      return;
    }
    if (mode === "upload") {
      hasInitializedRef.current = true;
      setActiveTab("upload");
      return;
    }
    if (mode === "saved" || mode === "list") {
      hasInitializedRef.current = true;
      setActiveTab("my-resumes");
      return;
    }

    if (!profileLoading) {
      hasInitializedRef.current = true;
      if (generatedResume) {
        setActiveTab("editor");
        dispatch(setStep(2));
      } else if (savedResumes && savedResumes.length > 0) {
        const primary = savedResumes.find((r) => r.isPrimary) || savedResumes[0];
        if (primary) {
          dispatch(loadSpecificResume(primary));
        }
        setActiveTab("editor");
        dispatch(setStep(2));
      } else {
        setActiveTab("editor");
        dispatch(setStep(0));
      }
    }
  }, [profileLoading, generatedResume, savedResumes, dispatch]);

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
      generateResume({
        rawData,
        template: templateToUse,
        syncProfile,
        resumeId: activeResumeId,
      }),
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

  const handleSaveFinal = async ({ title, isPrimary }) => {
    try {
      const res = await dispatch(
        saveFinalResume({
          title: title || resumeTitle || "My Resume",
          template: selectedTemplate || "classic",
          rawData,
          generatedData: generatedResume,
          isPrimary,
          resumeId: activeResumeId,
        }),
      ).unwrap();
      dispatch(fetchAllSavedResumes());
      return { success: true, resume: res };
    } catch (err) {
      alert(err || "Failed to save resume");
      return { success: false };
    }
  };

  const handleStartNew = () => {
    dispatch(startNewResume());
    setActiveTab("editor");
    setReviewMode("preview");
    dispatch(setStep(0));
  };

  const handleSelectResume = (resume, targetMode = "preview") => {
    dispatch(loadSpecificResume(resume));
    setReviewMode(targetMode);
    setActiveTab("editor");
    dispatch(setStep(2));
  };

  const handleMakePrimary = async (resumeId) => {
    try {
      await dispatch(setPrimaryResume(resumeId)).unwrap();
      dispatch(fetchAllSavedResumes());
    } catch (err) {
      alert(err || "Failed to set as primary resume");
    }
  };

  const handleDeleteResume = async (resumeId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title || "this resume"}"? Other resumes will not be affected.`)) {
      try {
        await dispatch(deleteSavedResume(resumeId)).unwrap();
        dispatch(fetchAllSavedResumes());
      } catch (err) {
        alert(err || "Failed to delete resume");
      }
    }
  };

  const handleFinalize = () => {
    window.print();
  };

  // ─── Upload Handlers ────────────────────────────────────────────────────────
  const handleUploadSubmit = async () => {
    if (!uploadedResumeUrl) {
      setUploadError("Please upload a resume file or paste a valid resume URL.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const parseRes = await parseResumeAPI(selectedFile);
      if (parseRes?.success && parseRes?.parsedData) {
        setParsedResumeData(parseRes.parsedData);
        if (parseRes.existingProfile) {
          setExistingProfileData(parseRes.existingProfile);
        }
        if (parseRes.resumeUrl) {
          dispatch(
            updateUserProfile({
              resumeUrl: parseRes.resumeUrl,
              resumeName: parseRes.resumeName || selectedFile.name,
            }),
          );
        }
        setIsReviewModalOpen(true);
      } else {
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
        dispatch(fetchAllSavedResumes());
      }
    } catch (err) {
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
        dispatch(fetchAllSavedResumes());
      } catch (uploadErr) {
        setUploadError(uploadErr.message || err.message || "Failed to upload resume. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmParsedData = async (confirmedData) => {
    try {
      await confirmParsedProfileAPI(confirmedData);
      dispatch(fetchProfileForResume());
      dispatch(fetchAllSavedResumes());

      dispatch(
        updateRawData({
          personal: confirmedData.personal || {},
          education: confirmedData.education || [],
          experience: confirmedData.experience || [],
          projects: confirmedData.projects || [],
          skills: confirmedData.skills || [],
          certifications: confirmedData.certifications || [],
          achievements: confirmedData.achievements || [],
        }),
      );

      setIsReviewModalOpen(false);
      setUploadSuccess(true);
      setActiveTab("editor");
      dispatch(setStep(0));
    } catch (err) {
      alert(err.message || "Failed to save parsed profile data");
    }
  };

  const activeSavedResume = (savedResumes || []).find((r) => r._id === activeResumeId);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =========================================================================
          TOP NAVIGATION BAR (Professional Studio Header)
          ========================================================================= */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-3.5">
            {/* Brand Logo & Title with Dashboard Link */}
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath}
                className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-slate-700 hover:text-blue-600 transition shadow-2xs font-semibold text-xs"
                title="Go back to Dashboard"
              >
                <svg
                  className="w-4 h-4 group-hover:-translate-x-0.5 transition text-slate-500 group-hover:text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
                📄
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Resume Studio
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                    <span>✓</span> ATS-Optimized
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Build, customize & manage multiple targeted resumes for placements and jobs
                </p>
              </div>
            </div>

            {/* Navigation Tabs, Dashboard & Primary CTA */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
                {/* Tab 1: Resume Studio / Preview */}
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "editor"
                      ? "bg-white text-blue-600 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📝</span>
                  <span>Resume Studio</span>
                  {generatedResume && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse ml-0.5" />
                  )}
                </button>

                {/* Tab 2: My Resumes (Count) */}
                <button
                  type="button"
                  onClick={() => setActiveTab("my-resumes")}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "my-resumes"
                      ? "bg-white text-blue-600 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📂</span>
                  <span>My Resumes</span>
                  {savedResumes && savedResumes.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                      {savedResumes.length}
                    </span>
                  )}
                </button>

                {/* Tab 3: Upload PDF */}
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "upload"
                      ? "bg-white text-blue-600 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📎</span>
                  <span>Upload PDF</span>
                </button>
              </div>

              {/* Dashboard Shortcut Button */}
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Go to Dashboard"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              {/* "+ Build a New Resume" CTA */}
              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                title="Create a new resume without overwriting existing ones"
              >
                <span>+</span>
                <span>New Resume</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Top Breadcrumb & Dashboard Link */}
        <div className="flex items-center justify-between gap-3 mb-6 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              to={dashboardPath}
              className="hover:text-blue-600 transition flex items-center gap-1.5 font-semibold text-slate-600"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">
              {activeTab === "editor"
                ? "Resume Studio & Preview"
                : activeTab === "my-resumes"
                  ? "My Saved Resumes"
                  : "Upload Resume PDF"}
            </span>
          </div>

          <Link
            to={dashboardPath}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50/80 transition"
          >
            <span>← Back to Dashboard</span>
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex justify-between items-center shadow-xs no-print">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-xs underline ml-3 font-semibold hover:text-red-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =====================================================================
            TAB 1: RESUME STUDIO & LIVE PREVIEW (The Resume Page)
            ===================================================================== */}
        {activeTab === "editor" && (
          <div>
            {/* Step Navigation Indicator */}
            {!isGenerating && (
              <FlowStepIndicator
                currentStep={currentStep}
                onStepClick={(step) => dispatch(setStep(step))}
                hasResume={Boolean(generatedResume)}
              />
            )}

            {/* ── STEP 0: Review & Edit Profile Information ── */}
            {currentStep === 0 && (
              <>
                {profileLoading ? (
                  <div className="text-center py-24 text-slate-500">
                    <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="font-semibold text-sm text-slate-800">
                      Loading your profile information…
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Pulling verified education, projects, skills & experiences
                    </p>
                  </div>
                ) : (
                  <div>
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
                      onBack={() => {
                        if (savedResumes && savedResumes.length > 0) {
                          setActiveTab("my-resumes");
                        }
                      }}
                      profileFound={profileFound}
                      syncProfile={syncProfile}
                      onSyncProfileChange={setSyncProfile}
                    />
                  </div>
                )}
              </>
            )}

            {/* ── STEP 1: Choose Template ── */}
            {currentStep === 1 && (
              <div>
                <TemplateSelector
                  selected={selectedTemplate}
                  onSelect={handleSelectTemplate}
                />
                <div className="flex flex-wrap justify-between items-center gap-4 mt-8 max-w-5xl mx-auto no-print">
                  <button
                    type="button"
                    onClick={() => dispatch(prevStep())}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
                  >
                    ← Back to Info
                  </button>
                  <div className="flex items-center gap-3">
                    {generatedResume && (
                      <button
                        type="button"
                        onClick={() => dispatch(setStep(2))}
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-xs hover:bg-slate-900 shadow-xs transition cursor-pointer"
                      >
                        Preview with Selected Theme →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTemplateNext}
                      disabled={isGenerating}
                      className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer inline-flex items-center gap-2"
                    >
                      {isGenerating && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>{isGenerating ? "Generating…" : "Generate Resume with AI →"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Generating Spinner ── */}
            {isGenerating && (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto">
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-slate-900 font-bold text-lg">
                  AI is crafting your professional resume…
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Polishing action-verb bullet points · Formatting layout · ATS keyword optimization
                </p>
                <div className="flex justify-center gap-2 mt-6">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            {/* ── STEP 2: THE RESUME PAGE (Live Preview & Studio) ── */}
            {currentStep === 2 && !isGenerating && generatedResume && (
              <div className="space-y-6">
                {reviewMode === "preview" && (
                  <>
                    {/* Resume Header & Action Toolbar Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                      {/* Left: Title & Status */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                            {resumeTitle || "My Resume"}
                          </h2>
                          {activeResumeId ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span>✓</span> Saved in Workspace
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span>✨</span> New Generated Draft (Unsaved)
                            </span>
                          )}
                          {activeSavedResume?.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              ⭐ Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {generatedResume?.personal?.fullName || "Candidate"} · {selectedTemplate || "Classic"} Template
                        </p>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => dispatch(setStep(0))}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>✏️</span>
                          <span>Edit Info</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleEditManually}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>📝</span>
                          <span>Manual Editor</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAskAI}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>🤖</span>
                          <span>AI Refine</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFinalize}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                          title="Print or Save as PDF"
                        >
                          <span>🖨️</span>
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Theme Matcher Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                          <span>🎨</span> Change Layout Theme:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {RESUME_TEMPLATES.map((tpl) => {
                            const isActive = (selectedTemplate || "classic").toLowerCase() === tpl.id.toLowerCase();
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => dispatch(setTemplate(tpl.id))}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isActive
                                    ? "bg-slate-900 text-white shadow-xs scale-102"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
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
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Click any theme to preview live
                      </span>
                    </div>

                    {/* RESUME SHEET CONTAINER (Paper representation) */}
                    <div className="flex justify-center">
                      <div
                        id="resume-print-area"
                        className="w-full max-w-[850px] bg-white rounded-2xl shadow-lg border border-slate-200/90 overflow-hidden transition-all duration-200"
                      >
                        <ResumePreview
                          data={generatedResume}
                          templateId={selectedTemplate || "classic"}
                        />
                      </div>
                    </div>

                    {/* Bottom Review Actions / Save Decisions */}
                    <ReviewActions
                      onFinalize={handleFinalize}
                      onAskAI={handleAskAI}
                      onEditManually={handleEditManually}
                      onBuildNew={handleStartNew}
                      onSaveFinal={handleSaveFinal}
                      onChangeTemplate={() => dispatch(setStep(1))}
                      isUpdating={isUpdating}
                      initialTitle={resumeTitle}
                      selectedTemplate={selectedTemplate}
                    />
                  </>
                )}

                {/* Ask AI view */}
                {reviewMode === "askAI" && (
                  <AIChangeRequest
                    onSubmit={handleAIChangeSubmit}
                    onCancel={() => setReviewMode("preview")}
                    isUpdating={isUpdating}
                  />
                )}

                {/* Manual Editor view */}
                {reviewMode === "manual" && (
                  <ManualEditor
                    resume={generatedResume}
                    onSave={handleManualSave}
                    onCancel={() => setReviewMode("preview")}
                  />
                )}
              </div>
            )}

            {/* Fallback if on Step 2 but no resume generated yet */}
            {currentStep === 2 && !isGenerating && !generatedResume && (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No Resume Content Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill in your details or select a saved resume to view the preview.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => dispatch(setStep(0))}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Start Filling Info
                  </button>
                  {savedResumes && savedResumes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("my-resumes")}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      View Saved Resumes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: MY SAVED RESUMES (Multi-Resume Manager)
            ===================================================================== */}
        {activeTab === "my-resumes" && (
          <div className="space-y-6">
            {/* Header with Title & "Build a New Resume" button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 no-print">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    My Saved Resumes
                  </h2>
                  {savedResumes && savedResumes.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {savedResumes.length} {savedResumes.length === 1 ? "Resume" : "Resumes"}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Create and manage multiple tailored versions of your resume for different job profiles & roles
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Build a New Resume</span>
              </button>
            </div>

            {/* Multiple Saved Resumes Cards Grid */}
            {savedResumes && savedResumes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
                {savedResumes.map((resItem) => {
                  const isCurrentActive = activeResumeId === resItem._id;
                  const candidateName =
                    resItem.generatedData?.personal?.fullName ||
                    resItem.generatedData?.personalInfo?.fullName ||
                    resItem.rawData?.personal?.fullName ||
                    "Candidate";
                  const allSkills = extractSkillsList(
                    resItem.generatedData?.skills || resItem.rawData?.skills,
                  );
                  const skills = allSkills.slice(0, 5);
                  const updatedDate = new Date(resItem.updatedAt || resItem.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const itemTemplateId = (
                    resItem.selectedTemplate ||
                    resItem.template ||
                    resItem.generatedData?.template ||
                    "classic"
                  ).toLowerCase();
                  const matchedTemplate =
                    RESUME_TEMPLATES.find((t) => t.id.toLowerCase() === itemTemplateId) ||
                    { name: resItem.selectedTemplate || "Classic", previewColor: "#1e3a5f" };

                  return (
                    <div
                      key={resItem._id}
                      className={`p-5 rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between shadow-xs ${
                        isCurrentActive
                          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        {/* Top: Title & Badges */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {resItem.title || "My Resume"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {candidateName} · Updated on {updatedDate}
                            </p>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            {resItem.isTailored && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                <span>🎯</span> {resItem.targetOpportunityTitle ? `Tailored for ${resItem.targetOpportunityTitle}` : "Tailored Version"}
                              </span>
                            )}
                            {resItem.isPrimary ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <span>⭐</span> Primary Active
                                </span>
                                {resItem.resumeUrl && (
                                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <span>☁️</span> Profile Synced
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMakePrimary(resItem._id)}
                                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                title="Click to make this the primary resume used when applying"
                              >
                                Set as Primary
                              </button>
                            )}
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                              style={{
                                borderColor: `${matchedTemplate.previewColor}40`,
                                backgroundColor: `${matchedTemplate.previewColor}12`,
                                color: matchedTemplate.previewColor,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={{ backgroundColor: matchedTemplate.previewColor }}
                              />
                              {matchedTemplate.name}
                            </span>
                          </div>
                        </div>

                        {/* Skills preview */}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3 mb-4">
                            {skills.map((sk, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/80"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions toolbar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectResume(resItem, "preview")}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>👁️</span>
                            <span>Open & Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectResume(resItem, "manual")}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {resItem.resumeUrl && (
                            <a
                              href={resItem.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Open Cloudinary hosted PDF in new tab"
                            >
                              <span>☁️</span> PDF ↗
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              dispatch(loadSpecificResume(resItem));
                              setTimeout(() => handleFinalize(), 200);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Download / Print PDF"
                          >
                            🖨️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteResume(resItem._id, resItem.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete this resume"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state if user has no saved resumes */
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto">
                  📂
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No Saved Resumes Yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    You have not saved any custom resumes yet. Create your first ATS-friendly resume using AI or upload your PDF.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    + Build Your First Resume with AI
                  </button>
                </div>
              </div>
            )}

            {/* Uploaded PDF Resume fallback banner if user has one */}
            {user?.resumeUrl && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
                    📎
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {user.resumeName || "Uploaded PDF Resume"}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Profile hosted PDF in Cloudinary
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={user.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    View PDF ↗
                  </a>
                </div>
              </div>
            )}

            {/* Build New Resume Card Banner */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>✨</span> Build Another Targeted Resume with AI
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Target another role (e.g. Backend Developer, Data Analyst) with a dedicated resume version.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartNew}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span> Build New Resume
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: UPLOAD PDF FLOW
            ===================================================================== */}
        {activeTab === "upload" && (
          <div className="max-w-2xl mx-auto py-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload or Link Your Resume
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload your completed resume file (PDF, DOC, DOCX up to 10MB) or link a hosted resume URL. We will save it to your account and can parse details into your profile.
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
                      Resume Saved Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Your resume has been saved to your account and synced with your profile.
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
                        View Live PDF ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab("my-resumes")}
                      className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-xl transition"
                    >
                      View All Resumes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <ResumeUploadInput
                    value={uploadedResumeUrl}
                    onChange={(url, meta) => {
                      setUploadedResumeUrl(url);
                      if (meta?.fileName) setUploadedResumeName(meta.fileName);
                    }}
                    label="Resume Document or Online Link"
                    helperText="Supported formats: PDF, DOC, DOCX up to 10MB or direct URLs."
                  />

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("my-resumes")}
                      className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!uploadedResumeUrl || isUploading}
                      onClick={handleUploadSubmit}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {isUploading && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {isUploading ? "Saving Resume..." : "Save Resume to Profile"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parsed Resume Review Modal */}
        <ParsedResumeReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          parsedData={parsedResumeData}
          existingProfile={existingProfileData}
          resumeName={selectedFile?.name}
          onConfirm={handleConfirmParsedData}
          title="Review Imported Resume Information"
        />

      </main>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ResumeBuilder;
