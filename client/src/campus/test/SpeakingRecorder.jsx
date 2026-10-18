import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Upload } from "lucide-react";
import { campusApi, errorMessage } from "../api";
import { getStream } from "./devices";
import { Button, Notice } from "../components/ui";

// Records the spoken answer with the test's microphone, lets the student listen, and uploads it.
const pickMime = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";

const SpeakingRecorder = ({ attemptId, question, hasAudio, onSaved }) => {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [state, setState] = useState(hasAudio ? "saved" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const max = question.maxSeconds || 90;

  useEffect(() => () => { clearInterval(timerRef.current); if (url) URL.revokeObjectURL(url); }, [url]);

  const stop = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const start = () => {
    setError("");
    const stream = getStream();
    const audio = stream?.getAudioTracks()[0];
    if (!audio || !window.MediaRecorder) { setError("The microphone is not available. Reload the page and allow the microphone."); return; }
    const mimeType = pickMime();
    const recorder = new MediaRecorder(new MediaStream([audio]), mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const b = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setBlob(b);
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      setState("recorded");
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setSeconds(0);
    setState("recording");
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= max) stop();
        return s + 1;
      });
    }, 1000);
  };

  const upload = async () => {
    setState("uploading");
    setError("");
    try {
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      await campusApi.post(`/attempts/${attemptId}/audio/${question.id}`, form);
      setState("saved");
      onSaved?.();
    } catch (e) {
      setState("recorded");
      setError(errorMessage(e, "Could not upload the recording. Check your connection and try again."));
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">Record up to {max} seconds. You can listen and record again before you save.</p>
      {state === "recording" ? (
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-rose-600" />
          <span className="font-mono text-sm font-semibold">{seconds}s / {max}s</span>
          <Button variant="danger" onClick={stop}><Square className="h-4 w-4" /> Stop</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={state === "idle" ? "primary" : "secondary"} onClick={start} disabled={state === "uploading"}>
            {state === "idle" ? <><Mic className="h-4 w-4" /> Start recording</> : <><RotateCcw className="h-4 w-4" /> Record again</>}
          </Button>
          {state === "recorded" && <Button onClick={upload}><Upload className="h-4 w-4" /> Save recording</Button>}
          {state === "uploading" && <span className="text-sm text-slate-600">Saving...</span>}
        </div>
      )}
      {url && state !== "recording" && <audio controls src={url} className="w-full" />}
      {state === "saved" && <Notice tone="green">Your recording is saved.</Notice>}
      {error && <Notice tone="red">{error}</Notice>}
    </div>
  );
};

export default SpeakingRecorder;
