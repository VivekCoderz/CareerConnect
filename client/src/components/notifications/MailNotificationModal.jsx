import { Link } from "react-router-dom";

const MailNotificationModal = ({
  notification,
  isOpen,
  onClose,
  onDelete,
}) => {
  if (!isOpen || !notification) return null;

  const categoryBadgeMap = {
    job: { label: "💼 Job Opportunity", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    internship: { label: "🎓 Internship Opening", color: "bg-blue-50 text-blue-700 border-blue-200" },
    course: { label: "📚 Certified Course", color: "bg-purple-50 text-purple-700 border-purple-200" },
    ai_recommendation: { label: "🤖 AI Recommendation", color: "bg-amber-50 text-amber-800 border-amber-200" },
    system: { label: "⚙️ Platform Notice", color: "bg-slate-100 text-slate-700 border-slate-200" },
  };

  const badge = categoryBadgeMap[notification.category] || categoryBadgeMap.ai_recommendation;

  const formattedDate = notification.createdAt
    ? new Date(notification.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Email Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {notification.senderAvatar ? (
              <img
                src={notification.senderAvatar}
                alt={notification.sender}
                className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                {(notification.sender || "C")[0]}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {formattedDate}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {notification.title}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                From: <span className="text-slate-800">{notification.sender}</span> &lt;notifications@careerconnect.edu&gt;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onDelete && (
              <button
                onClick={() => onDelete(notification._id || notification.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Delete message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Close mail"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-6 text-slate-800 text-sm leading-relaxed">
          {/* Metadata Highlights Card if available */}
          {notification.metadata && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-wrap gap-4 text-xs font-semibold">
              {notification.metadata.salary && (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600">💵 CTC:</span>
                  <span className="text-slate-900 font-bold">{notification.metadata.salary}</span>
                </div>
              )}
              {notification.metadata.stipend && (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600">💵 Stipend:</span>
                  <span className="text-slate-900 font-bold">{notification.metadata.stipend}</span>
                </div>
              )}
              {notification.metadata.location && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">📍 Location:</span>
                  <span className="text-slate-900">{notification.metadata.location}</span>
                </div>
              )}
              {notification.metadata.workMode && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">🏠 Mode:</span>
                  <span className="text-slate-900">{notification.metadata.workMode}</span>
                </div>
              )}
            </div>
          )}

          {/* Formatted Mail Message */}
          <div className="whitespace-pre-line font-sans text-slate-700 leading-relaxed text-sm">
            {notification.content}
          </div>

          {/* Required Skills Chips */}
          {notification.metadata?.skills && notification.metadata.skills.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Relevant Skills Tagged
              </span>
              <div className="flex flex-wrap gap-1.5">
                {notification.metadata.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Footer Bar with Action CTA */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
          >
            ← Back to Inbox
          </button>

          {notification.actionUrl && (
            notification.actionUrl.startsWith("http") ? (
              <a
                href={notification.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{notification.actionText || "Open Link"}</span>
                <span>↗</span>
              </a>
            ) : (
              <Link
                to={notification.actionUrl}
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{notification.actionText || "View Opportunity"}</span>
                <span>→</span>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MailNotificationModal;
