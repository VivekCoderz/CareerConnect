import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, CheckCircle2 } from "lucide-react";
import { campusApi, errorCode, errorMessage } from "../api";
import Layout from "../components/Layout";
import { Button, Card, Notice, Spinner } from "../components/ui";
import TestRunner from "../test/TestRunner";
import { enterFullscreen, fullscreenSupported, getStream, requestDevices } from "../test/devices";

// Instructions and the camera / microphone check, then the test itself (PRD R9, R10).
// Without camera and microphone the Start button stays disabled.
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
      setError(errorCode(e) === "NOT_OPEN" ? "This assessment is not open right now." : errorMessage(e));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const finished = (reason) => navigate(`/result/${assessmentId}?submitted=${reason}`, { replace: true });

  if (attempt) return <TestRunner attempt={attempt} onFinished={finished} />;

  return (
    <Layout>
      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}
      {!info && !error && <Spinner />}
      {info && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card title={info.title}>
            <p className="mb-3 text-sm text-slate-600">{info.questionCount} questions · {info.timeLimitMinutes} minutes · one attempt</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {String(info.instructions || "").split("\n").filter(Boolean).map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              {info.sections.map((s) => <span key={s.key} className="rounded-full bg-slate-100 px-2.5 py-1">{s.title}</span>)}
            </div>
            {!fullscreenSupported() && (
              <div className="mt-4"><Notice tone="amber">This browser does not support full screen. A laptop with Chrome, Edge or Firefox is recommended.</Notice></div>
            )}
          </Card>

          <Card title="Camera and microphone">
            <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
              {devicesReady ? <video ref={preview} autoPlay muted playsInline className="h-full w-full object-cover" /> : (
                <div className="flex h-full items-center justify-center"><Camera className="h-8 w-8 text-slate-400" /></div>
              )}
            </div>
            {devicesReady ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Camera and microphone are on</p>
            ) : (
              <Button variant="secondary" className="mt-3 w-full" onClick={checkDevices}>Allow camera and microphone</Button>
            )}
            {deviceError && <div className="mt-3"><Notice tone="red">{deviceError}</Notice></div>}
            <Button className="mt-4 w-full py-3" onClick={start} disabled={!devicesReady || busy || info.state !== "open"}>
              {info.attempt ? "Continue test" : "Start test"}
            </Button>
            {info.state !== "open" && <p className="mt-2 text-xs text-slate-500">The test is not open right now.</p>}
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default TestPage;
