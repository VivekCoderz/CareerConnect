import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";

// Small visual pieces for the university dashboard.

/** Counts up to `value` (decimals kept) when it first shows. */
export const Num = ({ value, decimals = 0, suffix = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`);
  useEffect(() => {
    if (!inView || typeof value !== "number") return undefined;
    const c = animate(mv, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [inView, value, mv]);
  if (typeof value !== "number") return <span>{value}</span>;
  return <motion.span ref={ref}>{text}</motion.span>;
};

/** A bar that grows to `value` percent. */
export const Grow = ({ value, className = "bg-[var(--campus-brand)]", delay = 0 }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
    <motion.div className={`h-full rounded-full ${className}`} initial={{ width: 0 }} whileInView={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay, ease: "easeOut" }} />
  </div>
);

/** A ring showing `value` percent. */
export const Ring = ({ value, size = 64, stroke = 7, color = "var(--campus-brand)", children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={color} strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value || 0)) / 100) }} transition={{ duration: 1.1, ease: "easeOut" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">{children}</span>
    </div>
  );
};

export const Panel = ({ title, subtitle, action, className = "", children }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5 }}
    className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)] ${className}`}
  >
    {(title || action) && (
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </motion.section>
);
