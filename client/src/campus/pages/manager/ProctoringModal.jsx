import { useEffect, useState } from "react";
import { campusApi, errorMessage } from "../../api";
import { Button, Notice, Spinner } from "../../components/ui";
import { formatDateTime } from "../../format";

const EVENT = {
  fullscreen_exit: "Left full screen",
  tab_hidden: "Switched tab or app",
  window_blur: "Switched window",
  camera_lost: "Camera stopped",
  paste_blocked: "Tried to paste",
  camera_ready: "Camera started",
};

// Fair-test events and camera photos of one student's test (PRD R10). No answers are shown.
const ProctoringModal = ({ student, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    campusApi.get(`/manager/attempts/${student.memberId}/proctoring`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [student.memberId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">{student.fullName}</p>
            <p className="text-sm text-slate-500">{student.rollNo} · fair-test review</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
        {error && <Notice tone="red">{error}</Notice>}
        {!data && !error && <Spinner />}
        {data && (
          <div className="space-y-5">
            {data.flags.some((f) => f.startsWith("possible_copy")) && <Notice tone="amber">A written answer is very similar to another student's answer.</Notice>}
            <div>
              <p className="mb-2 text-sm font-bold text-slate-900">Events</p>
              {data.events.length ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.events.map((e) => (
                    <li key={`${e.type}-${e.at}`} className="flex justify-between py-1.5">
                      <span>{EVENT[e.type] || e.type}{e.counted ? " (warning)" : ""}</span>
                      <span className="text-slate-500">{formatDateTime(e.at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">No events recorded.</p>}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-900">Camera photos ({data.snapshots.length})</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.snapshots.map((s) => (
                  <figure key={s.at} className="overflow-hidden rounded-lg border border-slate-200">
                    {s.url ? <img src={s.url} alt={`Photo at ${formatDateTime(s.at)}`} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-slate-100" />}
                    <figcaption className="px-2 py-1 text-xs text-slate-500">{formatDateTime(s.at)}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProctoringModal;
