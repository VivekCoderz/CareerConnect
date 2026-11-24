import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { PROGRAM_LEVELS } from "../../data/programs";
import { submitProgramEnquiry } from "../../services/programService";
import { getCaptchaToken } from "../../utils/captcha";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 500;

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100";
const borderFor = (error) => (error ? "border-red-400" : "border-slate-200");

const validateEnquiry =({ name, email, phone, level, message }) => {
  const errors = {};
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) errors.name = "Enter your name (2 to 50 characters).";
  if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email.";
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a 10-digit mobile number.";
  if (!PROGRAM_LEVELS.some((l) => l.value === level)) errors.level = "Choose a level.";
  if (message.length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters.`;
  return errors;
};

// C14: the enquiry form on a programme page. It is an enquiry, not an enrolment: there is
// no payment, and the team shares trainer, timings and fees when they call the student.
export default function ProgramEnquiryForm({ program }) {
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState(() => ({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: String(user?.phone || "").replace(/\D/g, "").slice(-10),
    level: "",
    message: "",
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateEnquiry(form);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      const captchaToken = await getCaptchaToken("program_enquiry");
      await submitProgramEnquiry(program.slug, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        countryCode: "+91",
        level: form.level,
        message: form.message.trim(),
        captchaToken,
      });
      setSent(true);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 400 && data?.field && data?.message) {
        setErrors({ [data.field]: data.message });
      } else if (err.response?.status === 429) {
        setSubmitError("Too many enquiries. Please try again later.");
      } else {
        setSubmitError(data?.message || "Could not send your enquiry. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status">
        <h3 className="text-lg font-bold text-emerald-800">Thank you, we've got your enquiry</h3>
        <p className="mt-2 text-sm text-emerald-900">
          Our team will call you about {program.title} and share all the details on the call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Full name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="name"
            maxLength={50}
            aria-invalid={Boolean(errors.name)}
            className={`${inputClass} ${borderFor(errors.name)}`}
          />
          {errors.name && <span className="block text-xs text-red-500 mt-1">{errors.name}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className={`${inputClass} ${borderFor(errors.email)}`}
          />
          {errors.email && <span className="block text-xs text-red-500 mt-1">{errors.email}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile number *</span>
          <div className="flex gap-2">
            <span className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm flex items-center text-slate-600">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              autoComplete="tel-national"
              aria-invalid={Boolean(errors.phone)}
              className={`${inputClass} ${borderFor(errors.phone)}`}
            />
          </div>
          {errors.phone && <span className="block text-xs text-red-500 mt-1">{errors.phone}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Level *</span>
          <select
            value={form.level}
            onChange={(e) => update("level", e.target.value)}
            aria-invalid={Boolean(errors.level)}
            className={`${inputClass} ${borderFor(errors.level)}`}
          >
            <option value="">Choose a level</option>
            {PROGRAM_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          {errors.level && <span className="block text-xs text-red-500 mt-1">{errors.level}</span>}
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold text-slate-700 mb-1.5">Anything you'd like us to know (optional)</span>
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          rows={3}
          maxLength={MESSAGE_MAX}
          aria-invalid={Boolean(errors.message)}
          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 ${borderFor(errors.message)}`}
        />
        {errors.message && <span className="block text-xs text-red-500 mt-1">{errors.message}</span>}
      </label>

      {submitError && (
        <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      )}

      <p className="text-xs text-slate-500">
        By sending this enquiry you agree that our team may call or email you about this programme. See our{" "}
        <Link to="/privacy" className="text-[#1e3a8a] font-semibold hover:underline">Privacy Policy</Link>.
      </p>

      <button
        type="submit"
        disabled={sending}
        className="w-full sm:w-auto px-6 h-11 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold hover:bg-blue-900 disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}
