import { useState, useMemo } from "react";
import { Bell, Briefcase, GraduationCap, CheckCheck, Inbox, Info } from "lucide-react";
import NotificationSearch from "./NotificationSearch";
import NotificationDetail from "./NotificationDetail";
import { notificationKey } from "../../utils/notificationLink";

const CATEGORY_TABS = [
  { value: "all", label: "All", Icon: Bell },
  { value: "job", label: "Jobs", Icon: Briefcase },
  { value: "internship", label: "Internships", Icon: GraduationCap },
];

const matchesSearch = (n, query) =>
  [n.sender, n.title, n.preview, n.content].some((field) => field?.toLowerCase().includes(query));

// The dashboard's Notifications tab. Clicking a message opens its page; one with no page of
// its own is read right here. Mounted only while the tab is shown, so an opened message
// never lingers.
const NotificationInbox = ({
  notifications = [],
  unreadCount = 0,
  onNotificationClick,
  onMarkAllRead,
  onDeleteNotification,
  // false shows only the "All" tab, for dashboards whose alerts aren't job/internship ones.
  showCategories = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState(null);

  // Looked up from the live list, so it always shows the clicked row's current data.
  const openMail = openKey ? notifications.find((n) => notificationKey(n) === openKey) || null : null;

  const tabs = showCategories ? CATEGORY_TABS : CATEGORY_TABS.slice(0, 1);
  const query = search.trim().toLowerCase();

  const filteredList = useMemo(() => {
    let list = notifications;
    if (selectedCategory !== "all") list = list.filter((n) => n.category === selectedCategory);
    if (query) list = list.filter((n) => matchesSearch(n, query));
    return list;
  }, [notifications, selectedCategory, query]);

  // onNotificationClick marks it read and returns true when it took the user to a page;
  // otherwise the message is shown here.
  const handleOpenMail = (notification) => {
    const navigated = onNotificationClick ? onNotificationClick(notification) : false;
    if (!navigated) setOpenKey(notificationKey(notification));
  };

  if (openMail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <NotificationDetail
          notification={openMail}
          onBack={() => setOpenKey(null)}
          onDelete={(id) => {
            if (onDeleteNotification) onDeleteNotification(id);
            setOpenKey(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {unreadCount} unread
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mt-4">
        {/* Category tabs */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
          {tabs.map(({ value, label, Icon }) => {
            const active = selectedCategory === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedCategory(value)}
                className={`inline-flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        <NotificationSearch value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
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
              <button
                type="button"
                key={notificationKey(item)}
                onClick={() => handleOpenMail(item)}
                className={`w-full text-left px-5 sm:px-6 py-4 hover:bg-slate-50 transition cursor-pointer flex items-start gap-4 relative ${
                  isUnread ? "bg-blue-50/40" : "bg-white"
                }`}
              >
                {isUnread && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600" />
                )}

                {item.senderAvatar ? (
                  <img
                    src={item.senderAvatar}
                    alt={item.sender}
                    className="w-10 h-10 rounded-lg object-contain p-0.5 border border-slate-200 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center shrink-0">
                    {(item.sender || "C")[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                      {item.sender}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{dateStr}</span>
                  </div>

                  <h4 className={`text-sm mt-0.5 line-clamp-1 ${isUnread ? "font-semibold text-slate-900" : "font-normal text-slate-800"}`}>
                    {item.title}
                  </h4>

                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                    {item.preview || item.content}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-16 px-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-800">
              {query ? "No matching notifications" : "You're all caught up"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {query ? "Try a different search term." : "New alerts will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2">
        <Info className="w-4 h-4 text-slate-400" />
        <p className="text-sm text-slate-500">Select a notification to open its page or view details.</p>
      </div>
    </div>
  );
};

export default NotificationInbox;
