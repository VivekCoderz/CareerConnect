// Shared constants and formatting for campus pages.

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--campus-brand)] focus:ring-2 focus:ring-[var(--campus-brand)]/20";

export const BAND_LABEL = { 1: "Band 1 (below 6.0)", 2: "Band 2 (6.0 to 7.99)", 3: "Band 3 (8.0 and above)" };

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "";
