import { useState } from "react";
import { CheckCircle2, Clock, Info, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { submitTicketFeedback } from "../../services/supportTicketService";
import { VERDICT_STATUSES, MAX_NOT_SOLVED } from "../../utils/supportTickets";

const inputClass =
  "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition";

// Bottom of a ticket on the user's side: asks for feedback on the admin's verdict, or says
// where the ticket stands.
const TicketFeedback = ({ ticket, onUpdated, onRaiseNew }) => {
  const [answeringNo, setAnsweringNo] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const notSolvedLeft = MAX_NOT_SOLVED - (ticket.notSolvedCount || 0);
  const lastChance = notSolvedLeft <= 1;

  const send = async (solved) => {
    setError("");
    if (!solved && !lastChance && !message.trim()) {
      setError("Please tell us what is still not working.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitTicketFeedback(ticket._id, { solved, ...(message.trim() ? { message: message.trim() } : {}) });
      onUpdated(res.ticket);
      setAnsweringNo(false);
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticket.status === "Closed") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Ticket closed successfully</p>
          <p className="text-sm text-emerald-700 mt-0.5">You confirmed your problem is solved. Thanks for your feedback!</p>
        </div>
      </div>
    );
  }

  if (ticket.status === "Expired") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <Clock className="w-5 h-5 text-slate-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">This ticket has expired</p>
          <p className="text-sm text-slate-600 mt-0.5">
            It was marked not solved {MAX_NOT_SOLVED} times. If you still need help, please raise a new ticket.
          </p>
        </div>
        <button
          type="button"
          onClick={onRaiseNew}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition self-start sm:self-auto"
        >
          Raise a new ticket
        </button>
      </div>
    );
  }

  if (!VERDICT_STATUSES.includes(ticket.status)) {
    return (
      <p className="text-sm text-slate-500 flex items-center gap-2">
        {ticket.status === "Reopened" ? <RotateCcw className="w-4 h-4 text-slate-400" /> : <Info className="w-4 h-4 text-slate-400" />}
        {ticket.status === "Reopened"
          ? "You reopened this ticket. Our support team will get back to you."
          : "Our support team is looking into this. You'll get a notification when they reply."}
      </p>
    );
  }

  // Waiting for the user's feedback on the admin's verdict.
  return (
    <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
      <div>
        <p className="text-base font-semibold text-slate-900">Is your problem solved?</p>
        <p className="text-sm text-slate-600 mt-0.5">
          Support marked this ticket as <span className="font-medium">{ticket.status}</span>. Let us know if your problem is resolved.
        </p>
      </div>

      {!answeringNo ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => send(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            <ThumbsUp className="w-4 h-4" />
            Yes, it's solved
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setAnsweringNo(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition"
          >
            <ThumbsDown className="w-4 h-4" />
            No, it's not solved
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lastChance ? (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              This is your last "not solved" response for this ticket. It will expire, and you'll need to raise a new ticket for further help.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Tell us what is still not working and the ticket will be reopened. You have {notSolvedLeft} "not solved"
              responses left; the last one expires the ticket.
            </p>
          )}
          <textarea
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={lastChance ? "Anything else you'd like to add (optional)" : "What is still not working?"}
            aria-label="Your message"
            className={`${inputClass} resize-y`}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => send(false)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {submitting ? "Sending..." : lastChance ? "Submit and expire ticket" : "Reopen ticket"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAnsweringNo(false);
                setError("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
};

export default TicketFeedback;
