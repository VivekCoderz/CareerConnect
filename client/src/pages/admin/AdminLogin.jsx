import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../redux/features/authSlice";
import { adminLogin } from "../../services/adminService";
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import BrandLogo from "../../components/common/BrandLogo";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const isExpired = new URLSearchParams(location.search).get("expired") === "1";
  const isAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "COMPANY_ADMIN" ||
    user?.role === "admin";

  // If already authenticated as admin, redirect directly to dashboard
  React.useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError("Please enter your admin email/username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminLogin({
        emailOrUsername: emailOrUsername.trim(),
        password,
        keepSignedIn,
      });

      if (res?.success && res?.user) {
        if (res.token) {
          localStorage.setItem("careerconnect_token", res.token);
        }
        dispatch(setUser(res.user));
        let redirectPath = location.state?.from?.pathname || "/admin/dashboard";
        const isSuperAdmin = res.user.role === "SUPER_ADMIN" || (res.user.role === "admin" && !res.user.companyId);
        if (!isSuperAdmin && (redirectPath === "/admin/companies" || redirectPath === "/admin/company-admins")) {
          redirectPath = "/admin/company";
        }
        navigate(redirectPath, { replace: true });
      } else {
        setError(res?.message || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      // Security: Keep error message generic
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please verify your administrative credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center mb-1">
            <div className="bg-white/95 rounded-2xl px-4 py-2.5 shadow-xl inline-flex items-center">
              <BrandLogo className="h-10 w-48" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 uppercase tracking-wider">
              Internal Admin Portal
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Secure Administrator Authentication & Telemetry Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {isExpired && !error && (
            <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>Your administrative session has expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Admin Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="admin@careerconnect.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Keep Me Signed In */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950"
                />
                <span>Maintain administrative session</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 leading-normal">
              Restricted system. Unauthorized access attempts are monitored and logged.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          CareerConnect Platform Administration · v2.4
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
