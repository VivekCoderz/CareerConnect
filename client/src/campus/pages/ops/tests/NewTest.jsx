import { useEffect, useState } from "react";
import { campusApi, errorMessage } from "../../../api";
import { Button, Card, Field, Notice } from "../../../components/ui";
import { inputClass } from "../../../format";
import SheetPreview from "./SheetPreview";

// Create a test from an Excel sheet: details, negative marking, then the sheet (checked first).
const inDays = (d) => { const t = new Date(Date.now() + d * 864e5); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16); };
const EMPTY = { title: "", batchId: "", timeLimitMinutes: "60", opensAt: inDays(0), closesAt: inDays(7), negativeEnabled: false, negativeDefault: "0.25" };

const NewTest = ({ onCreated }) => {
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    campusApi.get("/ops/batches").then((r) => {
      setBatches(r.data.batches);
      if (r.data.batches[0]) setForm((f) => ({ ...f, batchId: f.batchId || r.data.batches[0].id }));
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const check = async (chosen) => {
    setFile(chosen);
    setPreview(null);
    setMessage(null);
    if (!chosen) return;
    const data = new FormData();
    data.append("file", chosen);
    try {
      setPreview((await campusApi.post("/ops/questions/preview", data)).data);
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = new FormData();
    Object.entries({ ...form, opensAt: new Date(form.opensAt).toISOString(), closesAt: new Date(form.closesAt).toISOString() }).forEach(([k, v]) => data.append(k, String(v)));
    data.append("file", file);
    try {
      const r = await campusApi.post("/ops/assessments", data);
      setMessage({ tone: "green", text: `"${r.data.assessment.title}" created with ${r.data.assessment.questionCount} questions.` });
      setForm(EMPTY);
      setFile(null);
      setPreview(null);
      onCreated();
    } catch (e) {
      if (e?.response?.data?.rows) setPreview(e.response.data);
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Create a test from Excel">
      <form onSubmit={create} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Test name"><input className={inputClass} value={form.title} onChange={set("title")} required /></Field>
          <Field label="Batch">
            <select className={inputClass} value={form.batchId} onChange={set("batchId")} required>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          </Field>
          <Field label="Duration (minutes)"><input className={inputClass} inputMode="numeric" value={form.timeLimitMinutes} onChange={set("timeLimitMinutes")} /></Field>
          <Field label="Opens"><input type="datetime-local" className={inputClass} value={form.opensAt} onChange={set("opensAt")} /></Field>
          <Field label="Closes"><input type="datetime-local" className={inputClass} value={form.closesAt} onChange={set("closesAt")} /></Field>
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <input type="checkbox" checked={form.negativeEnabled} onChange={set("negativeEnabled")} /> Negative marking (MCQ only)
            </label>
            {form.negativeEnabled && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                Default minus per wrong answer
                <input className={`${inputClass} w-24`} inputMode="decimal" value={form.negativeDefault} onChange={set("negativeDefault")} />
              </label>
            )}
            <p className="mt-1 text-xs text-slate-500">A value in the sheet's "Negative marks" column overrides the default for that question.</p>
          </div>
        </div>
        <Field label="Questions sheet (.xlsx)" hint="Use the sample format. Rows are checked before anything is saved.">
          <input type="file" accept=".xlsx" className="block text-sm" onChange={(e) => check(e.target.files?.[0] || null)} />
        </Field>
        <SheetPreview preview={preview} />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Button type="submit" disabled={busy || !file || !preview?.valid}>{busy ? "Creating..." : "Create test"}</Button>
      </form>
    </Card>
  );
};

export default NewTest;
