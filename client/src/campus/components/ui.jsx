// Small building blocks for the campus portal. The brand colour comes from the institution
// (CSS variable --campus-brand set in context.jsx).

export const Button = ({ variant = "primary", className = "", children, ...props }) => {
  const styles = {
    primary: "text-white bg-[var(--campus-brand)] hover:opacity-90",
    secondary: "text-slate-800 bg-white border border-slate-300 hover:bg-slate-50",
    danger: "text-white bg-rose-600 hover:bg-rose-700",
    ghost: "text-slate-700 hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ title, action, className = "", children }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Badge = ({ tone = "slate", children }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};

export const Spinner = ({ label = "Loading..." }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--campus-brand)]" />
    {label}
  </div>
);

export const Notice = ({ tone = "blue", children }) => {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-rose-200 bg-rose-50 text-rose-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
};

export const Field = ({ label, hint, error, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-800">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);
