import { Bookmark, BookmarkCheck } from "lucide-react";
import SpeakingRecorder from "./SpeakingRecorder";

const words = (text) => (String(text || "").trim() ? String(text).trim().split(/\s+/).length : 0);
const LETTERS = "ABCDEFGH";

// One question: multiple choice, written answer or speaking (PRD R8, R9).
const QuestionPanel = ({ attemptId, question, number, total, sectionTitle, answer, bookmarked, onBookmark, onChoose, onWrite, onAudioSaved }) => (
  <div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">Q {number}/{total}</span>
        <span className="rounded-lg bg-[color-mix(in_srgb,var(--campus-brand)_10%,white)] px-2.5 py-1 text-xs font-bold text-[var(--campus-brand)]">{sectionTitle}</span>
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">+{question.points} mark{question.points === 1 ? "" : "s"}</span>
        {question.negativeMarks > 0 && <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">-{question.negativeMarks} if wrong</span>}
        {question.compulsory && <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Compulsory</span>}
      </div>
      <button
        type="button"
        onClick={onBookmark}
        aria-pressed={bookmarked}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${bookmarked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-slate-700 hover:border-violet-400 hover:text-violet-700"}`}
      >
        {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
    </div>

    <div className="space-y-5 pt-5">
      {question.context && (
        <pre className="overflow-x-auto whitespace-pre rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">{question.context}</pre>
      )}
      <p className="whitespace-pre-line text-lg font-semibold leading-relaxed text-slate-900">{question.prompt}</p>

      {question.type === "mcq" && (
        <div className="grid gap-3" role="radiogroup">
          {question.options.map((o, i) => {
            const selected = answer?.optionId === o.id;
            return (
              <label
                key={o.id}
                className={`group flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 text-sm transition ${selected ? "border-[var(--campus-brand)] bg-[color-mix(in_srgb,var(--campus-brand)_6%,white)] shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
              >
                <input type="radio" name={question.id} className="sr-only" checked={selected} onChange={() => onChoose(question.id, o.id)} />
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition ${selected ? "bg-[var(--campus-brand)] text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"}`}>
                  {LETTERS[i]}
                </span>
                <span className="text-base text-slate-800">{o.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === "written" && (
        <div>
          <textarea
            className="h-72 w-full rounded-xl border-2 border-slate-200 p-4 text-base leading-relaxed outline-none transition focus:border-[var(--campus-brand)]"
            value={answer?.text || ""}
            onChange={(e) => onWrite(question.id, e.target.value)}
            placeholder="Type your answer here."
            spellCheck
            aria-label="Your answer"
          />
          <p className={`mt-1.5 text-xs ${words(answer?.text) > (question.maxWords || 1e9) ? "text-rose-600" : "text-slate-500"}`}>
            {words(answer?.text)} words{question.minWords ? ` (aim for ${question.minWords} to ${question.maxWords})` : ""}
          </p>
        </div>
      )}

      {question.type === "speaking" && (
        <SpeakingRecorder attemptId={attemptId} question={question} hasAudio={Boolean(answer?.hasAudio)} onSaved={() => onAudioSaved(question.id)} />
      )}
    </div>
  </div>
);

export default QuestionPanel;
