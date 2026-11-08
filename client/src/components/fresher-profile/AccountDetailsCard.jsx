import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import { saveFresherProfileDraft } from "../../services/fresherProfileService";
import api from "../../api/api.jsx";

// Name and email of the signed-in fresher. The name is the account name that the
// dashboard greeting shows, so saving it also updates the signed-in user in the app.
const AccountDetailsCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const startEditing = () => {
    setName(user?.fullName || "");
    setError("");
    setSaved(false);
    setEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const fullName = name.trim().replace(/\s+/g, " ");
    if (fullName.length < 2 || fullName.length > 100) {
      setError("Name must be 2 to 100 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveFresherProfileDraft({ fullName });
      dispatch(updateUserProfile({ fullName }));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6" aria-labelledby="account-details-heading">
      <h2 id="account-details-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700">
        Your details
      </h2>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</span>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                aria-label="Full name"
                autoFocus
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-900 truncate">{user?.fullName || "Not set"}</span>
              <button type="button" onClick={startEditing} className="text-xs font-bold text-[#1e3a8a] hover:underline shrink-0">
                Edit
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          {saved && !editing && <p className="text-xs text-emerald-600 mt-1">Name saved.</p>}
        </div>

        <EmailField />
      </div>
    </section>
  );
};

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100";

// Changing the email: a code goes to the new address, and the account keeps the old
// email until that code is entered.
const EmailField = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const needsPassword = Boolean(user?.hasPassword);

  const [step, setStep] = useState("view"); // view | request | confirm
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const reset = (nextStep) => {
    setStep(nextStep);
    setPassword("");
    setCode("");
    setError("");
  };

  const sendCode = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/email-change/request", { email: newEmail.trim(), password });
      setNewEmail(data.email);
      setPassword("");
      setStep("confirm");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/email-change/confirm", { email: newEmail, otp: code.trim() });
      dispatch(updateUserProfile({ email: data.email }));
      reset("view");
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not change your email. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email</span>
      {step === "view" && (
        <div className="flex items-center justify-between gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
          <span className="text-sm text-slate-900 truncate">{user?.email || "Not set"}</span>
          <button
            type="button"
            onClick={() => { setNewEmail(""); setSaved(false); reset("request"); }}
            className="text-xs font-bold text-[#1e3a8a] hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      )}

      {step === "request" && (
        <form onSubmit={sendCode} className="space-y-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email"
            aria-label="New email"
            autoComplete="email"
            required
            autoFocus
            className={inputClass}
          />
          {needsPassword && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Current password"
              aria-label="Current password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-60">
              {busy ? "Sending..." : "Send code"}
            </button>
            <button type="button" onClick={() => reset("view")} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={confirm} className="space-y-2">
          <p className="text-xs text-slate-600">
            We sent a 6-digit code to <span className="font-semibold">{newEmail}</span>. It expires in 10 minutes.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            aria-label="Verification code"
            autoComplete="one-time-code"
            required
            autoFocus
            className={inputClass}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-60">
              {busy ? "Verifying..." : "Verify and change"}
            </button>
            <button type="button" onClick={() => reset("request")} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
              Back
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {saved && step === "view" && <p className="text-xs text-emerald-600 mt-1">Email changed.</p>}
    </div>
  );
};

export default AccountDetailsCard;
