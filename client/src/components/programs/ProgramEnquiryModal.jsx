import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { TERMS_VERSION } from "../../config/legal";
import { submitProgramEnquiry } from "../../services/programService";
import { getCaptchaToken } from "../../utils/captcha";
import { LEVELS } from "../../pages/programs/programList";

// C10's accepted values for year of study.
const YEARS = [
  { value: "1", label: "1st year" },
  { value: "2", label: "2nd year" },
  { value: "3", label: "3rd year" },
  { value: "4", label: "4th year" },
  { value: "5", label: "5th year" },
  { value: "graduated", label: "Graduated" },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 500;

const INPUT =
  "w-full h-11 px-3.5 rounded-xl border bg-white text-sm text-slate-900 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100";
const border = (error) => (error ? "border-red-400" : "border-slate-200");

const fromUser = (user) => ({
  name: user?.fullName || "",
  email: user?.email || "",
  phone: String(user?.phone || "").replace(/\D/g, "").slice(-10),
  college: user?.college || "",
  degree: user?.course || "",
  yearOfStudy: "",
  city: user?.city || "",
  level: "",
  message: "",
  acceptedTerms: false,
});

// Same rules as C10, so most mistakes show before anything is sent.
const validate = (f) => {
  const errors = {};
  const name = f.name.trim();
  if (name.length < 2 || name.length > 50) errors.name = "Enter your name (2 to 50 characters).";
  if (!EMAIL_RE.test(f.email.trim())) errors.email = "Enter a valid email.";
  if (!/^[6-9]\d{9}$/.test(f.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (!f.college.trim() || f.college.trim().length > 150) errors.college = "Enter your college (up to 150 characters).";
  if (!f.degree.trim() || f.degree.trim().length > 100) errors.degree = "Enter your degree (up to 100 characters).";
  if (!YEARS.some((y) => y.value === f.yearOfStudy)) errors.yearOfStudy = "Choose your year of study.";
  if (!f.city.trim() || f.city.trim().length > 100) errors.city = "Enter your city (up to 100 characters).";
  if (!LEVELS.some((l) => l.toLowerCase() === f.level)) errors.level = "Choose a level.";
  if (f.message.trim().length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters.`;
  if (!f.acceptedTerms) errors.acceptedTerms = "Please agree so our team can contact you.";
  return errors;
};

const Field = ({ label, error, children, wide = false }) => (
  <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
    <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
    {children}
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

// C14: the enquiry form, opened by every "Enquire now" on a programme page. It is an
// enquiry, not an enrolment: no payment; the team calls with trainer, timings and fees.
export default function ProgramEnquiryModal({ program, onClose }) {
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState(() => fromUser(user));
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState("");
  const dialogRef = useRef(null);

  // Focus the dialog, keep the page behind it still, close on Escape, and give focus back.
  useEffect(() => {
    const opener = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input, button")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setNotice("");
    if (Object.keys(found).length) {
      dialogRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSending(true);
    try {
      const captchaToken = await getCaptchaToken("program_enquiry");
      const data = await submitProgramEnquiry(program.slug, {
        name: form.name.trim(),
        email: form.email.trim(),
        countryCode: "+91",
        phone: form.phone,
        college: form.college.trim(),
        degree: form.degree.trim(),
        yearOfStudy: form.yearOfStudy,
        city: form.city.trim(),
        level: form.level,
        message: form.message.trim(),
        acceptedTerms: true,
        termsVersion: TERMS_VERSION,
        captchaToken,
      });
      setReference(data.reference || "");
    } catch (err) {
      const { status, data } = err.response || {};
      if (status === 409) setNotice(data?.message || "You already have an open enquiry for this programme. Our team will call you soon.");
      else if (status === 400 && data?.field && data.field in form) setErrors({ [data.field]: data.message });
      else if (status === 429) setNotice("Too many enquiries from this connection. Please try again in a little while.");
      else setNotice(data?.message || "We couldn't send your enquiry. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
        className="e2h-root w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-white sm:rounded-[24px] rounded-t-[24px] shadow-2xl"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-[#e6ebf5] px-5 sm:px-7 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-extrabold uppercase tracking-[.1em] text-amber-700">Enquire</p>
            <h2 id="enquiry-title" className="e2h-display m-0 text-xl font-bold text-[#0f1f4d]">{program.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 text-xl" aria-label="Close">
            ×
          </button>
        </div>

        {reference ? (
          <div className="px-5 sm:px-7 py-8 flex flex-col gap-4" role="status">
            <p className="e2h-display m-0 text-2xl font-bold text-[#0f1f4d]">Thank you, we've got your enquiry</p>
            <div className="rounded-2xl bg-[#eef3ff] px-5 py-4">
              <p className="m-0 text-xs font-semibold text-slate-600">Your reference number</p>
              <p className="m-0 mt-1 font-mono text-2xl font-bold tracking-wider text-[#1e3a8a]">{reference}</p>
            </div>
            <div>
              <p className="m-0 font-semibold text-slate-900">What happens next</p>
              <ol className="m-0 mt-2 pl-5 list-decimal space-y-1 text-sm text-slate-700">
                <li>Our team calls you on the number you gave us.</li>
                <li>They tell you about the trainer, class timings and fees, and answer your questions.</li>
                <li>Keep your reference number handy for that call.</li>
              </ol>
            </div>
            <button type="button" onClick={onClose} className="self-start min-h-[44px] px-6 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold hover:bg-[#0f1f4d]">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-5 sm:px-7 py-5 flex flex-col gap-4">
            <p className="m-0 text-sm text-slate-600">
              Tell us a little about yourself. Our team will contact you with the trainer, timings and fees. This is not an
              enrolment and there is nothing to pay now.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name *" error={errors.name}>
                <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" maxLength={50}
                  aria-invalid={Boolean(errors.name)} className={`${INPUT} ${border(errors.name)}`} />
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email"
                  aria-invalid={Boolean(errors.email)} className={`${INPUT} ${border(errors.email)}`} />
              </Field>
              <Field label="Mobile number *" error={errors.phone}>
                <div className="flex gap-2">
                  <span className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm flex items-center text-slate-600">+91</span>
                  <input type="tel" inputMode="numeric" value={form.phone} autoComplete="tel-national"
                    onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    aria-invalid={Boolean(errors.phone)} className={`${INPUT} ${border(errors.phone)}`} />
                </div>
              </Field>
              <Field label="City *" error={errors.city}>
                <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} autoComplete="address-level2" maxLength={100}
                  aria-invalid={Boolean(errors.city)} className={`${INPUT} ${border(errors.city)}`} />
              </Field>
              <Field label="College *" error={errors.college}>
                <input type="text" value={form.college} onChange={(e) => update("college", e.target.value)} maxLength={150}
                  aria-invalid={Boolean(errors.college)} className={`${INPUT} ${border(errors.college)}`} />
              </Field>
              <Field label="Degree *" error={errors.degree}>
                <input type="text" value={form.degree} onChange={(e) => update("degree", e.target.value)} maxLength={100} placeholder="e.g. B.Tech CSE"
                  aria-invalid={Boolean(errors.degree)} className={`${INPUT} ${border(errors.degree)}`} />
              </Field>
              <Field label="Year of study *" error={errors.yearOfStudy}>
                <select value={form.yearOfStudy} onChange={(e) => update("yearOfStudy", e.target.value)}
                  aria-invalid={Boolean(errors.yearOfStudy)} className={`${INPUT} ${border(errors.yearOfStudy)}`}>
                  <option value="">Choose</option>
                  {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </Field>
              <Field label="Preferred level *" error={errors.level}>
                <select value={form.level} onChange={(e) => update("level", e.target.value)}
                  aria-invalid={Boolean(errors.level)} className={`${INPUT} ${border(errors.level)}`}>
                  <option value="">Choose</option>
                  {LEVELS.map((l) => <option key={l} value={l.toLowerCase()}>{l}</option>)}
                </select>
              </Field>
              <Field label="Anything you'd like us to know (optional)" error={errors.message} wide>
                <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={3} maxLength={MESSAGE_MAX}
                  aria-invalid={Boolean(errors.message)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 ${border(errors.message)}`} />
              </Field>
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer">
                <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update("acceptedTerms", e.target.checked)}
                  aria-invalid={Boolean(errors.acceptedTerms)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#1e3a8a] cursor-pointer" />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-semibold text-blue-700 underline">Terms</Link> and{" "}
                  <Link to="/privacy" target="_blank" className="font-semibold text-blue-700 underline">Privacy Policy</Link>. E2Job keeps
                  these details only to call or email me about this programme.
                </span>
              </label>
              {errors.acceptedTerms && <span className="block text-xs text-red-600 mt-1">{errors.acceptedTerms}</span>}
            </div>

            {notice && (
              <p className="m-0 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900" role="alert">
                {notice}
              </p>
            )}

            <button type="submit" disabled={sending}
              className="min-h-[48px] px-7 rounded-[14px] bg-amber-500 text-[#1c1300] text-base font-bold hover:bg-amber-400 disabled:opacity-60 sm:self-start">
              {sending ? "Sending..." : "Send enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
