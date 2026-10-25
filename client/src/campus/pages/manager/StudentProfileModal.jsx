import { useEffect, useState } from "react";
import { FileText, Link2, X } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import { Badge, Notice, Spinner } from "../../components/ui";
import { BAND_LABEL } from "../../format";

// A student's full profile for the university admin and staff: details, schooling, graduation,
// photo, resume and LinkedIn.
const GENDER = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };
const pct = (b) => (b?.maxMarks > 0 && b?.obtainedMarks !== null && b?.obtainedMarks !== undefined ? `${Math.round((b.obtainedMarks / b.maxMarks) * 1000) / 10}%` : "");
const date = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

const Row = ({ label, value }) => (
  <div><dt className="text-xs text-slate-500">{label}</dt><dd className="text-sm font-semibold text-slate-900">{value || "-"}</dd></div>
);

const Marks = ({ title, b, diploma }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
    {b?.maxMarks ? (
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {diploma ? <Row label="Course" value={`${b.course}${b.institute ? `, ${b.institute}` : ""}`} /> : <Row label="Board" value={b.board} />}
        <Row label="Marks" value={`${b.obtainedMarks ?? "-"} / ${b.maxMarks}`} />
        <Row label="Percentage" value={pct(b)} />
        <Row label="Year" value={b.year} />
      </dl>
    ) : <p className="text-sm text-slate-500">Not added</p>}
  </div>
);

const StudentProfileModal = ({ memberId, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    campusApi.get(`/manager/students/${memberId}/profile`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [memberId]);

  const m = data?.member;
  const p = data?.profile;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-end p-3"><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="px-6 pb-6">
          {error && <Notice tone="red">{error}</Notice>}
          {!data && !error && <Spinner />}
          {data && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-5">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-200">
                  {p.photo?.url ? <img src={p.photo.url} alt={m.fullName} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-2xl font-bold text-slate-400">{m.fullName.slice(0, 1)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-extrabold text-slate-900">{m.fullName}</p>
                  <p className="text-sm text-slate-500">{m.rollNo} · {m.email} · {m.phone || "no phone"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={data.completion.complete ? "green" : "amber"}>Profile {data.completion.percent}%</Badge>
                    {m.band && <Badge>{BAND_LABEL[m.band]}</Badge>}
                    <Badge>{data.batch?.name || "-"}{data.batch?.semester ? ` · Semester ${data.batch.semester}` : ""}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {p.resume?.url && <a href={p.resume.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><FileText className="h-4 w-4" />Resume</a>}
                  {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"><Link2 className="h-4 w-4" />LinkedIn</a>}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                <Row label="Date of birth" value={date(p.dob)} />
                <Row label="Gender" value={GENDER[p.gender]} />
                <Row label="MBA CGPA" value={m.cgpa} />
                <Row label="Details" value={m.verification?.status === "verified" ? "Verified" : "Pending"} />
              </dl>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Graduation</p>
                {p.graduation?.degree ? (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Row label="Degree" value={p.graduation.degree} /><Row label="University" value={p.graduation.university} />
                    <Row label="CGPA" value={p.graduation.cgpa} /><Row label="Year" value={p.graduation.year} />
                  </dl>
                ) : <p className="text-sm text-slate-500">Not added</p>}
              </div>
              <Marks title="12th" b={p.class12} />
              {p.diploma?.maxMarks ? <Marks title="Diploma" b={p.diploma} diploma /> : null}
              <Marks title="10th" b={p.class10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;
