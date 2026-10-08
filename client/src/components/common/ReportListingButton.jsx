import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/api";

// Keys match server/controllers/reportController.js.
const REASONS = [
  { value: "asks_for_money", label: "Asks candidates for money" },
  { value: "fake_or_scam", label: "Fake or scam job" },
  { value: "misleading", label: "Wrong or misleading information" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
];
const MAX_DETAILS = 500;

/**
 * "Report this job" link and modal (G11). Logged-out visitors are sent to log in first
 * and come back to the same page.
 * @param {"Job"|"Internship"} opportunityType
 * @param {string} opportunityId
 */
export default function ReportListingButton({ opportunityType, opportunityId, className = "" }) {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const selectRef = useRef(null);

  const noun = opportunityType === "Internship" ? "internship" : "job";

  useEffect(() => {
    if (!open) return undefined;
    selectRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setError("");
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/reports", { opportunityType, opportunityId, reason, details: details.trim() });
      setDone(res.data?.message || "Thanks, our team will review this within 24 hours.");
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === "ALREADY_REPORTED") setDone(data.message);
      else setError(data?.message || "Your report could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={Boolean(done)}
        className={`text-xs font-semibold text-slate-500 hover:text-rose-700 underline underline-offset-2 disabled:no-underline disabled:text-slate-400 ${className}`}
      >
        {done ? "Reported, thank you" : `🚩 Report this ${noun}`}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-left">
            {done ? (
              <div className="space-y-4 text-center">
                <h2 id="report-title" className="text-lg font-extrabold text-slate-900">Report received</h2>
                <p className="text-sm text-slate-600">{done}</p>
                <button type="button" onClick={() => setOpen(false)} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 id="report-title" className="text-lg font-extrabold text-slate-900">Report this {noun}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Genuine employers never ask candidates for money. Tell us what's wrong and our team will check it.
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Reason</span>
                  <select
                    ref={selectRef}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setError("");
                    }}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="">Choose a reason</option>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Details (optional)</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS))}
                    rows={4}
                    maxLength={MAX_DETAILS}
                    placeholder="For example: they asked for a registration fee on WhatsApp."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none resize-none focus:border-[#1e3a8a]"
                  />
                  <span className="block text-right text-[11px] text-slate-400">{details.length}/{MAX_DETAILS}</span>
                </label>

                {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold">
                    {submitting ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
