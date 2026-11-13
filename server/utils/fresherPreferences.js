// Fresher job preferences: one place for the keys the dashboard banner, the recommended
// jobs list, the profile editor and signup all use.
//
// FresherProfile.preferences = { targetRole, techStack[], jobType, location } is the source
// the dashboard reads. Older code reads targetRole / targetRoles / jobPreferences.*, so a
// save to either side is mirrored to the other (see mirrorPreferencesToLegacy and
// syncPreferencesFromLegacy). Profiles saved before `preferences` existed are filled once
// from those old fields and the signup interests (backfillPreferences), and get
// preferencesSyncedAt so that never happens again.

const { normalizeSkill } = require("./skills");

const JOB_TYPES = ["Internship", "Full-time", "Part-time"];

// Skills each target role asks for: used for the skill score and the skill-gap card.
const ROLE_SKILLS = {
  "Full Stack Developer": ["JavaScript", "React", "Node.js", "Express", "MongoDB", "REST API", "Git", "HTML", "CSS", "TypeScript"],
  "MERN Stack Developer": ["JavaScript", "React", "Node.js", "Express", "MongoDB", "REST API", "Git", "HTML", "CSS", "Redux"],
  "Frontend Developer": ["JavaScript", "React", "HTML", "CSS", "Tailwind CSS", "TypeScript", "Redux", "Git"],
  "Backend Developer": ["Node.js", "Express", "MongoDB", "SQL", "REST API", "Python", "Docker", "Authentication", "Git"],
  "Web Developer": ["HTML", "CSS", "JavaScript", "React", "Git", "REST API"],
  "Software Developer": ["Data Structures", "Algorithms", "Java", "C++", "Python", "SQL", "Git", "OOP"],
  "Junior Software Engineer": ["JavaScript", "Python", "Java", "Data Structures", "SQL", "Git", "Problem Solving"],
  "Python Developer": ["Python", "Django", "Flask", "SQL", "REST API", "Git"],
  "Java Developer": ["Java", "Spring Boot", "SQL", "OOP", "REST API", "Git"],
  "Mobile App Developer": ["Flutter", "Dart", "React Native", "Kotlin", "Firebase", "Git"],
  "Data Analyst": ["Python", "SQL", "Excel", "Pandas", "NumPy", "Data Visualization", "PowerBI", "Tableau"],
  "AI/ML Engineer": ["Python", "Machine Learning", "NumPy", "Pandas", "TensorFlow", "PyTorch", "SQL"],
  "QA Engineer": ["JavaScript", "Selenium", "Manual Testing", "Automation Testing", "Postman", "Jest", "Git"],
  "DevOps Engineer": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Git", "Shell Scripting"],
  "Cyber Security Analyst": ["Networking", "Linux", "Python", "Ethical Hacking", "SIEM", "Firewalls"],
  "UI/UX Designer": ["Figma", "Wireframing", "Prototyping", "User Research", "Adobe XD"],
  "Graphic Designer": ["Photoshop", "Illustrator", "Figma", "Canva", "Premiere Pro"],
  "Digital Marketing Executive": ["SEO", "Google Analytics", "Social Media Marketing", "Google Ads", "Content Marketing"],
  "Content Writer": ["Content Writing", "SEO", "Copywriting", "Research", "WordPress"],
  "Business Development Executive": ["Sales", "Lead Generation", "CRM", "Negotiation", "Excel"],
  "HR Executive": ["Recruitment", "Onboarding", "HRMS", "Excel", "Employee Engagement"],
  "Finance Associate": ["Accounting", "Excel", "Tally", "GST", "Financial Analysis"],
  "Associate Product Manager": ["Product Roadmap", "User Research", "SQL", "Analytics", "Jira"],
};

// Other words in a job title that mean the same kind of role (compared after compact(), so
// "Full-stack" is "fullstack" and "Node.js" is "nodejs"). A Web Developer is also shown
// Frontend, Full Stack and React jobs.
const ROLE_TITLE_WORDS = {
  "Full Stack Developer": ["fullstack", "mern", "mean", "mevn"],
  "MERN Stack Developer": ["mern", "fullstack"],
  "Frontend Developer": ["frontend", "react", "angular", "vue", "uidev"],
  "Backend Developer": ["backend", "nodejs", "node", "express", "django", "springboot"],
  "Web Developer": ["web", "frontend", "fullstack", "mern", "mean", "react", "nodejs", "javascript"],
  "Software Developer": ["software", "sde"],
  "Junior Software Engineer": ["software", "sde"],
  "Python Developer": ["python", "django", "flask"],
  "Java Developer": ["java", "springboot"],
  "Mobile App Developer": ["mobile", "android", "ios", "flutter", "reactnative", "kotlin"],
  "Data Analyst": ["data", "analyst", "analytics", "bi"],
  "AI/ML Engineer": ["ai", "ml", "machinelearning", "datascien"],
  "QA Engineer": ["qa", "test", "quality"],
  "DevOps Engineer": ["devops", "cloud", "sre"],
  "UI/UX Designer": ["uiux", "uxui", "productdesign", "ux"],
};

// Skills too common to say a job is for the fresher's role on their own.
const GENERIC_SKILLS = ["Git", "GitHub", "Excel", "MS Excel", "Communication", "Problem Solving"];

// Signup "areas of interest" (Signup.jsx / GoogleOnboarding.jsx POPULAR_INTERESTS) that
// name a role. Custom interests the fresher typed are matched against ROLE_SKILLS, and
// anything else (e.g. "MERN") is treated as tech stack.
const INTEREST_ROLES = {
  "Web Development": "Web Developer",
  "Mobile App Development": "Mobile App Developer",
  "Python Programming": "Python Developer",
  "Full Stack (MERN/Java)": "Full Stack Developer",
  "Artificial Intelligence & ML": "AI/ML Engineer",
  "Data Science & Analytics": "Data Analyst",
  "UI/UX Design": "UI/UX Designer",
  "Graphic Design & Video": "Graphic Designer",
  "Digital Marketing & SEO": "Digital Marketing Executive",
  "Content Writing": "Content Writer",
  "Business Development & Sales": "Business Development Executive",
  "Human Resources (HR)": "HR Executive",
  "Finance & Accounting": "Finance Associate",
  "Cyber Security": "Cyber Security Analyst",
  "Cloud & DevOps": "DevOps Engineer",
  "Product Management": "Associate Product Manager",
};

// A stack name stands for the skills in it, so "MERN" counts as having React.
const STACK_SKILLS = {
  mern: ["MongoDB", "Express", "React", "Node.js", "JavaScript"],
  mean: ["MongoDB", "Express", "Angular", "Node.js", "JavaScript"],
  mevn: ["MongoDB", "Express", "Vue", "Node.js", "JavaScript"],
  lamp: ["Linux", "Apache", "MySQL", "PHP"],
};

const MAX_TECH_STACK = 8;
const MAX_TARGET_ROLES = 5;
const PROFILE_SKILL_CATEGORIES = ["programmingLanguages", "frameworks", "databases", "tools", "technical", "softSkills"];

// Words that say how senior a role is, not what it is: "Full Stack Developer" and
// "Full Stack Engineer" are the same role.
const GENERIC_ROLE_WORDS = new Set([
  "developer", "developers", "engineer", "engineers", "dev", "sde", "intern", "internship", "trainee",
  "junior", "jr", "associate", "fresher", "graduate", "entry", "level",
]);

const clean = (value, max = 100) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";

const compact = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9+#]/g, "");

/** "Full Stack Developer" -> "fullstack": the part of a role name that says what the role is. */
const roleCore = (role) => {
  const words = String(role || "").toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean);
  const core = words.filter((w) => !GENERIC_ROLE_WORDS.has(w)).join("");
  return core || words.join("");
};

/** The ROLE_SKILLS key for a role the fresher typed ("full stack" -> "Full Stack Developer"), or null. */
const findRoleKey = (role) => {
  const core = roleCore(role);
  if (!core) return null;
  return Object.keys(ROLE_SKILLS).find((key) => compact(key) === compact(role) || roleCore(key) === core) || null;
};

/** True when a job title is for the given target role, or a role close to it (ROLE_TITLE_WORDS). */
const titleMatchesRole = (title, role) => {
  const core = roleCore(role);
  if (!core) return false;
  const t = compact(title);
  if (t.includes(core)) return true;
  // Short words ("ai", "qa", "bi") only count as a whole word, so "qa" doesn't match "Aqua".
  const words = String(title || "").toLowerCase().split(/[^a-z0-9+#]+/);
  return (ROLE_TITLE_WORDS[findRoleKey(role)] || []).some((w) => (w.length <= 3 ? words.includes(w) : t.includes(w)));
};

/**
 * Normalised skills that say a job is for this fresher: every target role's skills plus the
 * tech stack (and what each stack stands for), without GENERIC_SKILLS.
 */
const roleSkillKeys = (targetRoles = [], techStack = []) => {
  const roleSkills = targetRoles.flatMap((role) => ROLE_SKILLS[findRoleKey(role)] || []);
  const keys = skillKeySet(roleSkills, techStack);
  for (const s of GENERIC_SKILLS) keys.delete(normalizeSkill(s));
  return keys;
};

/** Trimmed, de-duplicated (case-insensitive) list of non-empty strings. */
const uniqueStrings = (list, max = Infinity) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const value = clean(item, 50);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
};

/** The fresher's target roles, first one first. Profiles from before targetRoles have only targetRole. */
const targetRolesOf = (prefs = {}) =>
  prefs.targetRoles?.length ? uniqueStrings(prefs.targetRoles, MAX_TARGET_ROLES) : uniqueStrings([prefs.targetRole]);

/**
 * Only the known keys, trimmed; an unknown jobType becomes "". targetRole is always
 * targetRoles[0], whichever of the two was sent.
 */
const normalizePreferences = (input = {}) => {
  const out = {};
  if ("targetRoles" in input || "targetRole" in input) {
    const raw = "targetRoles" in input ? input.targetRoles : [input.targetRole];
    out.targetRoles = uniqueStrings(typeof raw === "string" ? raw.split(",") : raw, MAX_TARGET_ROLES);
    out.targetRole = out.targetRoles[0] || "";
  }
  if ("techStack" in input) {
    const raw = typeof input.techStack === "string" ? input.techStack.split(",") : input.techStack;
    out.techStack = uniqueStrings(raw, MAX_TECH_STACK);
  }
  if ("jobType" in input) {
    const type = JOB_TYPES.find((t) => t.toLowerCase() === clean(input.jobType).toLowerCase());
    out.jobType = type || "";
  }
  if ("location" in input) out.location = clean(input.location);
  return out;
};

/** Preferences from the signup "areas of interest": every interest that names a role is a target role. */
const interestsToPreferences = (interests = []) => {
  const roles = [];
  const techStack = [];
  for (const interest of uniqueStrings(interests)) {
    const role = INTEREST_ROLES[interest] || findRoleKey(interest);
    if (role) roles.push(role);
    else techStack.push(interest);
  }
  const targetRoles = uniqueStrings(roles, MAX_TARGET_ROLES);
  return { targetRole: targetRoles[0] || "", targetRoles, techStack: uniqueStrings(techStack, MAX_TECH_STACK) };
};

/** FresherProfile fields to create a new fresher with, from their signup interests. */
const signupPreferenceFields = (interests = []) => {
  const { targetRole, targetRoles, techStack } = interestsToPreferences(interests);
  return {
    preferences: { targetRole, targetRoles, techStack, jobType: "", location: "" },
    preferencesSyncedAt: new Date(),
    ...(targetRole ? { targetRole, targetRoles, jobPreferences: { preferredRoles: targetRoles } } : {}),
  };
};

const toPlain = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {});

/** Preferences read from the fields older code saved (targetRole, jobPreferences.*). */
const legacyPreferences = (profile) => {
  const p = toPlain(profile);
  const jp = p.jobPreferences || {};
  const workModes = jp.workMode || [];
  const targetRole = clean(p.targetRole) || clean(p.targetRoles?.[0]) || clean(jp.preferredRoles?.[0]);
  return {
    targetRole,
    targetRoles: targetRole ? uniqueStrings([targetRole, ...(p.targetRoles || [])], MAX_TARGET_ROLES) : [],
    jobType: (jp.employmentTypes || []).find((t) => JOB_TYPES.includes(t)) || "",
    location: clean(jp.preferredLocations?.[0]) || (workModes.includes("Remote") ? "Remote" : ""),
  };
};

/** `value` first, then the rest of `list` without it. Removes `previous` when value is empty. */
const withFirst = (list = [], value, previous) => {
  const rest = list.filter((item) => item && item !== value && item !== previous);
  return value ? [value, ...rest] : rest;
};

/** `values` first, then the rest of `list` without them or any of `previous`. */
const withAllFirst = (list = [], values = [], previous = []) => {
  const rest = list.filter((item) => item && !values.includes(item) && !previous.includes(item));
  return [...values, ...rest];
};

/** Copies profile.preferences onto the old fields so other features see the same values. */
const mirrorPreferencesToLegacy = (profile, previous = {}) => {
  const prefs = profile.preferences || {};
  const roles = targetRolesOf(toPlain(prefs));
  const previousRoles = targetRolesOf(previous);
  profile.targetRole = roles[0] || "";
  profile.targetRoles = withAllFirst(profile.targetRoles || [], roles, previousRoles);
  profile.jobPreferences = profile.jobPreferences || {};
  const jp = profile.jobPreferences;
  jp.preferredRoles = withAllFirst(jp.preferredRoles || [], roles, previousRoles);
  jp.employmentTypes = withFirst(jp.employmentTypes || [], prefs.jobType, previous.jobType);
  jp.preferredLocations = withFirst(jp.preferredLocations || [], prefs.location, previous.location);
  return profile;
};

/**
 * After the full profile editor saves the old fields, copy them into profile.preferences.
 * A job type or location chosen on the dashboard is kept while the saved lists still have it.
 */
const syncPreferencesFromLegacy = (profile) => {
  const legacy = legacyPreferences(profile);
  const current = toPlain(profile).preferences || {};
  const jp = toPlain(profile).jobPreferences || {};
  profile.preferences = {
    targetRole: legacy.targetRole,
    targetRoles: legacy.targetRoles,
    techStack: current.techStack || [],
    jobType: (jp.employmentTypes || []).includes(current.jobType) ? current.jobType : legacy.jobType,
    location: (jp.preferredLocations || []).includes(current.location) ? current.location : legacy.location,
  };
  return profile;
};

/**
 * One-time fill for a profile saved before `preferences` existed: each empty preference
 * comes from the old fields, then from the signup interests on the user. Returns true if
 * anything changed. Callers set preferencesSyncedAt and save.
 */
const backfillPreferences = (profile, user) => {
  const current = toPlain(profile).preferences || {};
  const legacy = legacyPreferences(profile);
  const fromInterests = interestsToPreferences(user?.interests || []);
  const currentRoles = targetRolesOf(current);
  const targetRoles = currentRoles.length
    ? currentRoles
    : legacy.targetRoles.length ? legacy.targetRoles : fromInterests.targetRoles;
  const next = {
    targetRole: targetRoles[0] || "",
    targetRoles,
    techStack: current.techStack?.length ? current.techStack : fromInterests.techStack,
    jobType: current.jobType || legacy.jobType,
    location: clean(current.location) || legacy.location,
  };
  const changed = JSON.stringify(next) !== JSON.stringify({
    targetRole: current.targetRole || "",
    targetRoles: current.targetRoles || [],
    techStack: current.techStack || [],
    jobType: current.jobType || "",
    location: current.location || "",
  });
  profile.preferences = next;
  return changed;
};

/**
 * backfillPreferences, then (when something was found) the same values on the old fields.
 * Marks the profile synced and returns the $set for saving it.
 */
const backfillPreferencesUpdate = (profile, user, now = new Date()) => {
  const changed = backfillPreferences(profile, user);
  if (changed) mirrorPreferencesToLegacy(profile);
  profile.preferencesSyncedAt = now;
  const set = { preferences: toPlain(profile).preferences, preferencesSyncedAt: now };
  if (changed) {
    const jp = toPlain(profile).jobPreferences || {};
    Object.assign(set, {
      targetRole: profile.targetRole,
      targetRoles: [...(profile.targetRoles || [])],
      "jobPreferences.preferredRoles": [...(jp.preferredRoles || [])],
      "jobPreferences.employmentTypes": [...(jp.employmentTypes || [])],
      "jobPreferences.preferredLocations": [...(jp.preferredLocations || [])],
    });
  }
  return { changed, set };
};

/**
 * Profiles saved while only one target role was kept: the role, then every other role in
 * the signup interests. Returns the $set to save, or null when there's nothing to fill
 * (no role, or targetRoles already saved, so this runs once).
 */
const targetRolesUpdate = (profile, user) => {
  const prefs = toPlain(profile).preferences || {};
  if (!clean(prefs.targetRole) || prefs.targetRoles?.length) return null;
  const roles = uniqueStrings([prefs.targetRole, ...interestsToPreferences(user?.interests || []).targetRoles], MAX_TARGET_ROLES);
  profile.preferences.targetRoles = roles;
  mirrorPreferencesToLegacy(profile, prefs);
  const jp = toPlain(profile).jobPreferences || {};
  return {
    "preferences.targetRoles": roles,
    targetRoles: [...(profile.targetRoles || [])],
    "jobPreferences.preferredRoles": [...(jp.preferredRoles || [])],
  };
};

/** All skill names on a fresher profile (categorised skills plus primarySkills), no duplicates. */
const profileSkills = (profile) => {
  const p = toPlain(profile);
  const names = [];
  for (const cat of PROFILE_SKILL_CATEGORIES) {
    for (const s of p.skills?.[cat] || []) names.push(typeof s === "string" ? s : s?.name);
  }
  return uniqueStrings([...names, ...(p.primarySkills || [])]);
};

/** Normalised skills the fresher has, counting each tech-stack item and the skills inside it. */
const skillKeySet = (skills = [], techStack = []) => {
  const keys = new Set();
  for (const s of [...skills, ...techStack]) {
    keys.add(normalizeSkill(s));
    for (const inner of STACK_SKILLS[compact(s)] || []) keys.add(normalizeSkill(inner));
  }
  keys.delete("");
  return keys;
};

const resumeUrlOf = (profile, user) => clean(toPlain(profile).resume?.resumeUrl, 2000) || clean(user?.resumeUrl, 2000);

const graduationYearOf = (profile) => {
  const education = toPlain(profile).education || [];
  const highest = education.find((e) => e.isHighest && e.graduationYear) || education.find((e) => e.graduationYear);
  return highest?.graduationYear || null;
};

// Checked in this order; the first missing one becomes the hint.
const COMPLETION_STEPS = [
  { field: "targetRole", hint: "Target role set karo", has: (c) => Boolean(c.preferences.targetRole) },
  { field: "techStack", hint: "Apna tech stack add karo", has: (c) => c.preferences.techStack?.length > 0 },
  { field: "jobType", hint: "Job type choose karo", has: (c) => Boolean(c.preferences.jobType) },
  { field: "location", hint: "Preferred location add karo", has: (c) => Boolean(c.preferences.location) },
  { field: "skills", hint: "Apni skills add karo", has: (c) => c.skills.length > 0 },
  { field: "graduationYear", hint: "Graduation year add karo", has: (c) => Boolean(c.graduationYear) },
  { field: "resumeUrl", hint: "Resume upload karo", has: (c) => Boolean(c.resumeUrl) },
];

/**
 * Banner profile strength: the share of COMPLETION_STEPS that are filled, plus a hint for
 * the first missing one ("Resume upload karo, 100% ho jayega").
 */
const profileStrength = ({ preferences = {}, skills = [], graduationYear = null, resumeUrl = "" }) => {
  const ctx = { preferences, skills, graduationYear, resumeUrl };
  const total = COMPLETION_STEPS.length;
  const missing = COMPLETION_STEPS.filter((step) => !step.has(ctx));
  const percent = Math.round(((total - missing.length) / total) * 100);
  if (missing.length === 0) return { percent, nextStep: null, hint: "" };
  const next = missing[0];
  const after = Math.round(((total - missing.length + 1) / total) * 100);
  const hint = missing.length === 1 ? `${next.hint}, 100% ho jayega` : `${next.hint}, ${after}% ho jayega`;
  return { percent, nextStep: next.field, hint };
};

/**
 * Share of the target role's skills the fresher has, 0-100. null when there is no target
 * role, or no skill list for it (status says which).
 */
const skillScoreFor = (targetRole, skillKeys) => {
  if (!targetRole) return { score: null, status: "no_role" };
  const key = findRoleKey(targetRole);
  if (!key) return { score: null, status: "unknown_role" };
  const required = ROLE_SKILLS[key];
  const have = required.filter((s) => skillKeys.has(normalizeSkill(s))).length;
  return { score: Math.round((have / required.length) * 100), status: "ok" };
};

module.exports = {
  JOB_TYPES,
  ROLE_SKILLS,
  INTEREST_ROLES,
  findRoleKey,
  titleMatchesRole,
  roleSkillKeys,
  targetRolesOf,
  targetRolesUpdate,
  normalizePreferences,
  interestsToPreferences,
  signupPreferenceFields,
  legacyPreferences,
  mirrorPreferencesToLegacy,
  syncPreferencesFromLegacy,
  backfillPreferences,
  backfillPreferencesUpdate,
  profileSkills,
  skillKeySet,
  resumeUrlOf,
  graduationYearOf,
  profileStrength,
  skillScoreFor,
};
