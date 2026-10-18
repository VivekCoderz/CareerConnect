import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { ClipboardCheck, Video, BarChart3, ShieldCheck } from "lucide-react";
import { auth, isFirebaseConfigured } from "../../config/firebase";
import { campusApi, errorMessage, setToken } from "../api";
import { useCampus } from "../useCampus";
import { BrandMark, Footer } from "../components/Layout";
import { Button, Notice } from "../components/ui";
import { inputClass } from "../format";

// Sample students without Google accounts sign in here in local QA only; the server refuses
// this in production as well.
const DEV_LOGIN = import.meta.env.DEV || import.meta.env.VITE_CAMPUS_DEV_LOGIN === "true";

const FEATURES = [
  { icon: ClipboardCheck, title: "Online assessment", text: "50 questions in 60 minutes: aptitude, reasoning, business, scenarios and speaking." },
  { icon: Video, title: "Live training", text: "Join your classes on Google Meet from your dashboard." },
  { icon: BarChart3, title: "Clear results", text: "Your score by section, with strengths and points to improve." },
  { icon: ShieldCheck, title: "Fair and secure", text: "Sign in with your university account. Every test is checked the same way." },
];

const routeAfterSignIn = (data) => {
  if (data.needsConsent) return "/welcome";
  return data.member?.role === "manager" ? "/manager" : "/dashboard";
};

const Landing = () => {
  const { institution, setSession } = useCampus();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devEmail, setDevEmail] = useState("student01@demo.e2job.test");

  const finish = (data) => {
    setToken(data.token);
    setSession({ loading: false, member: data.member, batch: null, needsConsent: data.needsConsent, staff: null });
    navigate(routeAfterSignIn(data));
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const res = await campusApi.post("/auth/google", { idToken });
      finish(res.data);
    } catch (e) {
      if (e?.code !== "auth/popup-closed-by-user") setError(errorMessage(e, "Sign-in did not complete. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const devSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await campusApi.post("/auth/dev", { email: devEmail });
      finish(res.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark institution={institution} />
          <Link to="/ops/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800">E2Job staff</Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--campus-brand)]">{institution?.programName}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            Welcome to the {institution?.shortName || institution?.name} assessment and training portal
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Sign in with your university Google account to see your profile, take your assessment and join your training classes.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                <Icon className="h-5 w-5 text-[var(--campus-brand)]" />
                <p className="mt-2 text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-first rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:order-none">
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Use the email your university registered for you.</p>
          <div className="mt-6 space-y-4">
            {error && <Notice tone="red">{error}</Notice>}
            <Button className="w-full py-3" onClick={google} disabled={busy || !isFirebaseConfigured}>
              Sign in with Google
            </Button>
            {!isFirebaseConfigured && <p className="text-xs text-slate-500">Google sign-in is not set up on this server.</p>}
            {DEV_LOGIN && (
              <form onSubmit={devSignIn} className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-900">Demo only: sign in as a sample student or the manager</p>
                <input className={inputClass} value={devEmail} onChange={(e) => setDevEmail(e.target.value)} aria-label="Sample email" />
                <Button type="submit" variant="secondary" className="w-full" disabled={busy}>Demo sign-in</Button>
              </form>
            )}
            <p className="text-xs text-slate-500">
              Trouble signing in? Contact {institution?.helpContact}.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
