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
  fetchAllSavedResumes,
  saveFinalResume,
  setPrimaryResume,
  deleteSavedResume,
  loadSpecificResume,
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
import { updateStudentProfile } from "../../services/studentProfileService";
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
    savedResumes,
    activeResumeId,
    resumeTitle,
  } = useSelector((state) => state.resume);

  // View modes: 'existing' | 'choose' | 'upload' | 'ai'
  const [viewMode, setViewMode] = useState("loading");
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
  const fileInputRef = useRef(null);

  // Initial data load: fetch saved resume, all saved resumes & profile
  useEffect(() => {
    dispatch(fetchProfileForResume());
    dispatch(fetchSavedResume());
    dispatch(fetchAllSavedResumes());
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
      if (generatedResume || user?.resumeUrl || (savedResumes && savedResumes.length > 0)) {
        setViewMode("existing");
      } else {
        setViewMode("choose");
      }
    }
  }, [profileLoading, generatedResume, user?.resumeUrl, savedResumes?.length, dispatch]);

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

  const handleSelectResume = (resume, targetMode = "preview") => {
    dispatch(loadSpecificResume(resume));
    setReviewMode(targetMode);
    setViewMode("ai");
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
    if (window.confirm(`Are you sure you want to delete "${title || "this resume"}"?`)) {
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
    if (!uploadedResumeUrl) {
      setUploadError("Please upload a resume file or paste a valid resume URL.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      // First attempt to parse the resume so the user can import it to their profile & builder
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
            })
          );
        }
        setIsReviewModalOpen(true);
      } else {
        // Fallback to standard upload
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
      }
    } catch (err) {
      // If parse fails, attempt upload directly
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

      // Pre-fill rawData for AI builder
      dispatch(
        updateRawData({
          personal: confirmedData.personal || {},
          education: confirmedData.education || [],
          experience: confirmedData.experience || [],
          projects: confirmedData.projects || [],
          skills: confirmedData.skills || [],
          certifications: confirmedData.certifications || [],
          achievements: confirmedData.achievements || [],
        })
      );

      setIsReviewModalOpen(false);
      setUploadSuccess(true);
      // Seamlessly transition to AI builder step 0 or template selection
      setViewMode("ai");
      dispatch(setStep(0));
    } catch (err) {
      alert(err.message || "Failed to save parsed profile data");
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
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    My Saved Resumes
                  </h1>
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
                + Build a New Resume
              </button>
            </div>

            {/* Multiple Saved Resumes Cards Grid */}
            {savedResumes && savedResumes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
                {savedResumes.map((resItem) => {
                  const isCurrentActive = activeResumeId === resItem._id;
                  const candidateName =
                    resItem.generatedData?.personal?.fullName ||
                    resItem.generatedData?.personalInfo?.fullName ||
                    resItem.rawData?.personal?.fullName ||
                    "Candidate";
                  const allSkills = extractSkillsList(
                    resItem.generatedData?.skills || resItem.rawData?.skills
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
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition cursor-pointer"
                          >
                            👁️ Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectResume(resItem, "manual")}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectResume(resItem, "askAI")}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition cursor-pointer"
                          >
                            🤖 AI Refine
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
                      Uploaded file hosted in Cloudinary
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

            {/* Build New Resume Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs no-print">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>✨</span> Build Another Resume with AI
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Target another role (e.g. Backend Developer, Data Analyst) by creating a distinct resume.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("choose")}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span> Build New Resume
              </button>
            </div>

            {/* Resume Display / Editing Area */}
            {generatedResume ? (
              <div className="space-y-6">
                {reviewMode === "preview" && (
                  <>
                    {/* Live Theme Matcher Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                          <span>🎨</span> Match Theme:
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
                      onSaveFinal={handleSaveFinal}
                      onChangeTemplate={() => {
                        setViewMode("ai");
                        dispatch(setStep(1));
                      }}
                      isUpdating={isUpdating}
                      initialTitle={resumeTitle}
                      selectedTemplate={selectedTemplate}
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
                  Upload or Link Your Resume
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload your completed resume file (PDF, DOC, DOCX up to 10MB) or link a hosted resume URL
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
                      onClick={() => setViewMode("choose")}
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
                <div className="flex flex-wrap justify-between items-center gap-4 mt-8 max-w-5xl mx-auto no-print">
                  <button
                    type="button"
                    onClick={() => dispatch(prevStep())}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm transition cursor-pointer"
                  >
                    ← Back to Info
                  </button>
                  <div className="flex items-center gap-3">
                    {generatedResume && (
                      <button
                        type="button"
                        onClick={() => dispatch(setStep(2))}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 shadow-xs transition cursor-pointer"
                      >
                        Apply Theme to Current Resume →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTemplateNext}
                      disabled={isGenerating}
                      className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
                    >
                      {isGenerating ? "Generating…" : "Generate Resume with AI →"}
                    </button>
                  </div>
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

                    {/* Live Theme Matcher Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                          <span>🎨</span> Match Theme:
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
                      onSaveFinal={handleSaveFinal}
                      onChangeTemplate={() => dispatch(setStep(1))}
                      isUpdating={isUpdating}
                      initialTitle={resumeTitle}
                      selectedTemplate={selectedTemplate}
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
