// C09: the career programmes, read from the C05 data files (data/programs/*.json).
// The files only change with a deploy, so they are read and checked once, kept in memory,
// and every request is served from there. A bad file stops the server at start-up rather
// than showing a broken programme page.
const fs = require("fs");
const path = require("path");

const DEFAULT_DIR = path.join(__dirname, "../data/programs");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRACKS = ["data-ai", "software", "cloud-security"];
const LEVELS = ["foundation", "professional", "advanced"];
// C13/C14: the portal never shows trainers, batches or timings (shared on the call after
// an enquiry), so such a field in a data file is an error, not something to filter out.
const FORBIDDEN_KEY = /trainer|instructor|faculty|batch|timing|schedule|start_?date|class_?time/i;

// Card fields for the list; the detail adds the content sections.
const CARD_FIELDS = ["slug", "title", "track", "levels", "duration", "tools", "summary"];
const DETAIL_FIELDS = [...CARD_FIELDS, "syllabus", "projects", "mentorship", "internship", "certificate", "faq"];

const fail = (file, message) => {
  throw new Error(`Programme data ${file}: ${message}`);
};

const findForbiddenKey = (value) => {
  if (Array.isArray(value)) return value.map(findForbiddenKey).find(Boolean);
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) return key;
      const nested = findForbiddenKey(child);
      if (nested) return nested;
    }
  }
  return null;
};

const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");

const checkProgram = (program, file) => {
  if (!program || typeof program !== "object" || Array.isArray(program)) fail(file, "must be a JSON object");
  if (!SLUG.test(program.slug || "")) fail(file, "slug must be lowercase letters, digits and '-'");
  if (`${program.slug}.json` !== file) fail(file, `file name must be ${program.slug}.json`);
  if (typeof program.title !== "string" || !program.title.trim()) fail(file, "title is required");
  if (typeof program.published !== "boolean") fail(file, "published must be true or false");
  if (typeof program.order !== "number") fail(file, "order must be a number");
  if (!TRACKS.includes(program.track)) fail(file, `track must be one of ${TRACKS.join(", ")}`);
  if ("level" in program) fail(file, `"level" is now "levels", a list such as ["foundation", "professional", "advanced"]`);
  const { levels } = program;
  if (!Array.isArray(levels) || !levels.length || !levels.every((l) => LEVELS.includes(l)) || new Set(levels).size !== levels.length) {
    fail(file, `levels must be a list of one or more of ${LEVELS.join(", ")}, with no repeats`);
  }
  for (const key of ["duration", "summary", "mentorship", "internship", "certificate"]) {
    if (typeof program[key] !== "string") fail(file, `${key} must be a string`);
  }
  for (const key of ["tools", "projects"]) {
    if (!isStringList(program[key])) fail(file, `${key} must be a list of strings`);
  }
  if (!Array.isArray(program.syllabus) || !program.syllabus.every((m) => m && typeof m.title === "string" && isStringList(m.topics))) {
    fail(file, "syllabus must be a list of { title, topics: [] }");
  }
  if (!Array.isArray(program.faq) || !program.faq.every((q) => q && typeof q.question === "string" && typeof q.answer === "string")) {
    fail(file, "faq must be a list of { question, answer }");
  }
  const forbidden = findForbiddenKey(program);
  if (forbidden) fail(file, `"${forbidden}" is not allowed: trainers, batches and timings are shared on the call, never on the portal`);
};

const pick = (program, fields) => Object.fromEntries(fields.map((field) => [field, program[field]]));

const deepFreeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

/** Reads and checks every <slug>.json in dir. Throws on the first bad file. */
const loadPrograms = (dir = DEFAULT_DIR) => {
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  const programs = files.map((file) => {
    let program;
    try {
      program = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (err) {
      fail(file, `is not valid JSON (${err.message})`);
    }
    checkProgram(program, file);
    return program;
  });

  // Levels always come out Foundation -> Advanced, whatever order the file lists them in.
  programs.forEach((program) => {
    program.levels = LEVELS.filter((level) => program.levels.includes(level));
  });

  const published = programs
    .filter((program) => program.published)
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  return deepFreeze({
    list: published.map((program) => pick(program, CARD_FIELDS)),
    bySlug: new Map(published.map((program) => [program.slug, pick(program, DETAIL_FIELDS)])),
  });
};

let catalog = loadPrograms();

/** Re-reads the files (tests point this at a fixture folder; no argument = the real data). */
const reloadPrograms = (dir = DEFAULT_DIR) => {
  catalog = loadPrograms(dir);
};

/** Published programmes, card fields only, in list order. */
const listPrograms = () => catalog.list;

/** The full published programme, or null for an unknown or unpublished slug. */
const findProgram = (slug) => catalog.bySlug.get(slug) || null;

module.exports = { loadPrograms, reloadPrograms, listPrograms, findProgram, CARD_FIELDS, DETAIL_FIELDS };
