import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { campusApi, downloadFile, errorMessage } from "../../api";
import { useCampus } from "../../useCampus";
import Layout from "../../components/Layout";
import { Notice, Spinner } from "../../components/ui";
import ProctoringModal from "./ProctoringModal";
import StudentProfileModal from "./StudentProfileModal";
import TestAnalysis from "./TestAnalysis";
import Overview from "./Overview";

// University dashboard (PRD R14). /manager is the overview; /manager/analysis is the test
// analysis with publishing. Numbers come from the same server data as the downloads.

const REPORTS = [
  ["results.xlsx", "Results", FileSpreadsheet],
  ["summary.pdf", "Batch summary", FileText],
  ["scorecards.pdf", "Scorecards", FileText],
  ["attendance.xlsx", "Attendance", FileSpreadsheet],
];
const TABS = [["/manager", "Overview"], ["/manager/analysis", "Test analysis and publish"]];

const ManagerDashboard = ({ view = "overview" }) => {
  const { institution, member } = useCampus();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [proctoring, setProctoring] = useState(null);
  const [profileOf, setProfileOf] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOverview = useCallback(() => {
    campusApi.get("/manager/overview").then((r) => setSummary(r.data.summary)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const download = async (name) => {
    setDownloading(name);
    try {
      await downloadFile(`/manager/reports/${name}`, `${institution?.slug || "campus"}-${name}`);
    } catch (e) {
      setError(errorMessage(e, "The download failed. Please try again."));
    } finally {
      setDownloading("");
    }
  };

  return (
    <Layout wide>
      <div className="relative mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8" style={{ background: "linear-gradient(120deg, var(--campus-brand) 0%, color-mix(in srgb, var(--campus-brand) 55%, #0f172a) 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{institution?.name}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">University dashboard</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.assessment?.title || "No assessment yet"}
              {member?.fullName ? ` · Signed in as ${member.fullName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REPORTS.map(([name, label, Icon]) => (
              <button key={name} type="button" onClick={() => download(name)} disabled={downloading === name}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 disabled:opacity-60">
                {downloading === name ? <Download className="h-4 w-4 animate-bounce" /> : <Icon className="h-4 w-4" />}
                {downloading === name ? "Preparing..." : label}
              </button>
            ))}
          </div>
        </div>
        <nav className="relative mt-6 inline-flex rounded-xl bg-black/20 p-1 ring-1 ring-white/15">
          {TABS.map(([to, label]) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}
      {view === "analysis" && <TestAnalysis onPublished={() => { loadOverview(); setRefreshKey((k) => k + 1); }} />}
      {view === "overview" && !summary && !error && <Spinner />}
      {view === "overview" && summary && <Overview summary={summary} onProfile={setProfileOf} onProctoring={setProctoring} refreshKey={refreshKey} />}
      {proctoring && <ProctoringModal student={proctoring} onClose={() => setProctoring(null)} />}
      {profileOf && <StudentProfileModal memberId={profileOf} onClose={() => setProfileOf(null)} />}
    </Layout>
  );
};

export default ManagerDashboard;
