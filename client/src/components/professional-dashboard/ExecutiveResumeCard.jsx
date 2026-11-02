import { Link } from "react-router-dom";

const ExecutiveResumeCard = ({
  lastUpdated = "Not uploaded yet",
  onViewResume,
  onDownload,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center text-sm font-bold">
            📄
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Executive Resume</h2>
            <span className="text-[11px] text-slate-400 block">
              Last Updated: {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed font-medium">
        Keep your resume up to date so recruiters see your latest experience.
      </p>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={onViewResume}
          className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition text-center"
        >
          View Resume
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition text-center shadow-xs"
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default ExecutiveResumeCard;
