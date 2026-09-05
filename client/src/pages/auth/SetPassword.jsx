import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "../../config/firebase";
import api from "../../api/api";
import { setUser } from "../../redux/features/authSlice";
import { getDashboardPath } from "../../utils/dashboardRedirect";

// Eye icon
const EyeIcon = ({ hidden = false }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {hidden ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 4.2A10.8 10.8 0 0112 4c5 0 8.8 3.3 10 8a10.8 10.8 0 01-3 5.1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 6.6A11 11 0 002 12c1.2 4.7 5 8 10 8a10.7 10.7 0 004.2-.8" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    )}
  </svg>
);

/**
 * SetPassword page — shown after first-time Google sign-in.
 *
 * Flow:
 *  1. User enters password + confirm password
 *  2. linkWithCredential(firebaseUser, EmailAuthProvider.credential(email, password))
 *     links the email+password provider to the EXISTING Firebase user.
 *     Firebase UID does NOT change. MongoDB document does NOT change.
 *  3. POST /api/auth/complete-password-setup verifies Firebase has "password"
 *     provider linked, sets hasPassword=true in MongoDB.
 *  4. Redirect to /select-role (so user can pick their experience level).
 *
 * Access control:
 *  - Only accessible when user.hasPassword === false
 *  - Redirects to dashboard if user already has a password
 *  - Redirects to /login if not authenticated
 */
const SetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect guards
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.hasPassword) {
      navigate(getDashboardPath(user.userType, user), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        setError("No active Firebase session. Please sign in with Google again.");
        navigate("/login");
        return;
      }

      // Step 1: Link email+password credential to the existing Firebase user.
      // This does NOT create a new Firebase user — it adds a second provider
      // to the same user. Firebase UID remains unchanged.
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        password
      );

      try {
        await linkWithCredential(firebaseUser, credential);
      } catch (linkErr) {
        if (linkErr.code === "auth/provider-already-linked") {
          // Password already linked — proceed to confirm with backend (idempotent)
          console.info("[SetPassword] Password provider already linked, confirming with backend.");
        } else if (linkErr.code === "auth/email-already-in-use") {
          setError(
            "This email already has a separate password account. Please sign in with that account or contact support."
          );
          setLoading(false);
          return;
        } else if (linkErr.code === "auth/weak-password") {
          setError("Password is too weak. Please choose a stronger password.");
          setLoading(false);
          return;
        } else {
          throw linkErr;
        }
      }

      // Step 2: Get fresh Firebase ID token (force-refresh after linking)
      const newIdToken = await firebaseUser.getIdToken(true);

      // Step 3: Confirm with backend — verifies Firebase has "password" provider,
      // sets hasPassword=true in MongoDB, issues full-duration CareerConnect JWT.
      const response = await api.post("/auth/complete-password-setup", {
        idToken: newIdToken,
        keepSignedIn,
      });

      const { user: updatedUser } = response.data;

      // Update Redux auth state with updated user (hasPassword=true)
      dispatch(setUser(updatedUser));

      // Redirect to /select-role so user can choose their experience level
      // (Google signup skips the multi-step form that collects userType)
      navigate("/select-role", { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to set password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.hasPassword) {
    return null; // Redirect is happening
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-[42%] bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm">
            GU
          </div>
          <p className="text-[15px] font-bold tracking-tight mt-2">GEETA UNIVERSITY</p>
          <p className="text-[11px] text-[#fbbf24] font-semibold">CareerConnect</p>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-blue-100 mb-5">
            Almost there!
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Set your
            <br />
            <span className="text-[#fbbf24]">password</span>
          </h2>
          <p className="text-blue-100/90 text-[15px] leading-relaxed max-w-sm">
            Create a password so you can sign in with either Google or your email address anytime.
          </p>
          <div className="mt-8 space-y-3 text-sm text-blue-100/70">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
              Sign in with Google
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
              Sign in with email + password
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
              Both use the same CareerConnect account
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">
              GU
            </div>
            <div>
              <p className="text-sm font-bold text-[#1e3a8a]">GEETA UNIVERSITY</p>
              <p className="text-[10px] text-[#f59e0b] font-semibold">CareerConnect</p>
            </div>
          </div>

          {/* Google account info */}
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm">
                {user?.fullName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="mb-7">
            <p className="text-[13px] font-semibold text-[#1e3a8a] mb-1.5">One last step</p>
            <h2 className="text-2xl sm:text-[1.75rem] font-bold text-slate-900 tracking-tight">
              Set your password
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              You signed in with Google. Create a password to also sign in with email.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="At least 6 characters"
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Repeat your password"
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <EyeIcon hidden={showConfirm} />
                </button>
              </div>
            </div>

            {/* Keep Me Signed In */}
            <label className="flex items-center gap-3 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#1e3a8a] accent-[#1e3a8a] cursor-pointer"
              />
              <span className="text-[13px] text-slate-600">
                Keep me signed in
                <span className="ml-1 text-slate-400 text-xs">
                  ({keepSignedIn ? "7 days" : "25 hours"})
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Setting password...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Your password is stored securely by Firebase Authentication.
            CareerConnect never stores raw passwords.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
