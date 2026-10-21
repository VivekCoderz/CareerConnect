import { useCallback, useEffect, useState } from "react";
import { campusApi, errorMessage } from "../../api";
import { useCampus } from "../../useCampus";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Field, Notice } from "../../components/ui";
import { formatDateTime, inputClass } from "../../format";

// Staff ops: add the university's own admins, who open the university dashboard (/manager)
// with their university Google account. Removing one ends their access at once.
const EMPTY = { fullName: "", email: "", phone: "" };

const OpsAdmins = () => {
  const { institution } = useCampus();
  const [managers, setManagers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    campusApi
      .get("/ops/managers")
      .then((r) => {
        setManagers(r.data.managers);
        setDomains(r.data.allowedEmailDomains);
      })
      .catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const r = await campusApi.post("/ops/managers", form);
      setForm(EMPTY);
      setMessage({ tone: "green", text: `${r.data.manager.fullName} can now sign in at this portal with ${r.data.manager.email} and open the university dashboard.` });
      load();
    } catch (e) {
      setErrors(e?.response?.data?.errors || {});
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.fullName}? They will lose access to the university dashboard immediately.`)) return;
    try {
      await campusApi.post(`/ops/managers/${m.id}/remove`);
      setMessage({ tone: "green", text: `${m.fullName} no longer has access.` });
      load();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const domainHint = domains.length ? `Must end in ${domains.map((d) => `@${d}`).join(" or ")}` : "";

  return (
    <Layout wide>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">University admins</h1>
        <p className="text-sm text-slate-600">
          People at {institution?.name} who can see the university dashboard: results, attendance, fair-test warnings and the report downloads. They cannot change marks or student details.
        </p>
      </div>
      {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Add an admin">
          <form onSubmit={add} className="space-y-4">
            <Field label="Full name" error={errors.fullName}>
              <input className={inputClass} value={form.fullName} onChange={set("fullName")} required />
            </Field>
            <Field label="University email" hint={domainHint} error={errors.email}>
              <input className={inputClass} type="email" value={form.email} onChange={set("email")} required />
            </Field>
            <Field label="Mobile (optional)" error={errors.phone}>
              <input className={inputClass} inputMode="numeric" value={form.phone} onChange={set("phone")} />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Adding..." : "Add admin"}</Button>
            <p className="text-xs text-slate-500">They sign in on this portal with Google, using this email. No password is needed.</p>
          </form>
        </Card>
        <Card title={`Admins (${managers.filter((m) => m.status === "active").length})`} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Name</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-2"><b className="text-slate-900">{m.fullName}</b><span className="block text-xs text-slate-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</span></td>
                    <td>{m.status === "active" ? <Badge tone="green">Active</Badge> : <Badge>Removed</Badge>}</td>
                    <td className="text-slate-600">{m.lastSignInAt ? formatDateTime(m.lastSignInAt) : "Not yet"}</td>
                    <td className="text-right">
                      {m.status === "active" && <Button variant="ghost" className="text-rose-700" onClick={() => remove(m)}>Remove</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!managers.length && <p className="py-6 text-center text-sm text-slate-500">No university admins yet. Add the first one on the left.</p>}
          </div>
          <p className="mt-4 text-xs text-slate-500">A removed admin can be added again with the same email.</p>
        </Card>
      </div>
    </Layout>
  );
};

export default OpsAdmins;
