import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { uploadResumeAPI, parseResumeAPI, confirmParsedProfileAPI } from "../../services/resumeService";
import { updateUserProfile } from "../../redux/features/authSlice";
import ParsedResumeReviewModal from "../resume-builder/ParsedResumeReviewModal";

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
  const fileInputRef = useRef(null);

  const hasResume = !!(resume?.resumeName || resume?.resumeUrl);
  const resumeName = resume?.resumeName || "Student_Professional_Resume.pdf";
  const uploadedDate = resume?.uploadedAt
    ? new Date(resume.uploadedAt).toLocaleDateString()
    : "Recently synced";

  const handleDownload = () => {
    if (resume?.resumeUrl) {
      window.open(resume.resumeUrl, "_blank");
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

  const handleOpenModal = () => {
    setShowModal(true);
    setModalStep("choice");
    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalStep("choice");
    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess(false);
  };

  const handleSelectBuildWithAI = () => {
    handleCloseModal();
    navigate("/resume-builder?mode=ai");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Resume & CV Status</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated ATS-friendly resume generated from your verified profile
          </p>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            hasResume
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {hasResume ? "✓ Ready" : "○ Not Created"}
        </span>
      </div>

      {hasResume ? (
        <div className="space-y-4">
          {/* Existing Resume Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
                📄
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                  {resumeName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ATS Optimized • Synced on {uploadedDate}
                </p>
              </div>
            </div>

            {/* Action buttons: Update Resume & Download PDF */}
            <div className="flex items-center gap-2">
              <Link
                to="/student/profile"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Update Resume
              </Link>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Download PDF
              </button>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              Distinct, Visible: "+ Build a New Resume" Action
              ──────────────────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Want to create a different version or upload a new file?
              </p>
              <p className="text-[11px] text-slate-400">
                Build with AI using your profile data or upload an existing PDF
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              <span className="text-sm leading-none">+</span> Build a New Resume
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium mb-1">
            You haven't created or uploaded a resume yet.
          </p>
          <p className="text-[11px] text-slate-400 mb-4">
            Build your resume in 1-click using your education, skills, and project data.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            + Build a New Resume →
          </button>
        </div>
      )}

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
                    Upload Your Resume
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your resume in PDF format
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
                      Resume uploaded successfully!
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
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="application/pdf,.pdf"
                        className="hidden"
                      />
                      <div className="text-2xl mb-2">📄</div>
                      {selectedFile ? (
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-xs mx-auto">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Click to browse PDF resume
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            PDF only, up to 10MB
                          </p>
                        </div>
                      )}
                    </div>

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
                        disabled={!selectedFile || uploading}
                        onClick={handleUpload}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                      >
                        {uploading && (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {uploading ? "Uploading & Parsing..." : "Upload & Review"}
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
