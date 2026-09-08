import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { tailorResumeAPI, fetchTailoredResumeAPI } from "../../services/resumeService";
import { applyToInternship, applyToJob } from "../../services/applicationService";
import ResumePreview from "./ResumePreview";
import { RESUME_TEMPLATES } from "../../data/templates";

export default function TailoredResumeApplicationModal({
  isOpen,
  onClose,
  opportunity,
  opportunityType = "Job", // "Job" | "Internship"
  onApplicationSubmitted,
}) {
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tailoredResume, setTailoredResume] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [coverNote, setCoverNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isReGenerating, setIsReGenerating] = useState(false);

  const oppId = opportunity?._id || opportunity?.id;
  const oppTitle = opportunity?.title || "Opportunity";
  const compName = opportunity?.companyName || opportunity?.company || "";

  useEffect(() => {
    if (!isOpen || !oppId) return;

    let isMounted = true;
    setSubmitSuccess(false);
    setError("");

    const loadOrCreateTailoredResume = async () => {
      try {
        setLoading(true);
        // 1. Check if a tailored resume already exists
        const checkRes = await fetchTailoredResumeAPI(opportunityType, oppId);
        if (isMounted && checkRes?.exists && checkRes?.resume) {
          setTailoredResume(checkRes.resume);
          setSelectedTemplate(checkRes.resume.selectedTemplate || "classic");
          setLoading(false);
          return;
        }

        // 2. Generate a new tailored resume based on user's profile and target opportunity
        const genRes = await tailorResumeAPI({
          opportunityType,
          opportunityId: oppId,
          opportunityData: opportunity,
          template: selectedTemplate,
        });

        if (isMounted && genRes?.resume) {
          setTailoredResume(genRes.resume);
          setSelectedTemplate(genRes.resume.selectedTemplate || selectedTemplate);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to tailor resume for this opportunity. Please ensure you have profile details saved."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOrCreateTailoredResume();

    return () => {
      isMounted = false;
    };
  }, [isOpen, oppId, opportunityType]);

  const handleReTailor = async (templateToUse = selectedTemplate) => {
    try {
      setIsReGenerating(true);
      setError("");
      const genRes = await tailorResumeAPI({
        opportunityType,
        opportunityId: oppId,
        opportunityData: opportunity,
        template: templateToUse,
      });
      if (genRes?.resume) {
        setTailoredResume(genRes.resume);
        setSelectedTemplate(templateToUse);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to re-tailor resume");
    } finally {
      setIsReGenerating(false);
    }
  };

  const handleTemplateChange = (tplId) => {
    setSelectedTemplate(tplId);
    handleReTailor(tplId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tailoredResume?.resumeUrl && !user?.resumeUrl) {
      setError("Please wait until the tailored resume finishes compiling or check your profile resume.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const resumeUrlToSubmit = tailoredResume?.resumeUrl || user?.resumeUrl;
      const payload = {
        coverNote,
        resumeUrl: resumeUrlToSubmit,
      };

      let res;
      if (opportunityType.toLowerCase() === "internship") {
        res = await applyToInternship(oppId, payload);
      } else {
        res = await applyToJob(oppId, payload);
      }

      if (res?.success) {
        setSubmitSuccess(true);
        if (onApplicationSubmitted) onApplicationSubmitted(res);
      } else {
        setError(res?.message || "Failed to submit application");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error submitting application. You may have already applied."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const matchedSkills = tailoredResume?.generatedData?.tailoredMeta?.matchedSkills || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-blue-100 mb-2">
              <span>🎯</span> Job-Specific Tailored Resume
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Apply for {oppTitle}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
              {compName ? `${compName} • ` : ""}Grounds resume in your verified skills and experiences. Zero fabricated details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg leading-none cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between">
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

          {loading || isReGenerating ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {isReGenerating ? "Updating Tailored Resume..." : "Tailoring Your Resume with AI..."}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Analyzing required skills for <strong>{oppTitle}</strong>, prioritizing your verified projects and experience, and generating an ATS-optimized tailored resume.
              </p>
            </div>
          ) : submitSuccess ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-900">Application Submitted!</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your tailored resume and application details have been submitted for <strong>{oppTitle}</strong>.
              </p>
              {tailoredResume?.resumeUrl && (
                <div className="pt-2">
                  <a
                    href={tailoredResume.resumeUrl}
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
          ) : tailoredResume?.generatedData ? (
            <div className="space-y-6">
              {/* Matched Skills Bar */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">✨ Verified Skills Matched:</span>
                    <span className="text-[11px] font-semibold text-blue-700">
                      {matchedSkills.length ? `${matchedSkills.length} skills aligned` : "ATS Optimized"}
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
                        Sections and professional summary formatted to highlight your verified background.
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {tailoredResume.resumeUrl && (
                    <a
                      href={tailoredResume.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs"
                      title="Download PDF"
                    >
                      ⬇ Download PDF
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleReTailor(selectedTemplate)}
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
                    <span>🎨</span> Resume Template:
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

              {/* Resume Live Preview Card */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-[450px] overflow-y-auto bg-white p-4">
                <ResumePreview
                  data={tailoredResume.generatedData}
                  templateId={selectedTemplate || "classic"}
                />
              </div>

              {/* Cover Note Section */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cover Note to Recruiter (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Introduce yourself or highlight why you are particularly excited about this role..."
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-slate-500">
                    Your original profile & saved resumes remain completely safe and untouched.
                  </p>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !tailoredResume?.resumeUrl}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting Application...
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
              No tailored resume available. Please close and try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
