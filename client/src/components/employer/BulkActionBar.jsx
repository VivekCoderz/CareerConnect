import { useState } from "react";

// Bulk actions for the applicant list: shortlist, review, interview or reject many
// applicants at once. Rejecting asks for a second click to avoid mistakes.
const ACTIONS = [
  { status: "Shortlisted", label: "Shortlist", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { status: "Under Review", label: "Under review", className: "bg-slate-100 hover:bg-slate-200 text-slate-800" },
  { status: "Interview", label: "Move to interview", className: "bg-indigo-600 hover:bg-indigo-700 text-white" },
];

const BulkActionBar = ({ selectedCount, visibleCount, allVisibleSelected, onToggleAll, onClear, onApply, busy }) => {
  const [confirmReject, setConfirmReject] = useState(false);

  const apply = async (status) => {
    setConfirmReject(false);
    await onApply(status);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mr-2">
        <input type="checkbox" checked={allVisibleSelected && visibleCount > 0} onChange={onToggleAll} disabled={visibleCount === 0 || busy} />
        Select all shown ({visibleCount})
      </label>

      {selectedCount > 0 && (
        <>
          <span className="text-xs text-slate-500 mr-1">{selectedCount} selected</span>
          {ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy}
              onClick={() => apply(action.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${action.className}`}
            >
              {action.label}
            </button>
          ))}
          {confirmReject ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-700">Reject {selectedCount}?</span>
              <button type="button" disabled={busy} onClick={() => apply("Rejected")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50">
                Yes, reject
              </button>
              <button type="button" onClick={() => setConfirmReject(false)} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmReject(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50">
              Reject
            </button>
          )}
          <button type="button" onClick={onClear} className="ml-auto text-xs text-slate-500 hover:text-slate-800">
            Clear selection
          </button>
        </>
      )}
      <p className="w-full text-[11px] text-slate-400">
        Candidates are notified in-app. Good news is emailed right away; rejections go into one daily summary email.
      </p>
    </div>
  );
};

export default BulkActionBar;
