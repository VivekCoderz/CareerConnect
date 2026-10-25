import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Camera, CheckCircle2, Clock, ListChecks, Maximize, Mic, Layers, XCircle } from "lucide-react";
import { campusApi, errorCode, errorMessage } from "../api";
import Layout from "../components/Layout";
import { Button, Notice, Spinner } from "../components/ui";
import TestRunner from "../test/TestRunner";
import MicMeter from "../test/MicMeter";
import { ORDER, STATUS } from "../test/status";
import { enterFullscreen, fullscreenSupported, getStream, requestDevices } from "../test/devices";

// Instructions and the camera / microphone check, then the test itself (PRD R9, R10).
// Without camera and microphone the Start button stays disabled.

const Check = ({ ok, icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        {label}
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
      </p>
      {children}
    </div>
  </div>
);

const TestPage = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const preview = useRef(null);
  const [info, setInfo] = useState(null);
  const [devicesReady, setDevicesReady] = useState(Boolean(getStream()));
  const [deviceError, setDeviceError] = useState("");
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    campusApi.get("/assessments").then((res) => {
      const a = res.data.assessments.find((x) => String(x.id) === String(assessmentId));
      if (!a) setError("This assessment was not found.");
      else if (a.attempt && a.attempt.status !== "in_progress") navigate(`/result/${a.id}`, { replace: true });
      else setInfo(a);
    }).catch((e) => setError(errorMessage(e)));
  }, [assessmentId, navigate]);

  useEffect(() => {
    if (devicesReady && preview.current) preview.current.srcObject = getStream();
  }, [devicesReady, info]);

  const checkDevices = async () => {
    setDeviceError("");
    try {
      await requestDevices();
      setDevicesReady(true);
    } catch (e) {
      setDevicesReady(false);
      setDeviceError(e.message);
    }
  };

  const start = async () => {
    setBusy(true);
    setError("");
    await enterFullscreen(); // must run inside the click
    try {
      const res = await campusApi.post(`/assessments/${assessmentId}/start`);
      if (res.data.attempt.status !== "in_progress") navigate(`/result/${assessmentId}`, { replace: true });
      else setAttempt(res.data.attempt);
    } catch (e) {
      const code = errorCode(e);
      if (code === "PROFILE_INCOMPLETE") navigate("/profile?complete=1");
      setError(code === "NOT_OPEN" ? "This assessment is not open right now." : errorMessage(e));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const finished = (reason) => navigate(`/result/${assessmentId}?submitted=${reason}`, { replace: true });

  if (attempt) return <TestRunner attempt={attempt} onFinished={finished} />;

  return (
    <Layout wide>
      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}
      {!info && !error && <Spinner />}
      {info && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8"
              style={{ background: "linear-gradient(135deg, var(--campus-brand), color-mix(in srgb, var(--campus-brand) 50%, #0f172a))" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Assessment</p>
              <h1 className="mt-2 text-3xl font-extrabold">{info.title}</h1>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[[ListChecks, info.questionCount, "questions"], [Clock, info.timeLimitMinutes, "minutes"], [Layers, info.sections.length, "sections"]].map(([Icon, v, l]) => (
                  <div key={l} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/20">
                    <Icon className="h-4 w-4 text-white/70" />
                    <p className="mt-1 text-2xl font-extrabold">{v}</p>
                    <p className="text-xs text-white/70">{l}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Read before you start</h2>
              <ol className="mt-4 space-y-3">
                {String(info.instructions || "").split("\n").filter(Boolean).map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                    {line}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                {info.sections.map((s) => <span key={s.key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{s.title}</span>)}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">The question palette</h2>
              <p className="mt-1 text-sm text-slate-600">Jump to any question from the palette. Use Bookmark to come back to a question before you submit.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {ORDER.map((k) => (
                  <div key={k} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className={`h-6 w-6 rounded-md border ${STATUS[k].chip}`} /> {STATUS[k].label}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">System check</h2>
              <div className="mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-slate-900">
                {devicesReady ? <video ref={preview} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" /> : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <Camera className="h-10 w-10" />
                    <p className="text-xs">Camera preview appears here</p>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Check ok={devicesReady} icon={Camera} label="Camera" />
                <Check ok={devicesReady} icon={Mic} label="Microphone">
                  {devicesReady && <div className="mt-2"><MicMeter stream={getStream()} /><p className="mt-1 text-[11px] text-slate-500">Say something: the bar should move.</p></div>}
                </Check>
                <Check ok={fullscreenSupported()} icon={Maximize} label="Full screen">
                  {!fullscreenSupported() && <p className="mt-1 text-xs text-amber-700">Use Chrome, Edge or Firefox on a laptop.</p>}
                </Check>
              </div>
              {!devicesReady && (
                <Button variant="secondary" className="mt-4 w-full" onClick={checkDevices}>Allow camera and microphone</Button>
              )}
              {deviceError && <div className="mt-3"><Notice tone="red">{deviceError}</Notice></div>}
              <label className="mt-4 flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                I have read the instructions. I will not switch tabs, leave full screen or take help during the test.
              </label>
              <Button className="mt-4 w-full py-3 text-base" onClick={start} disabled={!devicesReady || !agreed || busy || info.state !== "open"}>
                {info.attempt ? "Continue test" : "Start test"}
              </Button>
              {info.state !== "open" && <p className="mt-2 text-xs text-slate-500">The test is not open right now.</p>}
            </section>
          </aside>
        </div>
      )}
    </Layout>
  );
};

export default TestPage;
