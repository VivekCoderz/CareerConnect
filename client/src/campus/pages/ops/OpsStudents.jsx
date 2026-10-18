import { useCallback, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Field, Notice } from "../../components/ui";
import { inputClass } from "../../format";

// E2Job ops: import the university's sheet (preview first, PRD R3) and verify students (R6).
const ACTION = { create: ["New", "green"], update: ["Update", "blue"], skip: ["Will be skipped", "red"] };

const OpsStudents = () => {
  const [file, setFile] = useState(null);
  const [batchName, setBatchName] = useState("MBA 2025-27");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState({ verification: "", search: "" });

  const loadMembers = useCallback(() => {
    const params = { role: "student", ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) };
    campusApi.get("/ops/members", { params }).then((r) => setMembers(r.data.members)).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, [filter]);
  useEffect(() => { const t = setTimeout(loadMembers, 250); return () => clearTimeout(t); }, [loadMembers]);

  const upload = async (path) => {
    const form = new FormData();
    form.append("file", file);
    form.append("batchName", batchName);
    return campusApi.post(path, form);
  };

  const runPreview = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await upload("/ops/import/preview");
      setPreview(res.data);
      if (res.data.missingColumns.length) setMessage({ tone: "red", text: `Missing columns: ${res.data.missingColumns.join(", ")}` });
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const res = await upload("/ops/import/commit");
      setMessage({ tone: "green", text: `Imported: ${res.data.created} new, ${res.data.updated} updated, ${res.data.skipped} skipped.` });
      setPreview(null);
      setFile(null);
      loadMembers();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (member, verified) => {
    await campusApi.post(`/ops/members/${member.id}/verify`, { verified }).catch(() => null);
    loadMembers();
  };

  return (
    <Layout wide>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Students</h1>
      <div className="space-y-6">
        <Card title="Import from the university's sheet">
          <p className="mb-4 text-sm text-slate-600">Columns: name, email, roll no, cgpa, phone (.xlsx or .csv). Nothing is saved until you click Import.</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
            <Field label="File">
              <input type="file" accept=".xlsx,.csv" className={inputClass} onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }} />
            </Field>
            <Field label="Batch"><input className={inputClass} value={batchName} onChange={(e) => setBatchName(e.target.value)} /></Field>
            <Button onClick={runPreview} disabled={!file || busy}><Upload className="h-4 w-4" /> Check file</Button>
          </div>
          {message && <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
          {preview && preview.rows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-700"><b>{preview.summary.valid}</b> valid rows, <b>{preview.summary.invalid}</b> with problems.</p>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">Line</th><th>Name</th><th>Email</th><th>Roll no.</th><th>CGPA</th><th>Result</th></tr></thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 text-slate-500">{r.line}</td><td>{r.data.fullName}</td><td>{r.data.email}</td><td>{r.data.rollNo}</td><td>{r.data.cgpa ?? ""}</td>
                        <td className="py-2"><Badge tone={ACTION[r.action][1]}>{ACTION[r.action][0]}</Badge>{r.errors.length > 0 && <span className="mt-1 block text-xs text-rose-600">{r.errors.join("; ")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-4" onClick={commit} disabled={busy || !preview.summary.valid}>Import {preview.summary.valid} students</Button>
            </div>
          )}
        </Card>

        <Card title={`Students (${members.length})`}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="Search name, email or roll number" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
            <select className={inputClass} value={filter.verification} onChange={(e) => setFilter({ ...filter, verification: e.target.value })} aria-label="Verification">
              <option value="">All</option><option value="pending">Verification pending</option><option value="verified">Verified</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Student</th><th>Roll no.</th><th>CGPA</th><th>Band</th><th>Phone</th><th>Details</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-2"><b className="text-slate-900">{m.fullName}</b><span className="block text-xs text-slate-500">{m.email}</span></td>
                    <td>{m.rollNo}</td><td>{m.cgpa ?? "-"}</td><td>{m.band ? `Band ${m.band}` : "-"}</td><td>{m.phone || "-"}</td>
                    <td>
                      {m.verification?.status === "verified"
                        ? <button type="button" className="text-xs font-semibold text-slate-500 underline" onClick={() => verify(m, false)}>Verified (undo)</button>
                        : <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => verify(m, true)}>Mark verified</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default OpsStudents;
