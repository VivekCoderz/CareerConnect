import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";

// Small animation helpers for the landing page. MotionConfig reducedMotion="user" in
// Landing.jsx turns these off for visitors who ask their device for less motion.

const EASE = [0.22, 1, 0.36, 1];

/** Fades and lifts its children in the first time they scroll into view. */
export const Reveal = ({ children, delay = 0, y = 24, x = 0, className = "", as = "div" }) => {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
};

/** Counts up from 0 to `to` when it first comes into view. */
export const Counter = ({ to, suffix = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(value, to, { duration: 1.6, ease: EASE });
    return () => controls.stop();
  }, [inView, to, value]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
};

/** Headline whose words rise in one after another. */
export const WordsIn = ({ text, className = "", delay = 0 }) => (
  <span className={className} aria-label={text}>
    {text.split(" ").map((word, i) => (
      <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-1 align-bottom" aria-hidden="true">
        <motion.span
          className="inline-block"
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, delay: delay + i * 0.08, ease: EASE }}
        >
          {word}&nbsp;
        </motion.span>
      </span>
    ))}
  </span>
);

/** A slow drifting glow used behind the hero. */
export const Glow = ({ className, duration = 18, path }) => (
  <motion.div
    aria-hidden="true"
    className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
    animate={path}
    transition={{ duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
  />
);
