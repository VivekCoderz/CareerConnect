import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { uploadResumeAPI, parseResumeAPI, confirmParsedProfileAPI } from "../../services/resumeService";
import { updateUserProfile } from "../../redux/features/authSlice";
import ParsedResumeReviewModal from "../resume-builder/ParsedResumeReviewModal";
import { updateStudentProfile } from "../../services/studentProfileService";
import ResumeUploadInput from "../common/ResumeUploadInput";
import { getResumeHref } from "../../utils/resumeAccess";
import {
  FileText,
  Zap,
  Target,
  FolderOpen,
  UploadCloud,
  Download,
  ExternalLink,
  Edit3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const ResumeStatusCard = ({ resume, profile }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState("choice"); // 'choice' | 'upload'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [existingProfileData, setExistingProfileData] = useState(null);
  const [parsedResumeUrl, setParsedResumeUrl] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSavingParsed, setIsSavingParsed] = useState(false);
  const [modalResumeUrl, setModalResumeUrl] = useState("");
  const [modalResumeName, setModalResumeName] = useState("");
  const fileInputRef = useRef(null);

  const hasResume = !!(resume?.resumeName || resume?.resumeUrl);
  const resumeName = resume?.resumeName || "Student_Professional_Resume.pdf";
  const uploadedDate = resume?.uploadedAt
    ? new Date(resume.uploadedAt).toLocaleDateString()
    : "Recently synced";

  const handleDownload = () => {
    if (resume?.resumeUrl) {
      window.open(getResumeHref(resume.resumeUrl), "_blank", "noopener,noreferrer");
    } else {
      navigate("/resume-builder");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be under 10 MB.");
      return;
    }
    setSelectedFile(file);
    setUploadError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a PDF file.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // First parse resume to extract information
      const parseRes = await parseResumeAPI(selectedFile);
      if (parseRes?.success && parseRes?.parsedData) {
        setParsedData(parseRes.parsedData);
        setExistingProfileData(parseRes.existingProfile || null);
        setParsedResumeUrl(parseRes.resumeUrl || "");
        if (parseRes.resumeUrl) {
          dispatch(
            updateUserProfile({
              resumeUrl: parseRes.resumeUrl,
              resumeName: parseRes.resumeName || selectedFile.name,
            }),
          );
        }
        setShowModal(false);
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
      } catch (uploadErr) {
        setUploadError(uploadErr.message || err.message || "Failed to upload resume.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmParsedProfile = async (payload) => {
    try {
      setIsSavingParsed(true);
      await confirmParsedProfileAPI(payload);
      setIsReviewModalOpen(false);
      setUploadSuccess(true);
      if (payload.resumeUrl) {
        dispatch(
          updateUserProfile({
            resumeUrl: payload.resumeUrl,
            resumeName: payload.resumeName || selectedFile?.name || "Uploaded Resume.pdf",
          }),
        );
      }
    } catch (err) {
      alert(err.message || "Failed to save parsed resume details to profile.");
    } finally {
      setIsSavingParsed(false);
    }
  };

  const handleSaveModalResume = async () => {
    if (!modalResumeUrl) {
      setUploadError("Please select a file or paste a valid resume URL.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const finalName = modalResumeName || "Student_Professional_Resume.pdf";
      dispatch(
        updateUserProfile({
          resumeUrl: modalResumeUrl,
          resumeName: finalName,
        }),
      );
      await updateStudentProfile({
        resume: {
          resumeUrl: modalResumeUrl,
          resumeName: finalName,
          uploadedAt: new Date(),
        },
      });
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || "Failed to update resume.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setModalStep("choice");
    setSelectedFile(null);
    setModalResumeUrl("");
    setModalResumeName("");
    setUploadError("");
    setUploadSuccess(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalStep("choice");
    setSelectedFile(null);
    setModalResumeUrl("");
    setModalResumeName("");
    setUploadError("");
    setUploadSuccess(false);
  };

  const handleSelectBuildWithAI = () => {
    handleCloseModal();
    navigate("/resume-builder?mode=ai");
  };

  const resumeTools = [
    {
      id: "ats-checker",
      title: "ATS Check & AI Fix",
      badge: "NEW AI",
      badgeColor: "bg-indigo-600 text-white",
      icon: Zap,
      iconBg: "bg-indigo-600 text-white",
      borderColor: "border-indigo-100 hover:border-indigo-400",
      bgGradient: "from-indigo-50/60 via-white to-purple-50/30",
      description: "Scan against Job Description, spot line mistakes & 1-click fix to 90%+.",
      cta: "Audit & Fix Resume",
      onClick: () => navigate("/resume-builder?mode=ats-checker"),
    },
    {
      id: "ats-job",
      title: "Build Resume for Job",
      badge: "Targeted JD",
      badgeColor: "bg-blue-100 text-blue-700",
      icon: Target,
      iconBg: "bg-blue-600 text-white",
      borderColor: "border-blue-100 hover:border-blue-400",
      bgGradient: "from-blue-50/60 via-white to-sky-50/30",
      description: "Generate an ATS-ready resume customized for a specific role & company.",
      cta: "Match Job Description",
      onClick: () => navigate("/resume-builder?mode=ats"),
    },
    {
      id: "custom-builder",
      title: "Custom AI Studio",
      badge: "Step-by-Step",
      badgeColor: "bg-emerald-100 text-emerald-700",
      icon: Edit3,
      iconBg: "bg-emerald-600 text-white",
      borderColor: "border-emerald-100 hover:border-emerald-400",
      bgGradient: "from-emerald-50/60 via-white to-teal-50/30",
      description: "Interactive builder with AI writing assistant and multiple modern templates.",
      cta: "Open Resume Studio",
      onClick: () => navigate("/resume-builder?mode=ai"),
    },
    {
      id: "saved-resumes",
      title: "My Saved Resumes",
      badge: "All Versions",
      badgeColor: "bg-amber-100 text-amber-800",
      icon: FolderOpen,
      iconBg: "bg-amber-600 text-white",
      borderColor: "border-slate-200 hover:border-slate-400",
      bgGradient: "from-slate-50 via-white to-amber-50/20",
      description: "Browse, duplicate, switch templates, or download previously saved versions.",
      cta: "View Saved Resumes",
      onClick: () => navigate("/resume-builder?mode=saved"),
    },
    {
      id: "import-resume",
      title: "Import Existing Resume",
      badge: "Auto-Fill",
      badgeColor: "bg-sky-100 text-sky-800",
      icon: UploadCloud,
      iconBg: "bg-sky-600 text-white",
      borderColor: "border-sky-100 hover:border-sky-400",
      bgGradient: "from-sky-50/60 via-white to-blue-50/30",
      description: "Upload existing resume file to auto-extract profile details & sync skills.",
      cta: "Upload & Parse",
      onClick: () => {
        setModalStep("upload");
        setShowModal(true);
      },
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Resume & CV Status</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated ATS-friendly resume, AI optimization, and targeted job tools
          </p>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            hasResume
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {hasResume ? "✓ Ready" : "○ Needs Setup"}
        </span>
      </div>

      {hasResume ? (
        <div className="space-y-4">
          {/* Active Primary Resume Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                    {resumeName}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> ATS Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Primary Resume • Synced on {uploadedDate}
                </p>
              </div>
            </div>

            {/* Action buttons: Download PDF, Preview, Edit */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                title="Download current resume PDF"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download PDF</span>
              </button>
              {resume?.resumeUrl && (
                <a
                  href={getResumeHref(resume.resumeUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
                  title="Preview resume in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview</span>
                </a>
              )}
              <Link
                to="/student/profile"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                title="Update resume information in profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update Resume</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
              📄
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                No active resume configured yet
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose any option below to generate with AI, tailor to a job description, or upload your file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Direct Resume Tools & Creation Options Grid */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>⚡</span> Resume Tools & Creation Options
            </h3>
            <p className="text-[11px] text-slate-500">
              Select any tool directly — no extra navigation or clicks needed
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/resume-builder")}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <span>Open Resume Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {resumeTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={tool.onClick}
                className={`group p-4 rounded-2xl bg-gradient-to-br ${tool.bgGradient} border ${tool.borderColor} hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between cursor-pointer relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className={`w-9 h-9 rounded-xl ${tool.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tool.badgeColor} shrink-0`}>
                      {tool.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {tool.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-3">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>{tool.cta}</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================
          MODAL: How do you want to create your resume?
          ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            {/* Close button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>

            {modalStep === "choice" ? (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    How do you want to create your resume?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose the method that works best for you
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Upload Resume */}
                  <div
                    onClick={() => setModalStep("upload")}
                    className="group border-2 border-slate-200 hover:border-blue-600 rounded-2xl p-5 cursor-pointer transition flex items-start gap-4 hover:shadow-md bg-white"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-600 flex items-center justify-center text-xl shrink-0 transition">
                      📁
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                          Upload Resume
                        </h4>
                        <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
                          Upload →
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload your existing resume file (PDF format)
                      </p>
                    </div>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center my-2">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      OR
                    </span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Option 2: Build with AI */}
                  <div
                    onClick={handleSelectBuildWithAI}
                    className="group border-2 border-blue-600/70 hover:border-blue-600 rounded-2xl p-5 cursor-pointer transition flex items-start gap-4 hover:shadow-md bg-blue-50/30 relative"
                  >
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      ✨ Recommended
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
                      ⚡
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                          Build with AI
                        </h4>
                        <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
                          Start →
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Create a resume using your existing CareerConnect profile information
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Upload Flow in Modal */
              <div>
                <button
                  type="button"
                  onClick={() => setModalStep("choice")}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 inline-flex items-center gap-1 cursor-pointer"
                >
                  ← Back to Options
                </button>

                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-slate-900">
                    Upload or Link Resume
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a resume file from your device (PDF, DOC, DOCX) or paste a hosted link
                  </p>
                </div>

                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    {uploadError}
                  </div>
                )}

                {uploadSuccess ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 text-xl flex items-center justify-center mx-auto">
                      ✓
                    </div>
                    <p className="text-xs font-bold text-emerald-900">
                      Resume saved successfully!
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Attached to your profile and ready for applications.
                    </p>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResumeUploadInput
                      value={modalResumeUrl}
                      onChange={(url, meta) => {
                        setModalResumeUrl(url);
                        if (meta?.fileName) setModalResumeName(meta.fileName);
                      }}
                      label="Resume File or URL"
                      helperText="Supported: PDF, DOC, DOCX up to 10MB or direct URLs."
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!modalResumeUrl || uploading}
                        onClick={handleSaveModalResume}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                      >
                        {uploading && (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {uploading ? "Uploading & Parsing..." : "Upload & Review"}
                        {uploading ? "Saving..." : "Save to Profile"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parsed Resume Review Modal */}
      <ParsedResumeReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        parsedData={parsedData}
        existingProfile={existingProfileData}
        resumeUrl={parsedResumeUrl}
        resumeName={selectedFile?.name}
        isSaving={isSavingParsed}
        onConfirm={handleConfirmParsedProfile}
        title="Review & Confirm Resume Auto-Fill"
      />
    </div>
  );
};

export default ResumeStatusCard;
