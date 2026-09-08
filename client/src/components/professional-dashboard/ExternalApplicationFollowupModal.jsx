const ExternalApplicationFollowupModal = ({
  isOpen,
  onClose,
  opportunity,
  onConfirmApplied,
}) => {
  if (!isOpen || !opportunity) return null;

  const companyName = opportunity.company || opportunity.companyName || "Company";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-2xl font-bold mx-auto shadow-xs">
          🌐
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
            External Application Tracking
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
            Did you apply on {companyName}&apos;s portal?
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {opportunity.title} · {companyName}
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          If you submitted your application on the official career site, we will add it to your <strong>My Applications</strong> tracker to monitor your progress.
        </p>

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              if (onConfirmApplied) onConfirmApplied(opportunity);
              onClose();
            }}
            className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
          >
            <span>Yes, I Applied</span>
            <span>✓</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Not yet / Still browsing
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalApplicationFollowupModal;
