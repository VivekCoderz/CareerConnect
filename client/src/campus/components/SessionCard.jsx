import { useState } from "react";
import { Video } from "lucide-react";
import { campusApi, errorMessage } from "../api";
import { Badge, Button } from "./ui";
import { formatDateTime } from "../format";

// One training class with its Join button (PRD R13). The Meet link comes from the server only
// when joining is allowed, and joining records attendance.
const SessionCard = ({ session, onJoined }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await campusApi.post(`/sessions/${session.id}/join`);
      window.open(res.data.meetUrl, "_blank", "noopener,noreferrer");
      onJoined?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Video className="h-4 w-4 text-[var(--campus-brand)]" />
        </span>
        <div>
          <p className="font-bold text-slate-900">{session.title}</p>
          <p className="text-sm text-slate-600">
            {formatDateTime(session.startAt)} to {new Date(session.endAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}
            {session.trainerName ? ` · ${session.trainerName}` : ""}
          </p>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {session.attended && <Badge tone="green">Joined</Badge>}
        {session.canJoin ? (
          <Button onClick={join} disabled={busy}>Join on Google Meet</Button>
        ) : (
          <span className="text-xs text-slate-500">Join opens {formatDateTime(session.joinOpensAt)}</span>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
