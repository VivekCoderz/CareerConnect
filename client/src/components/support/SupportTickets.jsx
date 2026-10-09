import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronRight, LifeBuoy, Plus } from "lucide-react";
import TicketStatusBadge from "./TicketStatusBadge";
import TicketThread from "./TicketThread";
import TicketFeedback from "./TicketFeedback";
import { createSupportTicket, getMySupportTickets } from "../../services/supportTicketService";
import { TICKET_CATEGORIES, formatTicketDate } from "../../utils/supportTickets";

const EMPTY_FORM = { subject: "", category: TICKET_CATEGORIES[0], description: "" };
const inputClass =
  "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition";

// The "Help & Support" tab on the student, fresher, professional and employer dashboards.
// Users raise tickets here and see their status and support's replies; they see only their own.
const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "new" | ticket id
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(
    () =>
      getMySupportTickets()
        .then((res) => {
          if (res?.success) setTickets(res.tickets || []);
        })
        .catch((err) => console.warn("Could not load support tickets:", err.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = tickets.find((t) => t._id === view);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Please add a subject and describe your issue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSupportTicket(form);
      setTickets((prev) => [res.ticket, ...prev]);
      setForm(EMPTY_FORM);
      setNotice(res.message || "Your ticket has been raised.");
      setView("list");
    } catch (err) {
      setError(err.response?.data?.message || "Could not raise your ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => {
        setView("list");
        setError("");
      }}
      className="inline-flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to tickets
    </button>
  );

  // ---------- New ticket ----------
  if (view === "new") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200">{backButton}</div>
        <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-6 space-y-5 max-w-2xl">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Raise a ticket</h2>
            <p className="text-sm text-slate-500 mt-1">Tell us what's wrong and our support team will get back to you.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-subject" className="text-sm font-medium text-slate-700">Subject</label>
            <input
              id="ticket-subject"
              type="text"
              maxLength={150}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="A short summary of the issue"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-category" className="text-sm font-medium text-slate-700">Category</label>
            <select
              id="ticket-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-description" className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="ticket-description"
              rows={6}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the problem, what you expected, and any steps to reproduce it"
              className={`${inputClass} resize-y`}
            />
            <p className="text-xs text-slate-400 text-right">{form.description.length}/2000</p>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {submitting ? "Submitting..." : "Submit ticket"}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------- Ticket detail ----------
  if (openTicket) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200">{backButton}</div>
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

          <TicketThread ticket={openTicket} />

          <TicketFeedback
            ticket={openTicket}
            onUpdated={(updated) => setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))}
            onRaiseNew={() => setView("new")}
          />
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Help & Support</h2>
          <p className="text-sm text-slate-500 mt-0.5">Raise a ticket for any issue and track its status here.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setView("new");
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Raise a ticket
        </button>
      </div>

      {notice && (
        <div className="px-5 sm:px-6 py-3 bg-emerald-50 border-b border-emerald-100 text-sm text-emerald-700">{notice}</div>
      )}

      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length > 0 ? (
          tickets.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => {
                setNotice("");
                setView(t._id);
              }}
              className="w-full text-left px-5 sm:px-6 py-4 hover:bg-slate-50 transition flex items-center gap-4 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 truncate">{t.subject}</span>
                  <TicketStatusBadge status={t.status} />
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {t.ticketNumber}
                  <span className="mx-1.5 text-slate-300">•</span>
                  {t.category}
                  <span className="mx-1.5 text-slate-300">•</span>
                  Updated {formatTicketDate(t.updatedAt)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
            </button>
          ))
        ) : (
          <div className="py-16 px-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <LifeBuoy className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-800">No tickets yet</p>
            <p className="text-sm text-slate-500 mt-1">Facing a problem? Raise a ticket and our team will help.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
