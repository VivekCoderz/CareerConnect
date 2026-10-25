import { useRef, useState } from "react";
import { Camera, FileText, Upload } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import { Field } from "../../components/ui";
import { inputClass } from "../../format";

// Building blocks of the profile page: section card, marks blocks, uploads, completion ring.

export const Section = ({ title, hint, children, badge }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {badge}
    </div>
    {children}
  </section>
);

const percentOf = (b) => (b?.maxMarks > 0 && b?.obtainedMarks !== "" && b?.obtainedMarks !== null && b?.obtainedMarks !== undefined
  ? `${Math.round((Number(b.obtainedMarks) / Number(b.maxMarks)) * 1000) / 10}%` : "");

/** 10th, 12th or diploma: board (or course and institute), maximum and obtained marks, year. */
export const MarksBlock = ({ name, value, onChange, errors, diploma = false }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const err = (k) => errors[`${name}.${k}`];
  const pct = percentOf(value);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {diploma ? (
        <>
          <Field label="Course" error={err("course")}><input className={inputClass} value={value.course || ""} onChange={set("course")} placeholder="Diploma in ..." /></Field>
          <Field label="Institute or board" error={err("institute")}><input className={inputClass} value={value.institute || ""} onChange={set("institute")} /></Field>
        </>
      ) : (
        <div className="sm:col-span-2">
          <Field label="Board" error={err("board")}><input className={inputClass} value={value.board || ""} onChange={set("board")} placeholder="e.g. CBSE, Maharashtra State Board" /></Field>
        </div>
      )}
      <Field label="Maximum marks" error={err("maxMarks")}><input className={inputClass} inputMode="numeric" value={value.maxMarks ?? ""} onChange={set("maxMarks")} /></Field>
      <Field label="Marks obtained" error={err("obtainedMarks")} hint={pct ? `${pct}` : ""}><input className={inputClass} inputMode="decimal" value={value.obtainedMarks ?? ""} onChange={set("obtainedMarks")} /></Field>
      <Field label="Year of passing" error={err("year")}><input className={inputClass} inputMode="numeric" value={value.year ?? ""} onChange={set("year")} placeholder="YYYY" /></Field>
    </div>
  );
};

export const GraduationBlock = ({ value, onChange, errors }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Degree" error={errors["graduation.degree"]}><input className={inputClass} value={value.degree || ""} onChange={set("degree")} placeholder="e.g. BBA, BCom, BTech" /></Field>
      <Field label="University" error={errors["graduation.university"]}><input className={inputClass} value={value.university || ""} onChange={set("university")} /></Field>
      <Field label="CGPA (out of 10)" error={errors["graduation.cgpa"]}><input className={inputClass} inputMode="decimal" value={value.cgpa ?? ""} onChange={set("cgpa")} /></Field>
      <Field label="Year of passing" error={errors["graduation.year"]}><input className={inputClass} inputMode="numeric" value={value.year ?? ""} onChange={set("year")} placeholder="YYYY" /></Field>
    </div>
  );
};

const useUpload = (path, onDone) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return;
    setError("");
    if (file.size > 2 * 1024 * 1024) { setError("The file is larger than 2 MB."); return; }
    setBusy(true);
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await campusApi.post(path, data);
      onDone(res.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, upload };
};

export const PhotoUpload = ({ photo, name, onDone }) => {
  const input = useRef(null);
  const { busy, error, upload } = useUpload("/profile/photo", onDone);
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => input.current?.click()} className="group relative h-28 w-28 overflow-hidden rounded-full bg-white/20 ring-4 ring-white/40" aria-label="Change profile photo">
        {photo?.url ? <img src={photo.url} alt={name} className="h-full w-full object-cover" /> : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white">{(name || "?").slice(0, 1).toUpperCase()}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} className="mt-2 text-xs font-semibold text-white/90 underline" disabled={busy}>
        {busy ? "Uploading..." : photo ? "Change photo" : "Add photo"}
      </button>
      {error && <p className="mt-1 max-w-[10rem] text-center text-xs text-rose-200">{error}</p>}
    </div>
  );
};

export const ResumeUpload = ({ resume, onDone }) => {
  const input = useRef(null);
  const { busy, error, upload } = useUpload("/profile/resume", onDone);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-4">
        <FileText className="h-8 w-8 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{resume ? "Resume uploaded" : "No resume yet"}</p>
          <p className="text-xs text-slate-500">PDF only, up to 2 MB.</p>
        </div>
        {resume?.url && <a href={resume.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--campus-brand)] underline">View</a>}
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Upload className="h-4 w-4" /> {busy ? "Uploading..." : resume ? "Replace" : "Upload PDF"}
        </button>
        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

export const CompletionRing = ({ percent, required }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ok = percent >= required;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-white/20" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke={ok ? "#34d399" : "#fbbf24"} strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold">{percent}%</span>
        <span className="text-[10px] text-white/70">complete</span>
      </span>
    </div>
  );
};
