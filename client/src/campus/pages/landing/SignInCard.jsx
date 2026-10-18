import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../../../config/firebase";
import { campusApi, errorMessage, setToken } from "../../api";
import { useCampus } from "../../useCampus";
import { Button, Notice } from "../../components/ui";
import { inputClass } from "../../format";
import { homeFor } from "../../home";

// Sample students without Google accounts sign in here in local QA only; the server refuses
// this in production as well.
const DEV_LOGIN = import.meta.env.DEV || import.meta.env.VITE_CAMPUS_DEV_LOGIN === "true";

const CARD = "w-full rounded-2xl bg-white p-6 text-left shadow-xl ring-1 ring-black/5 sm:p-8";

/** Sign-in box on the landing page, or a way back in for someone already signed in. */
const SignInCard = () => {
  const campus = useCampus();
  const { institution, setSession, member, staff, signOut } = campus;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devEmail, setDevEmail] = useState("student01@demo.e2job.test");

  const finish = (data) => {
    setToken(data.token);
    setSession({ loading: false, member: data.member, batch: null, needsConsent: data.needsConsent, staff: null });
    navigate(homeFor({ member: data.member, staff: null, needsConsent: data.needsConsent }));
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

  if (member || staff) {
    return (
      <div className={CARD}>
        <h2 className="text-xl font-bold text-slate-900">Welcome back{member?.name ? `, ${member.name.split(" ")[0]}` : ""}</h2>
        <p className="mt-1 text-sm text-slate-600">You are signed in as {member?.email || staff?.email || "E2Job staff"}.</p>
        <div className="mt-6 space-y-3">
          <Button className="w-full py-3" onClick={() => navigate(homeFor(campus))}>
            {staff ? "Open E2Job review" : member?.role === "manager" ? "Open university dashboard" : "Go to my dashboard"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div id="sign-in" className={CARD}>
      <h2 className="text-xl font-bold text-slate-900">Student sign in</h2>
      <p className="mt-1 text-sm text-slate-600">Use the university Google account registered for you.</p>
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
        <p className="text-xs text-slate-500">Trouble signing in? Contact {institution?.helpContact}.</p>
      </div>
    </div>
  );
};

export default SignInCard;
