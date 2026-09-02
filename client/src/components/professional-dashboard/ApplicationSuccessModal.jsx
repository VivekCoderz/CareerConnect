const ApplicationSuccessModal = ({
  isOpen,
  onClose,
  application,
  onViewApplications,
}) => {
  if (!isOpen || !application) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Success Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl font-bold mx-auto shadow-xs">
          ✓
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
            Application Submitted
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
            {application.title}
          </h2>
          <p className="text-sm font-bold text-purple-700">
            {application.company}
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto font-medium">
          Your profile and executive ATS resume have been successfully transmitted to the {application.company} talent acquisition team.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onViewApplications) onViewApplications();
            }}
            className="w-full py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
          >
            <span>View in My Applications</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSuccessModal;
