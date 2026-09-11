import { useState, useMemo } from "react";
import MailNotificationModal from "./MailNotificationModal";
import { triggerAiRecommendationMail } from "../../services/aiAssistantService";

const NotificationInboxDrawer = ({
  notifications = [],
  unreadCount = 0,
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  onDeleteNotification,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeMail, setActiveMail] = useState(null);
  const [sendingAiPick, setSendingAiPick] = useState(false);

  const filteredList = useMemo(() => {
    if (selectedCategory === "all") return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const handleOpenMail = (notification) => {
    setActiveMail(notification);
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleRequestAiRecommendation = async () => {
    setSendingAiPick(true);
    try {
      await triggerAiRecommendationMail();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.warn("AI recommendation trigger failed:", e);
    } finally {
      setSendingAiPick(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200 p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
        {/* Inbox Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">
                Notification Inbox
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestAiRecommendation}
                disabled={sendingAiPick}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                title="Ask AI to match an opportunity and send to inbox"
              >
                <span>🤖</span>
                <span>{sendingAiPick ? "Matching..." : "Get AI Pick"}</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Mail Category Filter Pills */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory("job")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === "job"
                  ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              💼 Jobs
            </button>
            <button
              onClick={() => setSelectedCategory("internship")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === "internship"
                  ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🎓 Internships
            </button>
            <button
              onClick={() => setSelectedCategory("course")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === "course"
                  ? "bg-white text-purple-700 shadow-xs border border-purple-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📚 Courses
            </button>
            <button
              onClick={() => setSelectedCategory("ai_recommendation")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === "ai_recommendation"
                  ? "bg-white text-amber-800 shadow-xs border border-amber-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🤖 AI Picks
            </button>
          </div>
        </div>

        {/* Email Rows List */}
        <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
          {filteredList.length > 0 ? (
            filteredList.map((item) => {
              const isUnread = !item.isRead;
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Recent";

              return (
                <div
                  key={item._id || item.id}
                  onClick={() => handleOpenMail(item)}
                  className={`p-3.5 sm:p-4 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 relative group ${
                    isUnread ? "bg-blue-50/25" : "bg-white"
                  }`}
                >
                  {/* Unread Blue Indicator Dot */}
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse" />
                  )}

                  {/* Sender Avatar */}
                  {item.senderAvatar ? (
                    <img
                      src={item.senderAvatar}
                      alt={item.sender}
                      className="w-9 h-9 rounded-xl object-contain p-0.5 border border-slate-200 bg-white shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {(item.sender || "C")[0]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs truncate ${isUnread ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>
                        {item.sender}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {dateStr}
                      </span>
                    </div>

                    <h4 className={`text-xs leading-snug line-clamp-1 ${isUnread ? "font-extrabold text-slate-900" : "font-medium text-slate-800"}`}>
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-normal">
                      {item.preview || item.content}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="text-xs font-semibold text-slate-500">Your notification inbox is clean!</p>
              <p className="text-[11px] text-slate-400">
                New job and internship alerts will appear here in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            💡 Click on any message to open full details and apply directly.
          </p>
        </div>
      </div>

      {/* Full Mail Reader Modal */}
      <MailNotificationModal
        notification={activeMail}
        isOpen={!!activeMail}
        onClose={() => setActiveMail(null)}
        onDelete={(id) => {
          if (onDeleteNotification) onDeleteNotification(id);
          setActiveMail(null);
        }}
      />
    </>
  );
};

export default NotificationInboxDrawer;
