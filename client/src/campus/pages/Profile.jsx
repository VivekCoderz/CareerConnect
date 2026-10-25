import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, GraduationCap, Link2 } from "lucide-react";
import { campusApi, errorMessage } from "../api";
import { useCampus } from "../useCampus";
import Layout from "../components/Layout";
import { Badge, Button, Field, Notice, Spinner } from "../components/ui";
import { BAND_LABEL, inputClass } from "../format";
import { CompletionRing, GraduationBlock, MarksBlock, PhotoUpload, ResumeUpload, Section } from "./profile/parts";

// The student's profile (PRD R6 and the October additions). Imported details can be corrected;
// a verified one goes back to pending. The rest is the student's own and is not verified.
// At least 90% is needed to start a test.

const GENDERS = [["", "Select"], ["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not_to_say", "Prefer not to say"]];
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const formFrom = (data) => ({
  fullName: data.member.fullName || "",
  phone: data.member.phone || "",
  cgpa: data.member.cgpa ?? "",
  dob: toDateInput(data.profile.dob),
  gender: data.profile.gender || "",
  linkedinUrl: data.profile.linkedinUrl || "",
  class10: data.profile.class10 || {},
  class12: data.profile.class12 || {},
  diploma: data.profile.diploma || {},
  graduation: data.profile.graduation || {},
});

const Profile = () => {
  const { setSession } = useCampus();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const apply = (next, { keepForm = false } = {}) => {
    setData(next);
    if (!keepForm) setForm(formFrom(next));
    setSession((s) => ({ ...s, member: next.member, profileCompletion: next.completion }));
  };

  useEffect(() => {
    campusApi.get("/profile").then((r) => { setData(r.data); setForm(formFrom(r.data)); }).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await campusApi.patch("/profile", { ...form, cgpa: form.cgpa === "" ? null : form.cgpa, dob: form.dob || null });
      apply(res.data);
      setMessage({ tone: "green", text: res.data.completion.complete ? "Saved. Your profile is complete enough to take the test." : `Saved. Your profile is ${res.data.completion.percent}% complete.` });
    } catch (e) {
      setErrors(e?.response?.data?.errors || {});
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!data || !form) return <Layout>{message ? <Notice tone={message.tone}>{message.text}</Notice> : <Spinner />}</Layout>;

  const { member, batch, completion } = data;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setBlock = (k) => (v) => setForm({ ...form, [k]: v });
  const verified = member.verification?.status === "verified";

  return (
    <Layout wide>
      {params.get("welcome") && <div className="mb-4"><Notice tone="green">Welcome! Check your details and complete your profile. You need at least {completion.required}% to start the test.</Notice></div>}
      {params.get("complete") && !completion.complete && <div className="mb-4"><Notice tone="amber">First complete your profile. You need at least {completion.required}% to start the test.</Notice></div>}

      <div className="mb-6 overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8" style={{ background: "linear-gradient(135deg, var(--campus-brand), color-mix(in srgb, var(--campus-brand) 50%, #0f172a))" }}>
        <div className="flex flex-wrap items-center gap-6">
          <PhotoUpload photo={data.profile.photo} name={member.fullName} onDone={(d) => apply(d, { keepForm: true })} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{member.fullName}</h1>
            <p className="mt-1 text-sm text-white/80">{member.email}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">Roll no. {member.rollNo || "-"}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">Batch {batch?.name || "-"}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">Semester {batch?.semester ?? "-"}</span>
              {member.band && <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{BAND_LABEL[member.band]}</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-black/15 p-4 ring-1 ring-white/15">
            <CompletionRing percent={completion.percent} required={completion.required} />
            <div className="max-w-[14rem] text-xs">
              {completion.missing.length ? (
                <>
                  <p className="mb-1.5 font-bold">Still to add:</p>
                  <ul className="space-y-0.5 text-white/85">{completion.missing.map((m) => <li key={m.key} className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3" />{m.label}</li>)}</ul>
                </>
              ) : <p className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-300" />Profile complete</p>}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6 pb-24">
        <Section title="Personal details" badge={verified ? <Badge tone="green">Verified by university record</Badge> : <Badge tone="amber">Verification pending</Badge>}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name" error={errors.fullName}><input className={inputClass} value={form.fullName} onChange={set("fullName")} /></Field>
            <Field label="Mobile number" error={errors.phone}><input className={inputClass} inputMode="numeric" value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Date of birth" error={errors.dob}><input type="date" className={inputClass} value={form.dob} onChange={set("dob")} /></Field>
            <Field label="Gender" error={errors.gender}>
              <select className={inputClass} value={form.gender} onChange={set("gender")}>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="LinkedIn profile" error={errors.linkedinUrl} hint="Like https://www.linkedin.com/in/your-name">
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="linkedin.com/in/your-name" />
                </div>
              </Field>
            </div>
          </div>
        </Section>

        <Section title="10th">
          <MarksBlock name="class10" value={form.class10} onChange={setBlock("class10")} errors={errors} />
        </Section>

        <Section title="12th" hint="If you did a diploma instead of 12th, fill the diploma section below and leave this empty.">
          <MarksBlock name="class12" value={form.class12} onChange={setBlock("class12")} errors={errors} />
        </Section>

        <Section title="Diploma (optional)" hint="Only if you have a diploma.">
          <MarksBlock name="diploma" value={form.diploma} onChange={setBlock("diploma")} errors={errors} diploma />
        </Section>

        <Section title="Graduation" hint="Your bachelor's degree.">
          <GraduationBlock value={form.graduation} onChange={setBlock("graduation")} errors={errors} />
        </Section>

        <Section title="MBA" hint="Your current programme. The CGPA decides your learning band.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Current CGPA (out of 10)" error={errors.cgpa} hint={member.band ? BAND_LABEL[member.band] : ""}><input className={inputClass} inputMode="decimal" value={form.cgpa} onChange={set("cgpa")} /></Field>
            <div className="text-sm"><span className="block text-xs text-slate-500">Batch</span><b>{batch?.name || "-"}</b></div>
            <div className="text-sm"><span className="block text-xs text-slate-500">Semester</span><b>{batch?.semester ?? "-"}</b></div>
          </div>
        </Section>

        <Section title="Resume" badge={<GraduationCap className="h-5 w-5 text-slate-300" />}>
          <ResumeUpload resume={data.profile.resume} onDone={(d) => apply(d, { keepForm: true })} />
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-sm">
              {message ? <span className={message.tone === "red" ? "text-rose-700" : message.tone === "amber" ? "text-amber-800" : "text-emerald-700"}>{message.text}</span>
                : <span className="text-slate-500">Profile {completion.percent}% complete. Photo and resume save as soon as you choose them.</span>}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Dashboard</Link>
              <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default Profile;
