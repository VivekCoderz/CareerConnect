const CareerDirectionCard = ({
  currentRole = "Senior Software Engineer",
  targetRole = "Engineering Lead",
  focusAreas = ["System Design", "Cloud Architecture", "Leadership"],
  onViewCareerPath,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Career Direction</h2>
            <p className="text-xs text-slate-500 mt-0.5">Target transition and primary growth vectors</p>
          </div>

          <button
            type="button"
            onClick={onViewCareerPath}
            className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition shrink-0"
          >
            View Career Path
          </button>
        </div>

        {/* Simple Career Transition Flow */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 mb-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs">
              {currentRole}
            </div>
            
            <div className="flex items-center justify-center text-purple-600 font-bold text-sm">
              <span className="hidden sm:inline">→</span>
              <span className="sm:hidden">↓</span>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs">
              {targetRole}
            </div>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Focus Areas:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {focusAreas.map((area, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/60">
                  {area}
                </span>
                {idx < focusAreas.length - 1 && (
                  <span className="text-slate-300 font-bold">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerDirectionCard;
