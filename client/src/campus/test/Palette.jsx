import { Bookmark, Video } from "lucide-react";
import { ORDER, STATUS } from "./status";

// Right column of the test: a large live camera view, the status legend with counts, and the
// question palette by section.
const Palette = ({ videoRef, cameraOk, sections, questions, statuses, counts, index, onGo, bookmarkedOnly, setBookmarkedOnly }) => (
  <aside className="space-y-4 lg:sticky lg:top-[84px] lg:self-start">
    <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-1 ring-slate-800">
      <div className="relative aspect-[4/3]">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
          <span className={`h-2 w-2 rounded-full ${cameraOk ? "animate-pulse bg-rose-500" : "bg-slate-400"}`} />
          {cameraOk ? "LIVE" : "CAMERA OFF"}
        </span>
        <Video className="absolute right-3 top-3 h-4 w-4 text-white/70" />
      </div>
      <p className="px-3 py-2 text-[11px] text-slate-400">Keep your face in view. Photos are taken during the test.</p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2 text-xs">
        {ORDER.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className={`flex h-6 min-w-6 items-center justify-center rounded-md border px-1 text-[11px] font-bold ${STATUS[k].chip}`}>{counts[k]}</span>
            <span className="text-slate-600">{STATUS[k].label}</span>
          </div>
        ))}
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={bookmarkedOnly} onChange={(e) => setBookmarkedOnly(e.target.checked)} />
        <Bookmark className="h-3.5 w-3.5 text-violet-600" /> Show bookmarked only
      </label>

      <div className="mt-4 max-h-[calc(100vh-560px)] min-h-[160px] space-y-4 overflow-y-auto pr-1">
        {sections.map((s) => {
          const items = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.section === s.key && (!bookmarkedOnly || statuses[q.id].includes("review")));
          if (!items.length) return null;
          return (
            <div key={s.key}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.title}</p>
              <div className="grid grid-cols-6 gap-1.5">
                {items.map(({ q, i }) => (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => onGo(i)}
                    aria-label={`Question ${i + 1}: ${STATUS[statuses[q.id]].label}`}
                    className={`relative h-9 rounded-lg border text-xs font-bold transition hover:scale-105 ${STATUS[statuses[q.id]].chip} ${i === index ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                  >
                    {i + 1}
                    {q.compulsory && <span className="absolute -right-1 -top-1 text-[10px] leading-none text-rose-600" title="Compulsory">*</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </aside>
);

export default Palette;
