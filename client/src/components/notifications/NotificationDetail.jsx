import { ArrowLeft, Trash2, Briefcase, GraduationCap, BookOpen, Bell, IndianRupee, MapPin, Laptop } from "lucide-react";

// Older messages were saved with markdown bold; show them as plain text.
const plainText = (text = "") => String(text).replace(/\*\*(.+?)\*\*/g, "$1");

// Shows one notification's full message inside the inbox panel (for notifications that
// have no page of their own to open).
const categoryBadgeMap = {
  job: { label: "Job Opportunity", Icon: Briefcase, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  internship: { label: "Internship", Icon: GraduationCap, color: "bg-blue-50 text-blue-700 border-blue-200" },
  course: { label: "Course", Icon: BookOpen, color: "bg-purple-50 text-purple-700 border-purple-200" },
  system: { label: "Platform Notice", Icon: Bell, color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const NotificationDetail = ({ notification, onBack, onDelete }) => {
  const badge = categoryBadgeMap[notification.category] || categoryBadgeMap.system;
  const BadgeIcon = badge.Icon;
  const metadata = notification.metadata || {};
  const skills = Array.isArray(metadata.skills) ? metadata.skills : [];
  const highlights = [
    metadata.salary && { label: "CTC", value: metadata.salary, Icon: IndianRupee },
    metadata.stipend && { label: "Stipend", value: metadata.stipend, Icon: IndianRupee },
    metadata.location && { label: "Location", value: metadata.location, Icon: MapPin },
    metadata.workMode && { label: "Work mode", value: metadata.workMode, Icon: Laptop },
  ].filter(Boolean);

  const formattedDate = notification.createdAt
    ? new Date(notification.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="px-5 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to notifications
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(notification._id || notification.id)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>

      <div className="px-5 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {notification.senderAvatar ? (
            <img
              src={notification.senderAvatar}
              alt={notification.sender}
              className="w-11 h-11 rounded-full object-contain p-0.5 border border-slate-200 bg-white shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-semibold text-base flex items-center justify-center shrink-0">
              {(notification.sender || "E")[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900 leading-snug">{notification.title}</h3>
              <span
                className={`inline-flex items-center gap-1.5 self-start shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${badge.color}`}
              >
                <BadgeIcon className="w-3.5 h-3.5" />
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {notification.sender && (
                <>
                  <span className="font-medium text-slate-700">{notification.sender}</span>
                  <span className="mx-1.5 text-slate-300">•</span>
                </>
              )}
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Body, aligned with the title */}
        <div className="mt-5 sm:pl-15 space-y-5">
          {highlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {highlights.map(({ label, value, Icon }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500">{label}:</span>
                  <span className="font-medium text-slate-900 truncate">{value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
            {plainText(notification.content || notification.message || notification.preview)}
          </p>

          {skills.length > 0 && (
            <div className="pt-5 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2.5">Relevant skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={`${idx}-${skill}`}
                    className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;
