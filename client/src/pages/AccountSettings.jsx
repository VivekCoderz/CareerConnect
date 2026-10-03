import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import api from "../api/api";
import { logout } from "../redux/features/authSlice";

const dashboardPath = (user) => {
  const type = user?.userType || user?.role;
  if (type === "employer") return "/employer/dashboard";
  if (type === "fresher") return "/fresher/dashboard";
  if (type === "professional") return "/professional/dashboard";
  return "/student/dashboard";
};

const AccountSettings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isEmployer = (user?.userType || user?.role) === "employer";
  const needsPassword = Boolean(user?.hasPassword);

  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  const canSubmit = understood && (needsPassword ? password.length > 0 : confirmText === "DELETE") && !deleting;

  const handleDelete = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete("/auth/account", {
        data: needsPassword ? { password } : { confirm: "DELETE" },
      });
      localStorage.removeItem("careerconnect_token");
      localStorage.removeItem("careerconnect_user");
      if (auth) await signOut(auth).catch(() => {});
      setDeleted(true);
      dispatch(logout());
    } catch (err) {
      const status = err.response?.status;
      setError(
        err.response?.data?.message ||
          (status === 429 ? "Too many attempts. Please try again later." : "Your account could not be deleted. Please try again.")
      );
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Your account has been deleted</h1>
          <p className="text-sm text-slate-600 mt-2">
            Your profile, resumes and personal details have been removed from CareerConnect.
          </p>
          <Link to="/" className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            Go to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link to={dashboardPath(user)} className="text-xs font-semibold text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Account settings</h1>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>

        <section className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6" aria-labelledby="delete-account-heading">
          <h2 id="delete-account-heading" className="text-lg font-bold text-rose-700">Delete account</h2>
          <p className="text-sm text-slate-600 mt-1">This is permanent and cannot be undone.</p>

          {isEmployer ? (
            <ul className="list-disc pl-5 mt-4 space-y-1 text-sm text-slate-700">
              <li>Your login and personal details are deleted.</li>
              <li>All your open jobs and internships are closed.</li>
              <li>Your company profile and past applications stay, so candidates keep their history.</li>
            </ul>
          ) : (
            <ul className="list-disc pl-5 mt-4 space-y-1 text-sm text-slate-700">
              <li>Your profile, resumes, notifications and login are deleted.</li>
              <li>Your active applications are withdrawn and upcoming interviews are cancelled.</li>
              <li>Employers keep a record that an application existed, without your name, contact details or resume.</li>
            </ul>
          )}

          <form onSubmit={handleDelete} className="mt-6 space-y-4">
            {needsPassword ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Enter your password to confirm</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Type DELETE to confirm</span>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
            )}

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1" />
              <span>I understand that my account and data will be permanently deleted.</span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete my account permanently"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default AccountSettings;
