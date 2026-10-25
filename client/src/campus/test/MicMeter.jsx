import { useEffect, useRef } from "react";

// A live microphone level bar, so the student can see the microphone works before starting.
const MicMeter = ({ stream }) => {
  const bar = useRef(null);
  useEffect(() => {
    if (!stream || !window.AudioContext) return undefined;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] - 128));
      if (bar.current) bar.current.style.width = `${Math.min(100, (peak / 64) * 100)}%`;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); ctx.close().catch(() => {}); };
  }, [stream]);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div ref={bar} className="h-full w-0 rounded-full bg-emerald-500 transition-[width] duration-75" />
    </div>
  );
};

export default MicMeter;
