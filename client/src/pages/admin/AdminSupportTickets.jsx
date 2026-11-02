import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Hourglass, LifeBuoy, Search, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import TicketStatusBadge from "../../components/support/TicketStatusBadge";
import TicketThread from "../../components/support/TicketThread";
import { getAdminSupportTickets, updateAdminSupportTicket } from "../../services/supportTicketService";
import {
  TICKET_STATUSES,
  ADMIN_STATUSES,
  VERDICT_STATUSES,
  MAX_NOT_SOLVED,
  formatTicketDate,
} from "../../utils/supportTickets";

const USER_TYPE_LABELS = { student: "Student", fresher: "Fresher", professional: "Professional", employer: "Employer" };
const inputClass =
  "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";

// Every support ticket raised on the platform. The admin sets its status and replies; the
// person who raised it is notified and sees the result on their dashboard.
const AdminSupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const loadTickets = useCallback(
    () =>
      getAdminSupportTickets()
        .then((res) => {
          if (!res?.success) return;
          setTickets(res.tickets || []);
          setStatusCounts(res.statusCounts || {});
        })
        .catch((err) => console.error("Failed to fetch support tickets:", err))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const refresh = () => {
    setLoading(true);
    loadTickets();
  };

  const query = search.trim().toLowerCase();
  const filtered = tickets.filter(
    (t) =>
      (statusFilter === "all" || t.status === statusFilter) &&
      (!query ||
        [t.ticketNumber, t.subject, t.raisedByName, t.raisedByEmail].some((f) => f?.toLowerCase().includes(query)))
  );
  const openTicket = tickets.find((t) => t._id === openId);

  const open = (ticket) => {
    setOpenId(ticket._id);
    setDraftStatus(ticket.status);
    setReply("");
    setError("");
    setSavedMsg("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSavedMsg("");
    const statusChanged = draftStatus !== openTicket.status;
    if (!statusChanged && !reply.trim()) {
      setError("Change the status or write a message.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateAdminSupportTicket(openTicket._id, {
        ...(statusChanged ? { status: draftStatus } : {}),
        ...(reply.trim() ? { message: reply.trim() } : {}),
      });
      const updated = res.ticket;
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      if (statusChanged) {
        setStatusCounts((prev) => ({
          ...prev,
          [openTicket.status]: Math.max(0, (prev[openTicket.status] || 0) - 1),
          [updated.status]: (prev[updated.status] || 0) + 1,
        }));
      }
      setReply("");
      setSavedMsg(
        VERDICT_STATUSES.includes(updated.status)
          ? `Marked ${updated.status}. The user has been asked for feedback.`
          : "Ticket updated. The user has been notified."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the ticket.");
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const tabs = [{ value: "all", label: "All", count: total }, ...TICKET_STATUSES.map((s) => ({ value: s, label: s, count: statusCounts[s] || 0 }))];

  return (
    <AdminLayout onRefresh={refresh} isRefreshing={loading}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {openTicket ? (
            <>
              <div className="px-5 sm:px-6 py-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="inline-flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to tickets
                </button>
              </div>

              <div className="px-5 sm:px-6 py-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 wrap-break-word">{openTicket.subject}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {openTicket.ticketNumber}
                      <span className="mx-1.5 text-slate-300">•</span>
                      {openTicket.category}
                      <span className="mx-1.5 text-slate-300">•</span>
                      Raised {formatTicketDate(openTicket.createdAt)}
                    </p>
                  </div>
                  <div className="self-start">
                    <TicketStatusBadge status={openTicket.status} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Raised by</p>
                    <p className="font-medium text-slate-900 truncate">{openTicket.raisedByName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium text-slate-900 truncate">{openTicket.raisedByEmail || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Account type</p>
                    <p className="font-medium text-slate-900">{USER_TYPE_LABELS[openTicket.raisedByType] || openTicket.raisedByType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Marked not solved by user</p>
                    <p className="font-medium text-slate-900">{openTicket.notSolvedCount || 0} / {MAX_NOT_SOLVED}</p>
                  </div>
                </div>

                <TicketThread ticket={openTicket} />

                {savedMsg && <p className="text-sm text-emerald-600">{savedMsg}</p>}

                {openTicket.status === "Closed" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Yes, problem solved</p>
                      <p className="text-sm text-emerald-700 mt-0.5">The user confirmed the problem is solved. This ticket is closed.</p>
                    </div>
                  </div>
                ) : openTicket.status === "Expired" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Ticket expired</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        The user marked it not solved {MAX_NOT_SOLVED} times. They need to raise a new ticket for further help.
                      </p>
                    </div>
                  </div>
                ) : VERDICT_STATUSES.includes(openTicket.status) ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <Hourglass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Waiting for the user's feedback</p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        You marked this ticket {openTicket.status}. You can reply again only if the user says it's not solved.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdate} className="pt-6 border-t border-slate-200 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Update ticket</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Choosing Solved or Not Solved sends your final answer. The ticket is then locked until the user gives feedback.
                      </p>
                    </div>
                    <div className="space-y-1.5 max-w-xs">
                      <label htmlFor="ticket-status" className="text-sm font-medium text-slate-700">Status</label>
                      <select
                        id="ticket-status"
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className={inputClass}
                      >
                        {!ADMIN_STATUSES.includes(openTicket.status) && (
                          <option value={openTicket.status}>{openTicket.status} (current)</option>
                        )}
                        {ADMIN_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="ticket-reply" className="text-sm font-medium text-slate-700">Message to user</label>
                      <textarea
                        id="ticket-reply"
                        rows={4}
                        maxLength={2000}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Explain what was done, or what the user should do next"
                        className={`${inputClass} resize-y`}
                      />
                    </div>
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
                    >
                      {saving ? "Saving..." : "Update & notify user"}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 sm:px-6 pt-5 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Support Tickets</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Tickets raised by students, freshers, professionals and employers.</p>
                </div>

                <div className="flex flex-col-reverse lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-4 mt-4">
                  <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
                    {tabs.map(({ value, label, count }) => {
                      const active = statusFilter === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStatusFilter(value)}
                          className={`inline-flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition ${
                            active ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {label}
                          <span className={`px-1.5 rounded-full text-xs ${active ? "bg-indigo-50" : "bg-slate-100"}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full lg:w-64 lg:mb-2.5">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search tickets"
                      aria-label="Search tickets"
                      className={`${inputClass} pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden`}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {loading && tickets.length === 0 ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => open(t)}
                      className="w-full text-left px-5 sm:px-6 py-4 hover:bg-slate-50 transition flex items-center gap-4 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 truncate">{t.subject}</span>
                          <TicketStatusBadge status={t.status} />
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 truncate">
                          {t.ticketNumber}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {t.raisedByName}
                          {t.raisedByType && ` (${USER_TYPE_LABELS[t.raisedByType] || t.raisedByType})`}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {t.category}
                        </p>
                      </div>
                      <span className="hidden sm:block text-xs text-slate-400 shrink-0">{formatTicketDate(t.updatedAt)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="py-16 px-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <LifeBuoy className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-base font-medium text-slate-800">
                      {query || statusFilter !== "all" ? "No matching tickets" : "No tickets yet"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {query || statusFilter !== "all" ? "Try a different filter or search term." : "Tickets raised by users will appear here."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupportTickets;
