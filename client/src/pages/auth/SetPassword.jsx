import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import BrandLogo from "../../components/common/BrandLogo";
import { useDispatch, useSelector } from "react-redux";
import { reauthenticateWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import GoogleAccountAvatar from "../../components/common/GoogleAccountAvatar";
import api from "../../api/api";
import {
  validatePassword,
  PASSWORD_VALIDATION_ERROR,
} from "../../utils/passwordGenerator";
import { setUser, logout } from "../../redux/features/authSlice";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import { cancelGoogleSignup } from "../../services/authService";

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
 * SetPassword page — shown to first-time Google sign-in users.
 *
 * Google users initially authenticate via Firebase Google provider only.
 * This page prompts them to set a password so that:
 *  1. Backend verifies a fresh Google ID token and sets the Firebase password.
 *  2. Backend updates MongoDB: hasPassword = true, authProviders = ["google", "email"].
 *  3. User can later sign in with either "Continue with Google" OR "Email + Password".
 *
 * Flow:
 *  1. User enters password + confirm password
 *  2. POST /api/auth/complete-password-setup with a Google ID token.
 *     The backend sets the password on the SAME Firebase UID, then saves the
 *     MongoDB password hash and hasPassword flag.
 *  3. Redirect to profile onboarding or the dashboard.
 *
 * Access control:
 *  - Only accessible when user.hasPassword === false
 *  - Redirects to dashboard if user already has a password and completed profile
 *  - Redirects to /login if not authenticated
 */
const SetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isSubmittingRef = useRef(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  // Redirect guards
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // If submit is in progress, let handleSubmit perform the navigation
    if (isSubmittingRef.current) return;

    if (user.hasPassword) {
      if (!user.phone?.trim() || !user.isProfileComplete) {
        navigate(
          user.role === "employer" ? "/onboarding/employer" : "/onboarding/profile",
          { replace: true }
        );
      } else {
        navigate(getDashboardPath(user.userType, user), { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!validatePassword(password)) {
      setError(PASSWORD_VALIDATION_ERROR);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      let firebaseUser = auth?.currentUser;
      if (!firebaseUser && auth && typeof auth.authStateReady === "function") {
        try {
          await auth.authStateReady();
          firebaseUser = auth.currentUser;
        } catch (e) {
          console.warn("[SetPassword] authStateReady wait warning:", e.message);
        }
      }

      if (!firebaseUser) {
        throw new Error("Google sign-in expired. Please sign in with Google again.");
      }

      let tokenResult = await firebaseUser.getIdTokenResult(true);
      if (tokenResult.signInProvider !== "google.com") {
        // A previous attempt may have linked the password provider in Firebase
        // before the backend could finish. Refresh the Google proof on retry.
        const result = await reauthenticateWithPopup(firebaseUser, googleProvider);
        firebaseUser = result.user;
        tokenResult = await firebaseUser.getIdTokenResult(true);
      }
      if (tokenResult.signInProvider !== "google.com") {
        throw new Error("Please sign in with Google again to set your password.");
      }

      // The backend updates Firebase and MongoDB together. No client-side
      // provider link is needed before it checks the Google sign-in token.
      const response = await api.post("/auth/complete-password-setup", {
        idToken: tokenResult.token,
        password,
        keepSignedIn,
      });

      isSubmittingRef.current = true;
      const { user: updatedUser, token } = response.data;

      if (token) {
        localStorage.setItem("careerconnect_token", token);
      }

      // Update Redux auth state with updated user (hasPassword=true)
      dispatch(setUser(updatedUser));

      // Route based on user role:
      // - Employers → collect company details (/onboarding/employer)
      // - Candidates/Students → select role (Student / Fresher / Professional) -> then collect info (/onboarding/profile)
      if (updatedUser.role === "employer") {
        navigate("/onboarding/employer", { replace: true });
      } else if (!updatedUser.phone?.trim() || !updatedUser.isProfileComplete) {
        navigate("/onboarding/profile", { replace: true });
      } else {
        navigate(getDashboardPath(updatedUser.userType || "student", updatedUser), { replace: true });
      }
    } catch (err) {
      isSubmittingRef.current = false;
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to set password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAndGoHome = async () => {
    setCancelling(true);
    try {
      // Delete the Firebase identity only when the backend confirms it removed
      // the unfinished account. If cleanup fails, sign out without orphaning it.
      let deletedOnServer = false;
      try {
        const result = await cancelGoogleSignup();
        deletedOnServer = result.deleted === true;
      } catch (err) {
        console.warn("[Cancel Google Signup] Backend cleanup:", err.message);
      }

      const firebaseUser = auth?.currentUser;
      if (firebaseUser && deletedOnServer) {
        try {
          await firebaseUser.delete();
        } catch {
          if (auth) await signOut(auth);
        }
      } else if (auth) {
        await signOut(auth);
      }
    } finally {
      // 3. Clear local state and localStorage
      dispatch(logout());
      localStorage.removeItem("careerconnect_token");
      localStorage.removeItem("careerconnect_user");
      setCancelling(false);
      // 4. Navigate back to Home page
      navigate("/", { replace: true });
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
          <Link to="/" className="inline-block">
            <span className="flex h-14 items-center rounded-2xl bg-white/95 px-3 shadow-sm">
              <BrandLogo className="h-10 w-48" />
            </span>
          </Link>
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
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Link to="/">
              <BrandLogo className="h-11 w-52" />
            </Link>
          </div>

          {/* Back to Home / Cancel Header */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancelAndGoHome}
              disabled={loading || cancelling}
              className="group inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1.5 px-3 rounded-lg hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {cancelling ? "Cancelling..." : "Back to Home"}
            </button>
            <span className="text-xs text-slate-400 font-medium">Account Setup</span>
          </div>

          {/* Google account info */}
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <GoogleAccountAvatar user={user} />
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

          {/* Cancel Option */}
          <div className="text-center pt-3">
            <button
              type="button"
              onClick={handleCancelAndGoHome}
              disabled={loading || cancelling}
              className="text-xs text-slate-500 hover:text-red-600 transition font-medium underline underline-offset-4 cursor-pointer disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Don't want to create an account? Cancel & Return to Home"}
            </button>
          </div>

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
