import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { updateStudentProfile } from "../../services/studentProfileService";
<<<<<<< HEAD
import { parseResumeAPI, confirmParsedProfileAPI } from "../../services/resumeService";
import ParsedResumeReviewModal from "../resume-builder/ParsedResumeReviewModal";
=======
import ResumeUploadInput from "../common/ResumeUploadInput";
>>>>>>> fa30fe4a6cc816a728960926a7682d50b9b41aac

const ResumeSection = ({
  resume,
  setProfile,
}) => {
  const [url, setUrl] = useState(
    resume?.resumeUrl || ""
  );

  const [name, setName] = useState(
    resume?.resumeName || ""
  );

  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [existingProfileData, setExistingProfileData] = useState(null);
  const [parsedResumeUrl, setParsedResumeUrl] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSavingParsed, setIsSavingParsed] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Only PDF files are supported for resume parsing.");
      return;
    }

    try {
      setUploadingPdf(true);
      const parseRes = await parseResumeAPI(file);
      if (parseRes?.success && parseRes?.parsedData) {
        setParsedData(parseRes.parsedData);
        setExistingProfileData(parseRes.existingProfile || null);
        setParsedResumeUrl(parseRes.resumeUrl || "");
        setName(file.name);
        if (parseRes.resumeUrl) setUrl(parseRes.resumeUrl);
        setIsReviewModalOpen(true);
      } else {
        alert("Failed to parse resume. You can still paste the link manually.");
      }
    } catch (err) {
      alert(err.message || "Error parsing resume PDF.");
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmParsed = async (payload) => {
    try {
      setIsSavingParsed(true);
      const res = await confirmParsedProfileAPI(payload);
      if (res?.profile) {
        setProfile(res.profile);
      }
      if (payload.resumeUrl) {
        setUrl(payload.resumeUrl);
        setName(payload.resumeName || "Uploaded Resume.pdf");
      }
      setIsReviewModalOpen(false);
      alert("Profile successfully updated from your resume!");
    } catch (err) {
      alert(err.message || "Failed to update profile from parsed resume.");
    } finally {
      setIsSavingParsed(false);
    }
  };

  const handleResumeChange = (newUrl, meta) => {
    setUrl(newUrl);
    if (meta?.fileName && (!name || name === "Student_Professional_Resume.pdf")) {
      setName(meta.fileName);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!url) {
      alert("Please upload a resume file or paste a resume URL first.");
      return;
    }

    try {
      setSaving(true);
      const response = await updateStudentProfile({
        resume: {
          resumeUrl: url,
          resumeName: name || "Student_Professional_Resume.pdf",
          uploadedAt: new Date(),
        },
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      alert("Resume saved successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="pb-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Resume & CV Documents</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload your resume from your device or paste a hosted link</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            disabled={uploadingPdf}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {uploadingPdf ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>📤</span>
            )}
            {uploadingPdf ? "Parsing Resume..." : "Upload & Auto-Fill Profile"}
          </button>
          <Link
            to="/resume-builder?mode=choose"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
          >
            <span>+</span> Build a New Resume
          </Link>
        </div>
      </div>

      {resume?.resumeUrl ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              📄
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate">{resume.resumeName || "My Resume.pdf"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Uploaded/Synced {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : "recently"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={resume.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-center"
            >
              View Live Resume ↗
            </a>
            <Link
              to="/resume-builder?mode=choose"
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition self-start sm:self-center"
            >
              + Build New
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">You haven't attached a live resume link yet. Upload a PDF above to auto-fill your profile details!</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="space-y-4">
          <ResumeUploadInput
            value={url}
            onChange={handleResumeChange}
            label="Resume Document or Online Link"
            helperText="Supported formats: PDF, DOC, DOCX up to 10MB or direct URLs."
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name / Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. John_Doe_FullStack_Resume.pdf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            {saving ? "Saving..." : "Save Resume Information"}
          </button>
        </div>
      </form>

      {/* Parsed Resume Review Modal */}
      <ParsedResumeReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        parsedData={parsedData}
        existingProfile={existingProfileData}
        resumeUrl={parsedResumeUrl}
        resumeName={name}
        isSaving={isSavingParsed}
        onConfirm={handleConfirmParsed}
        title="Review & Confirm Resume Auto-Fill"
      />
    </section>
  );
};

export default ResumeSection;