// Shared Tailwind classes for the fresher profile / onboarding page: white page, dark cards.
// color-scheme keeps native dropdowns and date pickers dark inside the cards.
export const card = "bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-neutral-100 [color-scheme:dark]";

export const label = "block text-xs font-medium text-neutral-400 mb-1.5";

export const input = (hasError = false) =>
  `w-full h-11 px-3.5 rounded-lg border bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/20"
      : "border-neutral-800 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/40"
  }`;

export const textarea = (hasError = false) => input(hasError).replace("h-11 px-3.5", "p-3");

export const fieldError = "text-xs text-red-400 mt-1";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";

export const outlineButton =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";

export const linkButton = "font-medium text-blue-400 hover:text-blue-300 hover:underline transition";

// Pill-style toggle for chips (skills, roles, locations, modes).
export const chip = (selected, tone = "primary") =>
  `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
    selected
      ? tone === "success"
        ? "bg-[#5DCAA5]/15 text-[#5DCAA5] border-[#5DCAA5]/50"
        : "bg-[#1e3a8a] text-white border-[#1e3a8a]"
      : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-600"
  }`;

export const errorBanner = "p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm";

export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;
