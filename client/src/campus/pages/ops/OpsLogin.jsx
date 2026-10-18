import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, errorMessage, setToken } from "../../api";
import { useCampus } from "../../useCampus";
import { BrandMark, Footer } from "../../components/Layout";
import { Button, Field, Notice } from "../../components/ui";
import { inputClass } from "../../format";

// E2Job staff sign in with their existing E2Job admin account (architecture section 5).
const OpsLogin = () => {
  const { institution, setSession } = useCampus();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await adminLogin(form.email, form.password);
      const role = data?.user?.role;
      if (!data?.token || (role !== "SUPER_ADMIN" && !(role === "admin" && !data.user.companyId))) {
        setError("This account does not have E2Job admin access.");
        return;
      }
      setToken(data.token);
      const staff = { name: data.user.fullName || data.user.email, email: data.user.email };
      sessionStorage.setItem("campus_staff", JSON.stringify(staff));
      setSession({ loading: false, member: null, batch: null, needsConsent: false, staff });
      navigate("/ops/students");
    } catch (e) {
      setError(errorMessage(e, "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <BrandMark institution={institution} />
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-lg font-bold text-slate-900">E2Job staff sign-in</h1>
          {error && <Notice tone="red">{error}</Notice>}
          <Field label="Email or username"><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" /></Field>
          <Field label="Password"><input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" /></Field>
          <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default OpsLogin;
