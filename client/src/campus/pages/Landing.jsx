import { Link } from "react-router-dom";
import { MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { useCampus } from "../useCampus";
import { BrandMark, Footer } from "../components/Layout";
import Hero from "./landing/Hero";
import { About, Assessment, Faq, FinalCta, Journey, Marquee, StatsStrip, Training } from "./landing/sections";

// The university's own landing page: its brand, the programme, the test, the training bands and
// sign-in. Per-university copy comes from institution.landing. White-label: no vendor name.

const NAV = [
  ["#journey", "Journey"],
  ["#assessment", "Assessment"],
  ["#training", "Training"],
  ["#faq", "FAQ"],
];

const Landing = () => {
  const { institution, member, staff } = useCampus();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen scroll-smooth bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <BrandMark institution={institution} compact />
            <nav className="hidden items-center gap-7 md:flex">
              {NAV.map(([href, label]) => (
                <a key={href} href={href} className="text-sm font-semibold text-slate-600 transition hover:text-[var(--campus-brand)]">{label}</a>
              ))}
            </nav>
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} href="#top" className="rounded-xl bg-[var(--campus-brand)] px-4 py-2 text-sm font-semibold text-white shadow-md">
              {member || staff ? "My account" : "Sign in"}
            </motion.a>
          </div>
          <motion.div className="h-0.5 origin-left bg-[var(--campus-brand)]" style={{ scaleX: progress }} />
        </header>

        <Hero institution={institution} />
        <div className="px-4">
          <StatsStrip />
        </div>
        <Marquee />
        <About institution={institution} />
        <Journey />
        <Assessment />
        <Training />
        <Faq institution={institution} />
        <FinalCta institution={institution} />

        <Footer />
        <p className="pb-6 text-center">
          <Link to="/ops/login" className="text-xs text-slate-400 hover:text-slate-700">Staff</Link>
        </p>
      </div>
    </MotionConfig>
  );
};

export default Landing;
