const OpportunityDetailModal = ({ isOpen, onClose, opportunity, onApply }) => {
  if (!isOpen || !opportunity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {opportunity.matchPercentage || 92}% Match
              </span>
              <span className="text-xs font-semibold text-slate-500">{opportunity.location}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {opportunity.title}
            </h3>
            <p className="text-sm font-semibold text-purple-700 mt-0.5">
              {opportunity.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block">Compensation</span>
            <span className="font-bold text-slate-900">{opportunity.salary}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block">Experience</span>
            <span className="font-bold text-slate-900">{opportunity.experience}</span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-900 block mb-2">Required Core Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.tags?.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <p className="font-semibold text-slate-900">About this Leadership Opening:</p>
          <p className="leading-relaxed">
            Leading architectural decisions, overseeing distributed microservices, and collaborating closely with engineering leadership to drive platform reliability and scalability.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (onApply) onApply(opportunity);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs shadow-purple-600/20 transition"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailModal;
