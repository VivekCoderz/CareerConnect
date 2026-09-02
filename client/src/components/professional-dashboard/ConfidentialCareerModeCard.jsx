const ConfidentialCareerModeCard = ({
  status = "Active",
  onManagePrivacy,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-3.5">
      {/* Header with small green active indicator */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">Confidential Career Mode</h2>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {status}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed font-medium">
        Your profile is visible only to verified recruiters matching your preferences.
      </p>

      {/* Action */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onManagePrivacy}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 transition inline-flex items-center gap-1 group"
        >
          <span>Manage Privacy</span>
          <span className="group-hover:translate-x-0.5 transition">→</span>
        </button>
      </div>
    </div>
  );
};

export default ConfidentialCareerModeCard;
