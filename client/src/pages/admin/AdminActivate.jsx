import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/features/authSlice";
import { verifyAdminInvitation, activateAdmin } from "../../services/adminService";
import BrandLogo from "../../components/common/BrandLogo";
import {
  ShieldCheck,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

const AdminActivate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError("No invitation token was provided. Please verify your activation link.");
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      try {
        setLoading(true);
        const res = await verifyAdminInvitation(token);
        if (res?.success) {
          setInvitation(res.invitation);
        } else {
          setVerifyError(res?.message || "Invalid or expired invitation token.");
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        setVerifyError(
          err.response?.data?.message ||
            "Invalid or expired invitation token. Please request a new invitation from your platform administrator."
        );
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!password) {
      setFormError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please verify your password confirmation.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await activateAdmin({
        token,
        password,
        confirmPassword,
      });

      if (res?.success) {
        setSuccess(true);
        if (res.user) {
          dispatch(setUser(res.user));
        }
        setTimeout(() => {
          navigate("/admin/dashboard", { replace: true });
        }, 1200);
      } else {
        setFormError(res?.message || "Failed to activate account. Please try again.");
      }
    } catch (err) {
      console.error("Activation error:", err);
      setFormError(err.response?.data?.message || "Failed to activate administrative account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Branding */}
        <div className="flex justify-center mb-3">
          <div className="bg-white/95 rounded-2xl px-4 py-2.5 shadow-xl inline-flex items-center">
            <BrandLogo className="h-10 w-48" />
          </div>
        </div>
        <p className="mt-1 text-xs font-semibold text-indigo-300 uppercase tracking-widest">
          Company Admin Setup
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {loading ? (
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-300">Verifying administrator invitation...</p>
          </div>
        ) : verifyError ? (
          <div className="bg-slate-800/80 backdrop-blur-sm border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Activation Link Invalid</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{verifyError}</p>
            <div className="pt-2">
              <Link
                to="/admin/login"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition"
              >
                Go to Admin Sign In
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="bg-slate-800/80 backdrop-blur-sm border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Account Activated!</h2>
            <p className="text-xs text-slate-400">
              Welcome aboard, {invitation?.fullName}. Redirecting to your Company Admin Dashboard...
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Invitation Details Banner */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Administrator:</span>
                <span className="font-bold text-white">{invitation?.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Official Email:</span>
                <span className="font-semibold text-slate-300">{invitation?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Organization:</span>
                <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{invitation?.companyName}</span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Create Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activating Admin Account...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivate;
