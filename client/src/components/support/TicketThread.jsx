import { CheckCircle2, Clock, Headset, RotateCcw, User, XCircle } from "lucide-react";
import { formatTicketDate } from "../../utils/supportTickets";

// Status changes recorded on a message, shown above its text.
const EVENTS = {
  solved: { label: "Marked as Solved", Icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  not_solved: { label: "Marked as Not Solved", Icon: XCircle, color: "text-rose-700 bg-rose-50 border-rose-200" },
  confirmed: { label: "Confirmed the problem is solved. Ticket closed", Icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  reopened: { label: "Said the problem is not solved. Ticket reopened", Icon: RotateCcw, color: "text-violet-700 bg-violet-50 border-violet-200" },
  expired: { label: "Said the problem is not solved. Ticket expired", Icon: Clock, color: "text-slate-600 bg-slate-100 border-slate-200" },
};

// A ticket's conversation: the original description, then each reply and status change in order.
const TicketThread = ({ ticket }) => {
  const entries = [
    { key: "description", authorRole: "user", authorName: ticket.raisedByName || "You", text: ticket.description, createdAt: ticket.createdAt },
    ...(ticket.messages || []).map((m, idx) => ({ key: m._id || idx, ...m })),
  ];

  return (
    <ol className="space-y-5">
      {entries.map((entry) => {
        const fromSupport = entry.authorRole === "admin";
        const Icon = fromSupport ? Headset : User;
        const event = entry.event ? EVENTS[entry.event] : null;
        return (
          <li key={entry.key} className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                fromSupport ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium text-slate-900">{fromSupport ? "E2Job Support" : entry.authorName}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="text-slate-500">{formatTicketDate(entry.createdAt)}</span>
              </p>
              {event && (
                <span className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${event.color}`}>
                  <event.Icon className="w-3.5 h-3.5" />
                  {event.label}
                </span>
              )}
              {entry.text && (
                <div
                  className={`mt-1.5 px-4 py-3 rounded-xl border text-[15px] leading-relaxed whitespace-pre-line wrap-break-word ${
                    fromSupport ? "bg-blue-50/60 border-blue-100 text-slate-800" : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  {entry.text}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default TicketThread;
