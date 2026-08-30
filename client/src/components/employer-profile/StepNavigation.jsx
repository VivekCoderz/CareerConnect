import React from "react";

const StepNavigation = ({
  currentStep = 1,
  totalSteps = 6,
  onBack = () => {},
  onNext = () => {},
  onSaveDraft = () => {},
  onPublish = () => {},
  isSaving = false,
  isDraftSaving = false,
  isPublishing = false,
}) => {
  return (
    <div className="pt-6 mt-8 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
      {/* Back & Save Draft */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving || isDraftSaving || isPublishing}
            className="flex-1 sm:flex-none h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            ← Back
          </button>
        )}

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving || isDraftSaving || isPublishing}
          className="flex-1 sm:flex-none h-11 px-5 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-[#92400e] text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isDraftSaving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-amber-600/40 border-t-amber-800 rounded-full animate-spin" />
              Saving Draft...
            </>
          ) : (
            "💾 Save Draft"
          )}
        </button>
      </div>

      {/* Primary Action Button (Continue or Publish) */}
      <div className="w-full sm:w-auto">
        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={onNext}
            disabled={isSaving || isDraftSaving}
            className="w-full sm:w-auto min-w-[170px] h-11 px-6 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue →"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="w-full sm:w-auto min-w-[200px] h-11 px-6 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] disabled:opacity-60 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {isPublishing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Publishing Profile...
              </>
            ) : (
              "🚀 Publish Company Profile"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default StepNavigation;
