import { useCallback, useEffect, useRef, useState } from "react";
import { campusApi } from "../api";
import { fullscreenSupported, getStream } from "./devices";

// Fair-test checks in the browser (PRD R10). The server counts the events and decides on
// automatic submission; this hook only reports what happened and takes the camera photos.

const sendEvent = (attemptId, type) =>
  campusApi.post(`/attempts/${attemptId}/events`, { type }).then((r) => r.data).catch(() => null);

const takeSnapshot = (video) =>
  new Promise((resolve) => {
    if (!video || !video.videoWidth) { resolve(null); return; }
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = Math.round((320 * video.videoHeight) / video.videoWidth) || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.6);
  });

export default function useProctoring({ attemptId, active, snapshotEverySeconds, maxTabEvents, initialCount, onAutoSubmitted }) {
  const videoRef = useRef(null);
  const [warnings, setWarnings] = useState(initialCount || 0);
  const [lastWarning, setLastWarning] = useState("");
  const [inFullscreen, setInFullscreen] = useState(Boolean(document.fullscreenElement) || !fullscreenSupported());
  const [cameraOk, setCameraOk] = useState(Boolean(getStream()));
  const doneRef = useRef(false);

  const report = useCallback(async (type, message) => {
    if (!active || doneRef.current) return;
    const result = await sendEvent(attemptId, type);
    if (!result) return;
    setWarnings(result.countedEvents);
    if (message) setLastWarning(message);
    if (result.autoSubmitted) {
      doneRef.current = true;
      onAutoSubmitted?.();
    }
  }, [active, attemptId, onAutoSubmitted]);

  // Leaving full screen, switching tab or window.
  useEffect(() => {
    if (!active) return undefined;
    const onFullscreen = () => {
      const on = Boolean(document.fullscreenElement);
      setInFullscreen(on || !fullscreenSupported());
      if (!on && fullscreenSupported()) report("fullscreen_exit", "You left full screen.");
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") report("tab_hidden", "You switched to another tab or app."); };
    const onBlur = () => report("window_blur", "You switched to another window.");
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, report]);

  // Copy, paste, cut and right-click are blocked inside the test.
  useEffect(() => {
    if (!active) return undefined;
    const block = (e) => {
      e.preventDefault();
      if (e.type === "paste") sendEvent(attemptId, "paste_blocked");
    };
    ["copy", "cut", "paste", "contextmenu"].forEach((t) => document.addEventListener(t, block));
    return () => ["copy", "cut", "paste", "contextmenu"].forEach((t) => document.removeEventListener(t, block));
  }, [active, attemptId]);

  // Camera preview, photos every few minutes, and the camera stopping.
  useEffect(() => {
    if (!active) return undefined;
    const stream = getStream();
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
    const video = stream?.getVideoTracks()[0];
    const onEnded = () => { setCameraOk(false); report("camera_lost", "Your camera stopped."); };
    video?.addEventListener("ended", onEnded);
    const upload = async () => {
      const blob = await takeSnapshot(videoRef.current);
      if (!blob) return;
      const form = new FormData();
      form.append("image", blob, "snapshot.jpg");
      campusApi.post(`/attempts/${attemptId}/snapshot`, form).catch(() => null);
    };
    const first = setTimeout(upload, 3000);
    const timer = setInterval(upload, (snapshotEverySeconds || 180) * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      video?.removeEventListener("ended", onEnded);
    };
    // cameraOk re-runs this after the camera is turned back on, so the new stream is used.
  }, [active, attemptId, snapshotEverySeconds, report, cameraOk]);

  return { videoRef, warnings, maxTabEvents, lastWarning, clearWarning: () => setLastWarning(""), inFullscreen, cameraOk, setCameraOk };
}
