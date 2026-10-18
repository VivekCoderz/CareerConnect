import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { campusApi, errorMessage } from "../api";
import Layout from "../components/Layout";
import { Card, Notice, Spinner } from "../components/ui";

// Simple result for the student (PRD R12): total, section scores, strengths and improvements.
// No answer key.
const Result = () => {
  const { assessmentId } = useParams();
  const [params] = useSearchParams();
  const submitted = params.get("submitted");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    campusApi.get(`/results/${assessmentId}`).then((res) => setData(res.data)).catch((e) => setError(errorMessage(e)));
  }, [assessmentId]);

  const r = data?.result;
  return (
    <Layout>
      {submitted === "tab_switching" && <div className="mb-4"><Notice tone="amber">Your test was submitted automatically after the maximum number of fair-test warnings.</Notice></div>}
      {submitted === "time_up" && <div className="mb-4"><Notice tone="amber">The time was up, so your test was submitted with your saved answers.</Notice></div>}
      {error && <Notice tone="red">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data?.status === "pending" && (
        <Card title="Thank you, your test is submitted">
          <p className="text-sm text-slate-600">Your result is being checked. It will appear here once the E2Job team publishes the results.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-[var(--campus-brand)]">Back to dashboard</Link>
        </Card>
      )}
      {data?.status === "not_attempted" && <Notice>You have not taken this assessment.</Notice>}
      {r && (
        <div className="space-y-6">
          <Card title={r.title}>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Your score</p>
                <p className="text-4xl font-extrabold text-slate-900">{r.total}<span className="text-xl text-slate-400"> / {r.max}</span></p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-2 text-2xl font-extrabold text-[var(--campus-brand)]">{r.percentage}%</div>
            </div>
          </Card>
          <Card title="By section">
            <div className="space-y-3">
              {r.sections.map((s) => {
                const pct = s.max ? Math.round((s.score / s.max) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="flex justify-between text-sm"><span className="font-semibold text-slate-800">{s.title}</span><span className="text-slate-600">{s.score} / {s.max}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[var(--campus-brand)]" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card title="Strengths">
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{r.strengths.length ? r.strengths.map((s) => <li key={s}>{s}</li>) : <li>Keep practising every section.</li>}</ul>
            </Card>
            <Card title="Points to improve">
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{r.improvements.length ? r.improvements.map((s) => <li key={s}>{s}</li>) : <li>No weak section: well done.</li>}</ul>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Result;
