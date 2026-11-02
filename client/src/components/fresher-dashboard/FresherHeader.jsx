import { Link } from "react-router-dom";
import { Briefcase, Clock, Layers, MapPin, Pencil, Plus, RotateCw } from "lucide-react";

// Preference fields the banner shows as chips, in order. `label` is used in "+ Add {label}".
// `values` is the key the chips read when it isn't `field` (one chip per target role).
const PREFERENCE_FIELDS = [
  { field: "targetRole", values: "targetRoles", label: "target role", icon: Briefcase },
  { field: "techStack", label: "tech stack", icon: Layers },
  { field: "jobType", label: "job type", icon: Clock },
  { field: "location", label: "location", icon: MapPin },
];
const EDITABLE_FIELDS = new Set(PREFERENCE_FIELDS.map((f) => f.field));

/** One chip per filled value (no two with the same text), and an "Add" chip per empty field. */
const buildChips = (preferences = {}) => {
  const seen = new Set();
  const chips = [];
  for (const { field, values: valuesKey, label, icon } of PREFERENCE_FIELDS) {
    const raw = preferences[valuesKey]?.length ? preferences[valuesKey] : preferences[field];
    const values = (Array.isArray(raw) ? raw : [raw]).map((v) => (v || "").trim()).filter(Boolean);
    if (values.length === 0) {
      chips.push({ key: `add-${field}`, field, label: `Add ${label}`, empty: true });
      continue;
    }
    for (const value of values) {
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({ key: `${field}-${key}`, field, label: value, icon });
    }
  }
  return chips;
};

const PreferenceChip = ({ chip, onClick }) => {
  const Icon = chip.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(chip.field)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 ${
        chip.empty ? "border border-dashed border-white/50 bg-transparent" : "border border-white/25 bg-white/10"
      }`}
    >
      {chip.empty ? <Plus className="h-3.5 w-3.5" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
      {chip.label}
    </button>
  );
};

const Stat = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-xs text-indigo-200">{label}</p>
    <p className="mt-1 truncate text-2xl font-semibold text-white">{children}</p>
  </div>
);

const SkeletonBlock = ({ className }) => <div className={`rounded-lg bg-white/15 animate-pulse ${className}`} />;

const HeaderSkeleton = () => (
  <section className="rounded-2xl bg-[#1e3a8a] p-7 text-white" aria-busy="true" aria-label="Loading your dashboard">
    <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
      <div className="flex-1 space-y-4">
        <SkeletonBlock className="h-6 w-40 rounded-full" />
        <SkeletonBlock className="h-10 w-56" />
        <SkeletonBlock className="h-4 w-full max-w-md" />
        <div className="flex flex-wrap gap-2">
          {["w-28", "w-20", "w-16", "w-24"].map((width) => (
            <SkeletonBlock key={width} className={`h-8 ${width} rounded-full`} />
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-44 w-full rounded-2xl lg:w-80" />
    </div>
    <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 md:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-7 w-14" />
        </div>
      ))}
    </div>
  </section>
);

const FresherHeader = ({ summary, loading, error, onRetry, onEditPreferences }) => {
  if (loading && !summary) return <HeaderSkeleton />;

  if (!summary) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl bg-[#1e3a8a] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-indigo-100">{error || "Dashboard load nahi ho paya."}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-indigo-50"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      </section>
    );
  }

  const {
    firstName,
    preferences = {},
    profileCompletion = 0,
    nextStep,
    nextStepHint,
    matchedJobs,
    newMatchedJobs,
    applications,
    skillScore,
    skillScoreStatus,
    profileViews,
  } = summary;
  const chips = buildChips(preferences);
  const roles = preferences.targetRoles?.length ? preferences.targetRoles : [preferences.targetRole].filter(Boolean);
  const rolesText = roles.length > 1 ? `${roles.slice(0, -1).join(", ")} aur ${roles[roles.length - 1]}` : roles[0];
  const percent = Math.min(100, Math.max(0, profileCompletion));

  return (
    <section className="rounded-2xl bg-[#1e3a8a] p-7 text-white">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: greeting, match count, preference chips */}
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            Fresher career hub
          </span>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {firstName ? `Hi, ${firstName}` : "Hi"}
          </h1>

          <p className="mt-2 max-w-xl text-sm text-indigo-200 sm:text-base">
            {rolesText
              ? `${newMatchedJobs} naye jobs aapke ${rolesText} profile se match karte hain.`
              : "Apni preferences set karo, hum aapke liye jobs dhoondhenge."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <PreferenceChip key={chip.key} chip={chip} onClick={onEditPreferences} />
            ))}
          </div>
        </div>

        {/* Right: profile strength */}
        <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/10 p-5 lg:w-80">
          <div className="flex items-center justify-between text-sm">
            <span className="text-indigo-100">Profile strength</span>
            <span className="font-semibold">{percent}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile strength"
          >
            <div className="h-full rounded-full bg-[#5DCAA5] transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>

          {nextStepHint &&
            (EDITABLE_FIELDS.has(nextStep) ? (
              <button
                type="button"
                onClick={() => onEditPreferences(nextStep)}
                className="mt-3 text-left text-xs text-indigo-100 underline-offset-2 hover:underline"
              >
                {nextStepHint}
              </button>
            ) : (
              <Link to="/fresher/profile" className="mt-3 block text-xs text-indigo-100 underline-offset-2 hover:underline">
                {nextStepHint}
              </Link>
            ))}

          <button
            type="button"
            onClick={() => onEditPreferences()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1e3a8a] transition hover:bg-indigo-50"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit preferences
          </button>
        </div>
      </div>

      {/* Bottom: counts */}
      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 md:grid-cols-4">
        <Stat label="Matched jobs">{matchedJobs}</Stat>
        <Stat label="Applications">{applications}</Stat>
        <Stat label="Skill score">
          {skillScore != null ? (
            `${skillScore}/100`
          ) : skillScoreStatus === "no_role" ? (
            <button type="button" onClick={() => onEditPreferences("targetRole")} className="hover:underline">
              Set role
            </button>
          ) : (
            <span title="Is role ke liye skill benchmark abhi available nahi hai">—</span>
          )}
        </Stat>
        <Stat label="Profile views">{profileViews}</Stat>
      </div>
    </section>
  );
};

export default FresherHeader;
