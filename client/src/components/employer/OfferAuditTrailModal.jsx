import React from "react";

const OfferAuditTrailModal = ({ isOpen, onClose, offer }) => {
  if (!isOpen || !offer) return null;

  const candidateName = offer.candidateId?.fullName || "Candidate";
  const refNo = offer.offerLetterRefNo || "OFF-2026";
  const auditLogs = Array.isArray(offer.auditTrail) ? [...offer.auditTrail].reverse() : [];

  const getActionBadgeColor = (action) => {
    switch (action) {
      case "Created":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Edited":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Submitted for Approval":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Approved":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Sent":
      case "Resent":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "Viewed":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Accepted":
        return "bg-green-100 text-green-800 border-green-300";
      case "Rejected":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "Expired":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "Withdrawn":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center text-lg">
              ⏱️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Offer Audit Trail & History</h3>
              <p className="text-xs text-slate-500">Ref: {refNo} • For {candidateName} ({offer.designation})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {auditLogs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-medium">
              No audit records recorded yet.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {auditLogs.map((log, idx) => (
                <div key={log._id || idx} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs group-hover:scale-125 transition-transform" />

                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2 hover:border-slate-300 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                        {log.previousStatus && log.newStatus && log.previousStatus !== "None" && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {log.previousStatus} → <strong className="text-slate-800">{log.newStatus}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "Just now"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">
                      {log.notes || "Action performed successfully."}
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                      <span className="font-semibold text-slate-700">👤 {log.performerName || "System"}</span>
                      <span>•</span>
                      <span className="text-slate-500">{log.performerRole || "User"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferAuditTrailModal;
