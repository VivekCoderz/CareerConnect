import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck, X } from "lucide-react";
import OtpInput from "./OtpInput";
import {
  confirmNewEmail,
  requestNewEmail,
  resetAccountPassword,
  sendOldEmailOtp,
  verifyOldEmailOtp,
  verifyPasswordForEmailChange,
} from "../../services/accountService";
import {
  errorBanner,
  errorMessage,
  input,
  label,
  linkButton,
  outlineButton,
  primaryButton,
} from "./profileUi";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const RESEND_SECONDS = 60;

// Steps: password → (forgot: oldOtp → newPassword) → newEmail → newOtp → success
const STEP_COPY = {
  password: { icon: ShieldCheck, title: "Verify it's you", subtitle: "Enter your password to change your email." },
  oldOtp: { icon: Mail, title: "Check your email", subtitle: "" },
  newPassword: { icon: KeyRound, title: "Set new password", subtitle: "Choose a new password for your account." },
  newEmail: { icon: Mail, title: "New email", subtitle: "Enter the email you want to use from now on." },
  newOtp: { icon: Mail, title: "Verify new email", subtitle: "" },
  success: { icon: CircleCheck, title: "Email updated", subtitle: "" },
};

const Spinner = () => <LoaderCircle className="w-4 h-4 animate-spin" />;

const PasswordField = ({ id, value, onChange, show, onToggle, hasError, autoComplete, autoFocus }) => (
  <div className="relative">
    <input
      id={id}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      className={`${input(hasError)} pr-11`}
    />
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Hide password" : "Show password"}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-500 hover:text-neutral-200"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

const EmailChangeModal = ({ currentEmail, onClose, onEmailChanged, onSignedInAgain }) => {
  const [step, setStep] = useState("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordNotSet, setPasswordNotSet] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordWasReset, setPasswordWasReset] = useState(false);
  const [changeToken, setChangeToken] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const goTo = (next) => {
    setError("");
    setOtp("");
    setStep(next);
  };

  // Shows the server message; a timed-out step goes back to the start.
  const fail = (err, fallback) => {
    const data = err?.response?.data || {};
    if (data.code === "STEP_EXPIRED") {
      setChangeToken("");
      setResetToken("");
      setStep("password");
    }
    if (data.code === "RESEND_TOO_SOON" && data.retryAfter) setResendCooldown(data.retryAfter);
    if (data.code === "OTP_LOCKED" || data.code === "OTP_EXPIRED") setOtp("");
    setError(errorMessage(err, fallback));
  };

  const run = async (action, fallback) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      fail(err, fallback);
    } finally {
      setBusy(false);
    }
  };

  // ─── Step 1: password ─────────────────────────────────────────────────────
  const submitPassword = (e) => {
    e.preventDefault();
    if (!password) return setError("Enter your password");
    setPasswordNotSet(false);
    return run(async () => {
      try {
        const res = await verifyPasswordForEmailChange(password);
        setChangeToken(res.changeToken);
        setPassword("");
        goTo("newEmail");
      } catch (err) {
        if (err?.response?.data?.code === "PASSWORD_NOT_SET") setPasswordNotSet(true);
        throw err;
      }
    }, "Couldn't verify your password. Please try again.");
  };

  // ─── Step 1B: forgot password ─────────────────────────────────────────────
  const sendOldCode = () =>
    run(async () => {
      const res = await sendOldEmailOtp();
      setMaskedEmail(res.maskedEmail);
      setResendCooldown(RESEND_SECONDS);
      if (step !== "oldOtp") goTo("oldOtp");
    }, "Couldn't send the code. Please try again.");

  const submitOldOtp = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code");
    return run(async () => {
      const res = await verifyOldEmailOtp(otp);
      setResetToken(res.resetToken);
      goTo("newPassword");
    }, "Couldn't verify the code. Please try again.");
  };

  const submitNewPassword = (e) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(newPassword)) {
      return setError("Password must be at least 8 characters with a letter, a number and a special character.");
    }
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    return run(async () => {
      const res = await resetAccountPassword(resetToken, newPassword);
      // Other devices are signed out; this one continues with the new token.
      onSignedInAgain(res.authToken);
      setChangeToken(res.changeToken);
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordWasReset(true);
      goTo("newEmail");
    }, "Couldn't change your password. Please try again.");
  };

  // ─── Steps 2–3: new email ─────────────────────────────────────────────────
  const sendNewCode = () =>
    run(async () => {
      const res = await requestNewEmail(changeToken, newEmail.trim().toLowerCase());
      setSavedEmail(res.email);
      setResendCooldown(RESEND_SECONDS);
      if (step !== "newOtp") goTo("newOtp");
    }, "Couldn't send the code. Please try again.");

  const submitNewEmail = (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return setError("Please enter a valid email address.");
    if (email === currentEmail?.toLowerCase()) return setError("This is already your email address.");
    return sendNewCode();
  };

  const submitNewOtp = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code");
    return run(async () => {
      const res = await confirmNewEmail(changeToken, otp);
      onSignedInAgain(res.authToken);
      onEmailChanged(res.user);
      goTo("success");
    }, "Couldn't verify the code. Please try again.");
  };

  const close = () => {
    if (!busy) onClose();
  };

  const { icon: StepIcon, title, subtitle } = STEP_COPY[step];
  const otpSubtitle =
    step === "oldOtp"
      ? `We sent a 6-digit code to ${maskedEmail}. It expires in 10 minutes.`
      : `We sent a 6-digit code to ${savedEmail}. It expires in 10 minutes.`;

  const resendRow = (onResend) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-500">Didn't get it? Check spam.</span>
      {resendCooldown > 0 ? (
        <span className="text-neutral-500">Resend code in {resendCooldown}s</span>
      ) : (
        <button type="button" onClick={onResend} disabled={busy} className={linkButton}>
          Resend code
        </button>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-change-title"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 [color-scheme:dark] max-w-md w-full shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                step === "success" ? "bg-[#5DCAA5]/15 text-[#5DCAA5]" : "bg-[#1e3a8a]/30 text-blue-300"
              }`}
            >
              <StepIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 id="email-change-title" className="text-lg font-semibold text-neutral-100">
                {title}
              </h3>
              <p className="text-sm text-neutral-400 mt-0.5">
                {step === "oldOtp" || step === "newOtp" ? otpSubtitle : subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6">
          {error && <div className={`${errorBanner} mb-4`}>{error}</div>}

          {step === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className={label}>Current password</label>
                <PasswordField
                  id="current-password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                  hasError={Boolean(error) && !passwordNotSet}
                  autoComplete="current-password"
                  autoFocus
                />
                <button type="button" onClick={sendOldCode} disabled={busy} className={`${linkButton} text-xs mt-2`}>
                  Forgot password?
                </button>
                {passwordNotSet && (
                  <p className="text-xs text-amber-400 mt-1">
                    Use "Forgot password?" to verify your email and set a password.
                  </p>
                )}
              </div>
              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Spinner />}
                Continue
              </button>
            </form>
          )}

          {step === "oldOtp" && (
            <form onSubmit={submitOldOtp} className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} disabled={busy} hasError={Boolean(error)} />
              {resendRow(sendOldCode)}
              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Spinner />}
                Verify code
              </button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => goTo("password")} disabled={busy} className="text-neutral-400 hover:text-neutral-200">
                  ← Back
                </button>
                <Link to="/contact" className={linkButton}>
                  Can't access your old email? Contact support
                </Link>
              </div>
            </form>
          )}

          {step === "newPassword" && (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className={label}>New password</label>
                <PasswordField
                  id="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPassword}
                  onToggle={() => setShowNewPassword((s) => !s)}
                  autoComplete="new-password"
                  autoFocus
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  At least 8 characters with a letter, a number and a special character.
                </p>
              </div>
              <div>
                <label htmlFor="confirm-password" className={label}>Confirm new password</label>
                <PasswordField
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showNewPassword}
                  onToggle={() => setShowNewPassword((s) => !s)}
                  hasError={Boolean(confirmPassword) && confirmPassword !== newPassword}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Spinner />}
                Save password and continue
              </button>
            </form>
          )}

          {step === "newEmail" && (
            <form onSubmit={submitNewEmail} className="space-y-4">
              {passwordWasReset && (
                <p className="text-xs text-[#5DCAA5]">Password changed. Other devices were logged out.</p>
              )}
              <div>
                <span className={label}>Current email</span>
                <p className="text-sm text-neutral-300 truncate">{currentEmail}</p>
              </div>
              <div>
                <label htmlFor="new-email" className={label}>New email</label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  className={input(Boolean(error))}
                />
              </div>
              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Spinner />}
                Send code
              </button>
            </form>
          )}

          {step === "newOtp" && (
            <form onSubmit={submitNewOtp} className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} disabled={busy} hasError={Boolean(error)} />
              {resendRow(sendNewCode)}
              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Spinner />}
                Verify and update email
              </button>
              <button
                type="button"
                onClick={() => goTo("newEmail")}
                disabled={busy}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-300">
                Your account email is now <span className="font-semibold text-neutral-100">{savedEmail}</span>. Use it
                to sign in from now on.
              </p>
              <p className="text-sm text-[#5DCAA5]">
                {passwordWasReset
                  ? "Password changed. Other devices were logged out."
                  : "Other devices were logged out."}
              </p>
              <button type="button" onClick={onClose} className={`${outlineButton} w-full`}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailChangeModal;
