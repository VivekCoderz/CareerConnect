import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import api from "../../api/api";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  clearMessages,
  setSessionExpired,
} from "../../redux/features/authSlice";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import { getCaptchaToken } from "../../utils/captcha";

// ─── Icons ────────────────────────────────────────────────────────────────────

const MailIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 018 0v3" />
  </svg>
);

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

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { loading, error, sessionExpired } = useSelector((state) => state.auth);

  const initialType = searchParams.get("type") === "employer" ? "employer" : "student";
  const isExpired = searchParams.get("expired") === "1";

  const [loginType, setLoginType] = useState(initialType);
  const [formData, setFormData] = useState({ emailOrUsername: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Show expired banner from URL param or Redux state
  const showExpiredBanner = isExpired || sessionExpired;

  // Clear sessionExpired flag when user manually navigates to login
  useEffect(() => {
    if (!isExpired && sessionExpired) {
      dispatch(setSessionExpired(false));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) dispatch(clearMessages());
  };

  // ─── Email + Password Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());

    try {
      const captchaToken = await getCaptchaToken("login");
      const identifier = formData.emailOrUsername.trim();
      const isEmail = identifier.includes("@");

      let user = null;

      if (isEmail) {
        // ── Firebase path (try first for email identifiers) ──────────────────
        let firebaseIdToken = null;
        let useLegacy = false;

        try {
          const credential = await signInWithEmailAndPassword(
            auth,
            identifier,
            formData.password
          );
          firebaseIdToken = await credential.user.getIdToken();
        } catch (firebaseErr) {
          // User not found in Firebase → fall back to legacy MongoDB check
          if (
            firebaseErr.code === "auth/user-not-found" ||
            firebaseErr.code === "auth/invalid-credential" ||
            firebaseErr.code === "auth/invalid-email"
          ) {
            useLegacy = true;
          } else if (firebaseErr.code === "auth/wrong-password") {
            dispatch(loginFailure("Invalid email or password"));
            return;
          } else if (firebaseErr.code === "auth/too-many-requests") {
            dispatch(
              loginFailure(
                "Too many failed attempts. Please wait a moment before trying again."
              )
            );
            return;
          } else {
            dispatch(loginFailure("Sign-in failed. Please try again."));
            return;
          }
        }

        if (!useLegacy && firebaseIdToken) {
          // Firebase path: send ID token to backend
          const response = await api.post("/auth/firebase-login", {
            idToken: firebaseIdToken,
            keepSignedIn,
            captchaToken,
            role: loginType,
          });
          user = response.data.user;
        } else {
          // Legacy path: MongoDB bcrypt check
          const response = await api.post("/auth/login", {
            ...formData,
            role: loginType,
            keepSignedIn,
            captchaToken,
          });
          user = response.data.user;
        }
      } else {
        // ── Username → always use legacy MongoDB path ────────────────────────
        const response = await api.post("/auth/login", {
          ...formData,
          role: loginType,
          keepSignedIn,
          captchaToken,
        });
        user = response.data.user;
      }

      dispatch(loginSuccess({ user }));

      if (user.role === "employer") {
        navigate("/employer/dashboard");
      } else {
        navigate(getDashboardPath(user.userType, user), { replace: true });
      }
    } catch (err) {
      dispatch(
        loginFailure(
          err.response?.data?.message || "Invalid email/username or password"
        )
      );
    }
  };

  // ─── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (loginType === "employer") return; // Google login is for candidates only
    setGoogleLoading(true);
    dispatch(clearMessages());

    try {
      const captchaToken = await getCaptchaToken("google_login");

      // Step 1: Firebase Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Step 2: Send ID token to backend
      const response = await api.post("/auth/google-auth", {
        idToken,
        keepSignedIn,
        captchaToken,
      });

      const { user, requiresPasswordSetup } = response.data;
      dispatch(loginSuccess({ user }));

      // Step 3: Route based on whether password setup is needed
      if (requiresPasswordSetup) {
        navigate("/set-password", { replace: true });
      } else {
        navigate(getDashboardPath(user.userType, user), { replace: true });
      }
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        // User dismissed popup — no error needed
      } else if (err.code === "auth/account-exists-with-different-credential") {
        dispatch(
          loginFailure(
            "This email is registered with a different sign-in method. Please use email + password to sign in."
          )
        );
      } else {
        dispatch(
          loginFailure(
            err.response?.data?.message ||
              "Google sign-in failed. Please try again."
          )
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[42%] bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm">
              GU
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight">GEETA UNIVERSITY</p>
              <p className="text-[11px] text-[#fbbf24] font-semibold">CareerConnect</p>
            </div>
          </Link>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] font-medium text-blue-100 mb-5">
            Welcome back
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight mb-4">
            Continue your
            <br />
            <span className="text-[#fbbf24]">career journey</span>
          </h2>
          <p className="text-blue-100/90 text-[15px] leading-relaxed max-w-sm">
            Sign in as a candidate or employer to access your dashboard.
          </p>

          <div className="mt-10 space-y-3 text-sm text-blue-100/80">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
              Students: Internships, jobs &amp; applications
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
              Employers: Post roles &amp; hire talent
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Form ── */}
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

          {/* Session expired banner */}
          {showExpiredBanner && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              Your session has expired. Please sign in again.
            </div>
          )}

          <div className="mb-7">
            <p className="text-[13px] font-semibold text-[#1e3a8a] mb-1.5">Welcome back</p>
            <h2 className="text-2xl sm:text-[1.75rem] font-bold text-slate-900 tracking-tight">
              Sign in to your account
            </h2>
          </div>

          {/* Candidate | Employer Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setLoginType("student")}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition ${
                loginType === "student"
                  ? "bg-white text-[#1e3a8a] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setLoginType("employer")}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition ${
                loginType === "employer"
                  ? "bg-white text-[#f59e0b] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Employer
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Username */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon />
                </div>
                <input
                  type="text"
                  name="emailOrUsername"
                  value={formData.emailOrUsername}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-semibold text-[#1e3a8a] hover:text-[#1e40af]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
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

            {/* Keep Me Signed In */}
            <label className="flex items-center gap-3 cursor-pointer select-none py-0.5">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#1e3a8a] cursor-pointer"
              />
              <span className="text-[13px] text-slate-600">
                Keep me signed in
                <span className="ml-1 text-slate-400 text-xs">
                  ({keepSignedIn ? "7 days" : "25 hours"})
                </span>
              </span>
            </label>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className={`w-full h-11 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 ${
                loginType === "employer"
                  ? "bg-[#f59e0b] hover:bg-[#d97706]"
                  : "bg-[#1e3a8a] hover:bg-[#1e40af]"
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                `Sign in as ${loginType === "student" ? "Candidate" : "Employer"}`
              )}
            </button>
          </form>

          {/* Google Login — candidates only */}
          {loginType === "student" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold transition flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 shadow-sm"
              >
                {googleLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-[11px] text-slate-400">
                New to CareerConnect? Google sign-in creates your account automatically.
              </p>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-3">Don't have an account?</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register/student"
                className="text-[13px] font-semibold text-[#1e3a8a] hover:text-[#1e40af]"
              >
                Student Register
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                to="/register/employer"
                className="text-[13px] font-semibold text-[#f59e0b] hover:text-[#d97706]"
              >
                Employer Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;