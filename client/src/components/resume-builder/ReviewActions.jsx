import React, { useState } from "react";

const ReviewActions = ({
  onFinalize,
  onExportLatex,
  onAskAI,
  onEditManually,
  onBuildNew,
  onSaveFinal,
  onChangeTemplate,
  isUpdating = false,
  isSaving = false,
  initialTitle = "",
  selectedTemplate = "classic",
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [titleInput, setTitleInput] = useState(initialTitle || "My Professional Resume");
  const [isPrimaryInput, setIsPrimaryInput] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [localSaving, setLocalSaving] = useState(false);

  const handleOpenSaveModal = () => {
    if (initialTitle && !titleInput) setTitleInput(initialTitle);
    setShowSaveModal(true);
  };

  const handleConfirmSave = async (andDownload = false) => {
    if (onSaveFinal) {
      setLocalSaving(true);
      const res = await onSaveFinal({
        title: titleInput.trim() || "My Resume",
        isPrimary: isPrimaryInput,
      });
      setLocalSaving(false);
      if (res?.success) {
        const cloudUrl = res?.resume?.resumeUrl || res?.resumeUrl;
        setSaveSuccessMsg(
          cloudUrl
            ? `Resume saved and hosted successfully. Profile synced.`
            : `Saved as "${titleInput.trim() || "My Resume"}".`
        );
        setTimeout(() => {
          setShowSaveModal(false);
          setSaveSuccessMsg("");
          if (andDownload && onFinalize) onFinalize();
        }, 1600);
      }
    }
  };

  return (
    <div className="space-y-4 no-print">
      {/* =====================================================================
          RESUME ACTIONS PANEL — Clean, theme-matched professional SaaS card
          ===================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm flex-shrink-0 shadow-xs">
              ✅
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Resume Ready for Export</h3>
              <p className="text-xs text-slate-500 mt-0.5">Review your resume below, then choose an action</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> ATS Optimized
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/80">
              📄 1-Page A4
            </span>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Action 1: Edit Manually */}
          <button
            type="button"
            onClick={onEditManually}
            className="group flex flex-col sm:items-start items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 flex items-center justify-center text-lg transition shadow-xs">
              ✏️
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs group-hover:text-blue-700 transition">Edit Manually</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Directly edit sections, bullet points, skills, or contact info
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition flex items-center gap-1 mt-auto">
              Open Editor <span className="group-hover:translate-x-1 transition inline-block">→</span>
            </span>
          </button>

          {/* Action 2: AI Refine */}
          <button
            type="button"
            onClick={onAskAI}
            className="group flex flex-col sm:items-start items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 flex items-center justify-center text-lg transition shadow-xs">
              🤖
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition">AI Refinement</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Instruct the AI to rewrite bullets, improve summary, or optimize for ATS
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition flex items-center gap-1 mt-auto">
              {isUpdating ? "Processing…" : "Ask AI to Refine"} <span className="group-hover:translate-x-1 transition inline-block">→</span>
            </span>
          </button>

          {/* Action 3: Save Final */}
          <button
            type="button"
            onClick={handleOpenSaveModal}
            className="group flex flex-col sm:items-start items-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 hover:border-emerald-300 transition cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 flex items-center justify-center text-lg transition shadow-xs">
              💾
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition">Save to Profile</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">Save</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Save this resume with a title, set as primary, and keep multiple versions
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-auto">
              Save as Final ★
            </span>
          </button>
        </div>

        {/* Quick Toolbar: Template & Download */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Active Template:</span>
            <span className="font-bold text-slate-700 capitalize bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {selectedTemplate}
            </span>
            {onChangeTemplate && (
              <button
                type="button"
                onClick={onChangeTemplate}
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition cursor-pointer"
              >
                Change Layout
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExportLatex && (
              <button
                type="button"
                onClick={onExportLatex}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                title="Export ATS-optimized LaTeX source code (.tex) or compile with Overleaf"
              >
                <span className="font-mono font-black text-[11px] bg-white/20 px-1 py-0.2 rounded">TEX</span>
                <span>Export LaTeX</span>
              </button>
            )}

            <button
              type="button"
              onClick={onFinalize}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer border border-slate-700"
            >
              <span>🖨️</span>
              <span>Download / Print PDF</span>
            </button>

            {onBuildNew && (
              <button
                type="button"
                onClick={onBuildNew}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>+</span>
                <span className="hidden sm:inline">New Tailored</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SAVE FINAL RESUME MODAL
          ===================================================================== */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center text-xl">
                  💾
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Save Resume to Profile</h3>
                  <p className="text-xs text-slate-500">Stored securely in your workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto animate-bounce">
                  ✓
                </div>
                <h4 className="text-base font-bold text-slate-900">{saveSuccessMsg}</h4>
                <p className="text-xs text-slate-500">Your resume collection has been updated successfully.</p>
              </div>
            ) : (
              <div className="py-5 space-y-4">
                {/* Resume Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Resume Title / Label
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Full Stack Developer — Google, Frontend Resume, Campus Placement"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    You can save multiple tailored resumes for different roles and companies.
                  </p>
                </div>

                {/* Primary Toggle */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="setPrimaryCheck"
                    checked={isPrimaryInput}
                    onChange={(e) => setIsPrimaryInput(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="setPrimaryCheck" className="text-xs cursor-pointer select-none">
                    <span className="font-bold text-slate-800 block">Set as Primary / Default Resume ⭐</span>
                    <span className="text-slate-500 block mt-0.5">
                      This resume will be automatically attached when you apply to internships and jobs on CareerConnect.
                    </span>
                  </label>
                </div>

                {/* Template Info */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Active Layout Theme:</span>
                  <span className="font-semibold text-slate-700 capitalize bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {selectedTemplate}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isSaving || localSaving}
                    onClick={() => handleConfirmSave(false)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {(isSaving || localSaving) ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <span>💾 Save to My Resumes</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || localSaving}
                    onClick={() => handleConfirmSave(true)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🖨️ Save &amp; Download PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewActions;
