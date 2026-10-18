import { useCallback, useEffect, useState } from "react";
import { campusApi, errorMessage } from "../../api";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Field, Notice } from "../../components/ui";
import { BAND_LABEL, formatDateTime, inputClass } from "../../format";

// E2Job ops: schedule training classes on Google Meet for the batch or one band (PRD R13).
const EMPTY = { title: "", trainerName: "", startAt: "", endAt: "", meetUrl: "", band: "" };

const OpsClasses = () => {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const load = useCallback(() => {
    campusApi.get("/ops/sessions").then((r) => setSessions(r.data.sessions)).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    setMessage(null);
    try {
      await campusApi.post("/ops/sessions", { ...form, startAt: new Date(form.startAt), endAt: new Date(form.endAt), band: form.band || null });
      setForm(EMPTY);
      setMessage({ tone: "green", text: "Class added." });
      load();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  const importSheet = async () => {
    const data = new FormData();
    data.append("file", file);
    try {
      const r = await campusApi.post("/ops/sessions/import", data);
      const bad = r.data.results.filter((x) => x.errors.length);
      setMessage({ tone: bad.length ? "amber" : "green", text: `${r.data.created} classes added.${bad.length ? ` Skipped: ${bad.map((b) => `line ${b.line} (${b.errors.join(", ")})`).join("; ")}` : ""}` });
      setFile(null);
      load();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  const cancel = async (id) => { await campusApi.delete(`/ops/sessions/${id}`).catch(() => null); load(); };

  return (
    <Layout wide>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Training classes</h1>
      {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="Schedule">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Class</th><th>When</th><th>For</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2"><b className="text-slate-900">{s.title}</b><span className="block text-xs text-slate-500">{s.trainerName}</span></td>
                    <td>{formatDateTime(s.startAt)}</td>
                    <td>{s.band ? `Band ${s.band}` : "Whole batch"}</td>
                    <td>{s.attendance}</td>
                    <td className="text-right">{s.status === "cancelled" ? <Badge tone="red">Cancelled</Badge> : <button type="button" className="text-xs font-semibold text-rose-600 underline" onClick={() => cancel(s.id)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!sessions.length && <p className="py-6 text-center text-sm text-slate-500">No classes yet.</p>}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Add a class">
            <form onSubmit={create} className="space-y-3">
              <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Trainer"><input className={inputClass} value={form.trainerName} onChange={(e) => setForm({ ...form, trainerName: e.target.value })} /></Field>
              <Field label="Starts"><input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></Field>
              <Field label="Ends"><input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></Field>
              <Field label="Google Meet link"><input className={inputClass} placeholder="https://meet.google.com/..." value={form.meetUrl} onChange={(e) => setForm({ ...form, meetUrl: e.target.value })} /></Field>
              <Field label="For">
                <select className={inputClass} value={form.band} onChange={(e) => setForm({ ...form, band: e.target.value })}>
                  <option value="">Whole batch</option>
                  {[1, 2, 3].map((b) => <option key={b} value={b}>{BAND_LABEL[b]}</option>)}
                </select>
              </Field>
              <Button type="submit" className="w-full">Add class</Button>
            </form>
          </Card>
          <Card title="Add a schedule from a sheet">
            <p className="mb-3 text-xs text-slate-600">Columns: title, date (YYYY-MM-DD), start (HH:MM), end (HH:MM), meet link, band (1, 2, 3 or empty), trainer. Times are India time.</p>
            <input type="file" accept=".xlsx,.csv" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button variant="secondary" className="mt-3 w-full" onClick={importSheet} disabled={!file}>Import schedule</Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default OpsClasses;
