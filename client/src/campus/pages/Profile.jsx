import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { campusApi, errorMessage } from "../api";
import { useCampus } from "../useCampus";
import Layout from "../components/Layout";
import { Badge, Button, Card, Field, Notice } from "../components/ui";
import { BAND_LABEL, inputClass } from "../format";

// Imported details, editable by the student (PRD R6). Editing a verified detail sends it back to
// "pending" until the E2Job team verifies it again.
const Profile = () => {
  const { member, batch, setSession } = useCampus();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: member?.fullName || "", phone: member?.phone || "", cgpa: member?.cgpa ?? "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const verified = member?.verification?.status === "verified";

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const res = await campusApi.patch("/profile", { ...form, cgpa: form.cgpa === "" ? null : Number(form.cgpa) });
      setSession((s) => ({ ...s, member: res.data.member }));
      setMessage("Saved.");
    } catch (e) {
      setErrors(e?.response?.data?.errors || {});
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      {params.get("welcome") && (
        <div className="mb-4"><Notice tone="green">Welcome! Please check your details below and correct anything that is wrong.</Notice></div>
      )}
      <Card
        title="Your profile"
        action={verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Verification pending</Badge>}
      >
        <div className="mb-5 grid gap-3 text-sm sm:grid-cols-3">
          <div><span className="block text-xs text-slate-500">University email</span><b>{member?.email}</b></div>
          <div><span className="block text-xs text-slate-500">Roll number</span><b>{member?.rollNo || "-"}</b></div>
          <div><span className="block text-xs text-slate-500">Batch</span><b>{batch?.name || "-"}</b></div>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName}>
            <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Mobile number" error={errors.phone}>
            <input className={inputClass} inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="CGPA (out of 10)" error={errors.cgpa} hint={member?.band ? BAND_LABEL[member.band] : ""}>
            <input className={inputClass} inputMode="decimal" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} />
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>Save changes</Button>
            <Link to="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Go to dashboard</Link>
          </div>
        </form>
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        <p className="mt-4 text-xs text-slate-500">
          The E2Job team checks your details against the university record. If you change a verified detail, it shows as pending until it is checked again.
        </p>
      </Card>
    </Layout>
  );
};

export default Profile;
