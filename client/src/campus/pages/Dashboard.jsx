import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { campusApi, errorMessage } from "../api";
import { useCampus } from "../useCampus";
import Layout from "../components/Layout";
import SessionCard from "../components/SessionCard";
import { Badge, Card, Notice, Spinner } from "../components/ui";
import { BAND_LABEL, formatDateTime } from "../format";

const assessmentAction = (a) => {
  if (a.attempt?.status === "in_progress") return { label: "Continue test", to: `/test/${a.id}`, tone: "amber", status: "In progress" };
  if (a.attempt) return { label: a.resultsPublished ? "View result" : "Result coming soon", to: `/result/${a.id}`, tone: "green", status: "Submitted" };
  if (a.state === "open") return { label: "Start test", to: `/test/${a.id}`, tone: "blue", status: "Open now" };
  if (a.state === "upcoming") return { label: null, tone: "slate", status: `Opens ${formatDateTime(a.opensAt)}` };
  return { label: null, tone: "red", status: "Closed" };
};

const Dashboard = () => {
  const { member, profileCompletion } = useCampus();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([campusApi.get("/assessments"), campusApi.get("/sessions")])
      .then(([assessments, sessions]) => setData({ assessments: assessments.data.assessments, sessions: sessions.data }))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Hello, {member?.fullName?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {member?.band ? BAND_LABEL[member.band] : "CGPA band not set"} ·{" "}
          {member?.verification?.status === "verified" ? "Details verified" : <Link to="/profile" className="font-semibold text-[var(--campus-brand)] underline">Details pending verification</Link>}
        </p>
      </div>
      {profileCompletion && !profileCompletion.complete && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-amber-900">Complete your profile to take the test</p>
            <p className="text-sm text-amber-800">Your profile is {profileCompletion.percent}% complete; {profileCompletion.required}% is needed. Still to add: {profileCompletion.missing.map((m) => m.label).join(", ")}.</p>
            <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-amber-200"><div className="h-full rounded-full bg-amber-500" style={{ width: `${profileCompletion.percent}%` }} /></div>
          </div>
          <Link to="/profile" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Complete profile</Link>
        </div>
      )}
      {error && <Notice tone="red">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="space-y-6">
          <Card title="Next class">
            {data.sessions.next ? <SessionCard session={data.sessions.next} onJoined={load} /> : <p className="text-sm text-slate-600">No upcoming class yet. Your schedule will appear here.</p>}
            {data.sessions.upcoming.length > 1 && (
              <Link to="/classes" className="mt-3 inline-block text-sm font-semibold text-[var(--campus-brand)]">See all {data.sessions.upcoming.length} upcoming classes</Link>
            )}
          </Card>

          <Card title="Assessments">
            {data.assessments.length === 0 && <p className="text-sm text-slate-600">No assessment is scheduled for your batch yet.</p>}
            <div className="space-y-3">
              {data.assessments.map((a) => {
                const action = assessmentAction(a);
                return (
                  <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <ClipboardCheck className="mt-0.5 h-5 w-5 text-[var(--campus-brand)]" />
                      <div>
                        <p className="font-bold text-slate-900">{a.title}</p>
                        <p className="text-sm text-slate-600">{a.questionCount} questions · {a.timeLimitMinutes} minutes · open until {formatDateTime(a.closesAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={action.tone}>{action.status}</Badge>
                      {action.label && (
                        <Link to={action.to} className="rounded-lg bg-[var(--campus-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{action.label}</Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
