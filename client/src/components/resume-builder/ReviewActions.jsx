import React, { useState } from "react";

const ReviewActions = ({
  onFinalize,
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
    if (initialTitle && !titleInput) {
      setTitleInput(initialTitle);
    }
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
            ? `Saved & Hosted on Cloudinary! Synced with your Profile.`
            : `Saved as "${titleInput.trim() || "My Resume"}"!`
        );
        setTimeout(() => {
          setShowSaveModal(false);
          setSaveSuccessMsg("");
          if (andDownload && onFinalize) {
            onFinalize();
          }
        }, 1600);
      }
    }
  };

  return (
    <div className="space-y-6 no-print">
      {/* =========================================================================
          MAIN DECISION BANNER (3 OPTIONS)
          ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-500/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
            <span>✨ AI Resume Generated</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready for Review</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Ye raha aapka resume! Ab aap aage kya karna chahte hain?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Aap khud details edit kar sakte hain, AI ko prompt dekar refine karwa sakte hain, ya direct final karke apne workspace me multiple resumes ke roop me save kar sakte hain.
          </p>
        </div>

        {/* 3 Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 relative z-10">
          {/* Choice 1: Khud se change karna */}
          <div
            onClick={onEditManually}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/15 hover:border-blue-400/60 cursor-pointer transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                ✏️
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-200 transition">
                Khud Se Change Karein
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Sections, personal info, bullet points, skills aur education ko directly khud edit karein.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-blue-300 group-hover:text-blue-200">
              <span>Manual Editor</span>
              <span className="group-hover:translate-x-1 transition">→</span>
            </div>
          </div>

          {/* Choice 2: AI se karwana */}
          <div
            onClick={onAskAI}
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/15 hover:border-indigo-400/60 cursor-pointer transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                🤖
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition">
                AI Se Change Karwayein
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                AI ko prompt dekar summary, bullet points ya ATS keyword optimization karwayein.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-indigo-300 group-hover:text-indigo-200">
              <span>{isUpdating ? "Updating..." : "Ask AI to Refine"}</span>
              <span className="group-hover:translate-x-1 transition">→</span>
            </div>
          </div>

          {/* Choice 3: Final karke save karna */}
          <div
            onClick={handleOpenSaveModal}
            className="group bg-gradient-to-br from-emerald-500/20 to-teal-500/30 hover:from-emerald-500/30 hover:to-teal-500/40 backdrop-blur-md rounded-2xl p-5 border border-emerald-400/40 hover:border-emerald-300 cursor-pointer transition duration-200 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition">
                💾
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-200 transition">
                  Final Karke Save Karein
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-400/30 text-emerald-200">
                  Save
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-1 leading-relaxed">
                Naye title ke sath save karein, multiple resumes me add karein, aur applications ke liye ready rakhein.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-400/20 flex items-center justify-between text-xs font-semibold text-emerald-200">
              <span>Save as Final</span>
              <span className="group-hover:translate-x-1 transition">★</span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span>Current Template:</span>
            <span className="font-bold text-white capitalize bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
              {selectedTemplate}
            </span>
            {onChangeTemplate && (
              <button
                type="button"
                onClick={onChangeTemplate}
                className="text-blue-300 hover:text-blue-200 underline ml-1"
              >
                Change Template
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onFinalize}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold transition border border-white/20 shadow-xs"
            >
              <span>🖨️</span>
              <span>Download / Print PDF</span>
            </button>

            {onBuildNew && (
              <button
                type="button"
                onClick={onBuildNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-xs"
              >
                <span>+</span>
                <span>Build New Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SAVE FINAL RESUME MODAL
          ========================================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                  💾
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Save Resume to Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Save as a distinct resume in your account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl flex items-center justify-center mx-auto animate-bounce">
                  ✓
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {saveSuccessMsg}
                </h4>
                <p className="text-xs text-slate-500">
                  Multiple resumes collection updated successfully.
                </p>
              </div>
            ) : (
              <div className="py-5 space-y-4">
                {/* Resume Title Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Resume Title / Name
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Full Stack Developer, Frontend Resume, College Placement"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aap different roles ke liye multiple resumes save kar sakte hain.
                  </p>
                </div>

                {/* Primary Toggle */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="setPrimaryCheck"
                    checked={isPrimaryInput}
                    onChange={(e) => setIsPrimaryInput(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="setPrimaryCheck" className="text-xs cursor-pointer select-none">
                    <span className="font-bold text-slate-800 block">
                      Set as Primary / Active Resume ⭐
                    </span>
                    <span className="text-slate-500 block mt-0.5">
                      Internships aur Jobs apply karte waqt ye resume default send hoga.
                    </span>
                  </label>
                </div>

                {/* Template Tag */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Selected Template:</span>
                  <span className="font-semibold text-slate-700 capitalize bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {selectedTemplate}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving || localSaving}
                    onClick={() => handleConfirmSave(false)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {(isSaving || localSaving) ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving to Cloudinary…</span>
                      </>
                    ) : (
                      <span>💾 Save to Cloudinary & Workspace</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || localSaving}
                    onClick={() => handleConfirmSave(true)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🖨️ Save & Download PDF</span>
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
