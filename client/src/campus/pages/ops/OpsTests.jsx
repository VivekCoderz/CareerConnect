import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { campusApi, downloadFile, errorMessage } from "../../api";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Notice } from "../../components/ui";
import { formatDateTime, inputClass } from "../../format";
import NewTest from "./tests/NewTest";
import SheetPreview from "./tests/SheetPreview";

// Staff ops: tests and their questions. Questions come from an Excel sheet in the sample format;
// a test's questions and negative marking can change only until a student starts it.

const started = (a) => Object.values(a.attempts || {}).reduce((s, n) => s + n, 0);

const TestRow = ({ test, onChanged, setMessage }) => {
  const [replacing, setReplacing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [marking, setMarking] = useState({ enabled: test.negativeMarking.enabled, defaultMarks: String(test.negativeMarking.defaultMarks || 0.25) });
  const locked = started(test) > 0;

  const pick = async (file) => {
    setReplacing(file);
    setPreview(null);
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try { setPreview((await campusApi.post("/ops/questions/preview", data)).data); } catch (e) { setMessage({ tone: "red", text: errorMessage(e) }); }
  };
  const replace = async () => {
    const data = new FormData();
    data.append("file", replacing);
    try {
      const r = await campusApi.put(`/ops/assessments/${test.id}/questions`, data);
      setMessage({ tone: "green", text: `${test.title}: questions replaced (${r.data.questionCount}).` });
      setReplacing(null);
      setPreview(null);
      onChanged();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };
  const saveMarking = async () => {
    try {
      await campusApi.patch(`/ops/assessments/${test.id}/marking`, { negativeEnabled: marking.enabled, negativeDefault: Number(marking.defaultMarks) });
      setMessage({ tone: "green", text: `${test.title}: negative marking ${marking.enabled ? `on (${marking.defaultMarks} by default)` : "off"}.` });
      onChanged();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{test.title}</p>
          <p className="text-xs text-slate-500">{formatDateTime(test.opensAt)} to {formatDateTime(test.closesAt)} · {test.timeLimitMinutes} min</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{test.questionCount} questions</Badge>
            <Badge>{test.totalMarks} marks</Badge>
            {test.compulsoryCount > 0 && <Badge tone="amber">{test.compulsoryCount} compulsory</Badge>}
            <Badge tone={test.negativeMarking.enabled ? "red" : "slate"}>{test.negativeMarking.enabled ? `Negative marking ${test.negativeMarking.defaultMarks}` : "No negative marking"}</Badge>
            <Badge tone={locked ? "blue" : "green"}>{locked ? `${started(test)} started: locked` : "Not started: editable"}</Badge>
          </div>
        </div>
        <Button variant="secondary" onClick={() => downloadFile(`/ops/assessments/${test.id}/questions.xlsx`, `${test.title}-questions.xlsx`)}>
          <Download className="h-4 w-4" /> Questions (Excel)
        </Button>
      </div>
      {!locked && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Replace questions</p>
            <input type="file" accept=".xlsx" className="block text-sm" onChange={(e) => pick(e.target.files?.[0] || null)} />
            <SheetPreview preview={preview} />
            {preview?.valid && <Button className="mt-3" onClick={replace}><Upload className="h-4 w-4" /> Replace with these {preview.rows.length} questions</Button>}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Negative marking (MCQ only)</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={marking.enabled} onChange={(e) => setMarking({ ...marking, enabled: e.target.checked })} /> On</label>
            {marking.enabled && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">Default minus per wrong answer
                <input className={`${inputClass} w-24`} inputMode="decimal" value={marking.defaultMarks} onChange={(e) => setMarking({ ...marking, defaultMarks: e.target.value })} />
              </label>
            )}
            <Button variant="secondary" className="mt-3" onClick={saveMarking}>Save marking</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const OpsTests = () => {
  const [tests, setTests] = useState([]);
  const [message, setMessage] = useState(null);
  const load = useCallback(() => {
    campusApi.get("/ops/assessments").then((r) => setTests(r.data.assessments)).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout wide>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tests</h1>
          <p className="text-sm text-slate-600">Upload questions from Excel. Set compulsory questions and negative marks in the sheet.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadFile("/ops/questions/template.xlsx", "questions-sample-format.xlsx")}>
          <FileSpreadsheet className="h-4 w-4" /> Download sample format
        </Button>
      </div>
      {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <div className="space-y-6">
        <NewTest onCreated={load} />
        <Card title={`Tests (${tests.length})`}>
          <div className="space-y-3">
            {tests.map((t) => <TestRow key={t.id} test={t} onChanged={load} setMessage={setMessage} />)}
            {!tests.length && <p className="text-sm text-slate-500">No tests yet.</p>}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default OpsTests;
