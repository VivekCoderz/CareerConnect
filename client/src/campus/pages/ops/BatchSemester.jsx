import { useEffect, useState } from "react";
import { campusApi, errorMessage } from "../../api";
import { Card, Notice } from "../../components/ui";
import { inputClass } from "../../format";

// Staff set the current semester per batch; every student in the batch sees it on their profile.
const BatchSemester = () => {
  const [batches, setBatches] = useState([]);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    campusApi.get("/ops/batches").then((r) => setBatches(r.data.batches)).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);

  const change = async (batch, value) => {
    setMessage(null);
    try {
      const r = await campusApi.patch(`/ops/batches/${batch.id}`, { semester: value === "" ? null : Number(value) });
      setBatches((list) => list.map((b) => (b.id === batch.id ? r.data.batch : b)));
      setMessage({ tone: "green", text: `${batch.name}: semester ${r.data.batch.semester ?? "cleared"}.` });
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  if (!batches.length && !message) return null;
  return (
    <Card title="Batches and semester" className="mb-6">
      {message && <div className="mb-3"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((b) => (
          <label key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-900">{b.name}</span>
            <select className={`${inputClass} w-36`} value={b.semester ?? ""} onChange={(e) => change(b, e.target.value)} aria-label={`Semester for ${b.name}`}>
              <option value="">No semester</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
            </select>
          </label>
        ))}
      </div>
    </Card>
  );
};

export default BatchSemester;
