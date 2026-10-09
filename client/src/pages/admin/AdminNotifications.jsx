import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminNotifications } from "../../services/adminService";
import NotificationSearch from "../../components/notifications/NotificationSearch";
import { AlertTriangle, Bell, Briefcase, ChevronRight, Inbox, Info } from "lucide-react";

// Admin action alerts: open reports and listings awaiting approval. Each row opens the page
// where it is handled.
const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadNotifications = useCallback(
    () =>
      getAdminNotifications()
        .then((res) => {
          if (res?.success) setNotifications(res.notifications || []);
        })
        .catch((err) => console.error("Failed to fetch admin notifications:", err))
        .finally(() => setLoading(false)),
    []
  );

  const refresh = () => {
    setLoading(true);
    loadNotifications();
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const query = search.trim().toLowerCase();
  const filteredList = query
    ? notifications.filter((n) => [n.title, n.message].some((field) => field?.toLowerCase().includes(query)))
    : notifications;

  return (
    <AdminLayout onRefresh={refresh} isRefreshing={loading}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
              {notifications.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  {notifications.length} pending
                </span>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mt-4">
              <span className="inline-flex items-center gap-2 pb-3 -mb-px border-b-2 border-indigo-600 text-sm font-medium text-indigo-600">
                <Bell className="w-4 h-4" />
                All
              </span>
              <NotificationSearch value={search} onChange={setSearch} />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredList.length > 0 ? (
              filteredList.map((item) => {
                const isReport = item.type === "warning";
                const Icon = isReport ? AlertTriangle : Briefcase;
                return (
                  <Link
                    key={item.id}
                    to={item.link || "/admin/dashboard"}
                    className="px-5 sm:px-6 py-4 hover:bg-slate-50 transition flex items-start gap-4 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isReport ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">{item.title}</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                            : "Recent"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 self-center shrink-0" />
                  </Link>
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
                  {query ? "Try a different search term." : "Open reports and pending approvals will appear here."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-500">Select an alert to review it.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
