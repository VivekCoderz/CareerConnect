import { ORDER, STATUS } from "./status";
import { Button } from "../components/ui";

// Submit confirmation with a count per question state, and the compulsory questions still open.
const SubmitDialog = ({ counts, total, missingCompulsory, onGo, onCancel, onSubmit, submitting, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <p className="text-xl font-extrabold text-slate-900">Submit your test?</p>
      <p className="mt-1 text-sm text-slate-600">You cannot change your answers after submitting.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ORDER.map((k) => (
          <div key={k} className="rounded-xl border border-slate-200 p-3">
            <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-bold ${STATUS[k].chip}`}>{counts[k]}</span>
            <p className="mt-1.5 text-xs font-medium text-slate-600">{STATUS[k].label}</p>
          </div>
        ))}
        <div className="rounded-xl bg-slate-900 p-3 text-white">
          <span className="text-lg font-extrabold">{total}</span>
          <p className="mt-0.5 text-xs text-white/70">Total questions</p>
        </div>
      </div>
      {missingCompulsory.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-bold">Answer the compulsory questions first:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingCompulsory.map(({ i }) => (
              <button key={i} type="button" onClick={() => onGo(i)} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">
                Q {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Back to test</Button>
        <Button onClick={onSubmit} disabled={submitting || missingCompulsory.length > 0}>Submit test</Button>
      </div>
    </div>
  </div>
);

export default SubmitDialog;
