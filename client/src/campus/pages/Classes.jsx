import { useCallback, useEffect, useState } from "react";
import { campusApi, errorMessage } from "../api";
import Layout from "../components/Layout";
import SessionCard from "../components/SessionCard";
import { Badge, Card, Notice, Spinner } from "../components/ui";
import { formatDateTime } from "../format";

const Classes = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    campusApi.get("/sessions").then((res) => setData(res.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Training classes</h1>
      {error && <Notice tone="red">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="space-y-6">
          <Card title="Upcoming">
            {data.upcoming.length === 0 && <p className="text-sm text-slate-600">No upcoming classes.</p>}
            <div className="space-y-3">{data.upcoming.map((s) => <SessionCard key={s.id} session={s} onJoined={load} />)}</div>
          </Card>
          <Card title="Past classes">
            {data.past.length === 0 && <p className="text-sm text-slate-600">No past classes yet.</p>}
            <ul className="divide-y divide-slate-100">
              {data.past.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span><b className="text-slate-900">{s.title}</b><span className="block text-slate-500">{formatDateTime(s.startAt)}</span></span>
                  {s.attended ? <Badge tone="green">Attended</Badge> : <Badge>Not joined</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default Classes;
