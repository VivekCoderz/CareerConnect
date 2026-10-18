import SpeakingRecorder from "./SpeakingRecorder";

const words = (text) => (String(text || "").trim() ? String(text).trim().split(/\s+/).length : 0);

// One question: multiple choice, written answer or speaking (PRD R8, R9).
const QuestionPanel = ({ attemptId, question, number, total, answer, onChoose, onWrite, onAudioSaved }) => (
  <div className="space-y-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {number} of {total}</p>
    {question.context && (
      <pre className="overflow-x-auto whitespace-pre rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">{question.context}</pre>
    )}
    <p className="whitespace-pre-line text-base font-semibold leading-relaxed text-slate-900">{question.prompt}</p>

    {question.type === "mcq" && (
      <div className="space-y-2" role="radiogroup">
        {question.options.map((o) => {
          const selected = answer?.optionId === o.id;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${selected ? "border-[var(--campus-brand)] bg-slate-50 ring-1 ring-[var(--campus-brand)]" : "border-slate-200 hover:border-slate-300"}`}
            >
              <input type="radio" name={question.id} className="mt-0.5" checked={selected} onChange={() => onChoose(question.id, o.id)} />
              <span className="text-slate-800">{o.text}</span>
            </label>
          );
        })}
      </div>
    )}

    {question.type === "written" && (
      <div>
        <textarea
          className="h-56 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed outline-none focus:border-[var(--campus-brand)] focus:ring-2 focus:ring-[var(--campus-brand)]/20"
          value={answer?.text || ""}
          onChange={(e) => onWrite(question.id, e.target.value)}
          placeholder="Type your answer here."
          spellCheck
          aria-label="Your answer"
        />
        <p className={`mt-1 text-xs ${words(answer?.text) > (question.maxWords || 1e9) ? "text-rose-600" : "text-slate-500"}`}>
          {words(answer?.text)} words{question.minWords ? ` (aim for ${question.minWords} to ${question.maxWords})` : ""}
        </p>
      </div>
    )}

    {question.type === "speaking" && (
      <SpeakingRecorder attemptId={attemptId} question={question} hasAudio={Boolean(answer?.hasAudio)} onSaved={() => onAudioSaved(question.id)} />
    )}
  </div>
);

export default QuestionPanel;
