// Replaces personal data in a restored copy of the production database, for staging (H02).
// Schema-agnostic on purpose: every string in every collection is checked for email addresses,
// Indian mobile numbers and the names of real users, so a new model or field is still covered.
// Known personal fields (photos, resumes, dates of birth, tokens, IPs) are blanked by key.
// See docs/staging.md.
const crypto = require("crypto");

const FAKE_EMAIL_DOMAIN = "staging.invalid";
const FAKE_PHONE_PREFIX = "600";

// Ephemeral or secret collections: emptied, not scrubbed.
const EMPTIED_COLLECTIONS = ["sessions", "pendingotps", "otpratelimits", "emailusages", "resumeassets"];

// Collections whose documents describe one person; their top-level name fields are replaced.
const PERSON_COLLECTIONS = [
  "users", "studentprofiles", "fresherprofiles", "professionalprofiles", "employees",
  "teammembers", "applications", "resumes", "supporttickets",
];
const NAME_KEYS = ["fullName", "firstName", "lastName", "name", "studentName", "candidateName"];

// Any key, any depth: blanked ("") or removed.
const BLANK_KEYS = new Set([
  "profileimage", "avatar", "photo", "photourl", "resumeurl", "resume", "resumename", "portfolio",
  "portfoliourl", "github", "githuburl", "linkedin", "linkedinurl", "twitter", "address", "street",
  "addressline1", "addressline2", "pincode", "useragent", "signature",
]);
const REMOVED_KEYS = new Set([
  "password", "dateofbirth", "dob", "firebaseuid", "googleid", "invitationtoken", "emailotp",
  "otphash", "resetpasswordtoken", "resetpasswordexpire",
]);

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Ten digits in a row only, so salary ranges like "60000-90000" are left alone.
const PHONE_PATTERN = /(?<![\dA-Za-z])(?:\+?91[\s-]?)?[6-9]\d{9}(?![\dA-Za-z])/g;
// Name words are only replaced in text with a space in it, never in one-word values such as
// enum states ("active", "student"), which a real user's name could happen to contain.
const isFreeText = (text) => /\s/.test(text.trim());
// Words that appear in account names but are not personal; never replaced.
const COMMON_WORDS = new Set(["admin", "administrator", "user", "test", "team", "company", "manager", "recruiter", "the", "and"]);

const shortHash = (value, length) =>
  crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex").slice(0, length);

const isPlainObject = (value) => value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;

const fakeEmail = (email) =>
  email.toLowerCase().endsWith(`@${FAKE_EMAIL_DOMAIN}`) ? email : `user-${shortHash(email, 12)}@${FAKE_EMAIL_DOMAIN}`;

const fakeName = (name) => `Test User ${shortHash(name, 6)}`;

const nameTokens = (value) =>
  String(value || "").split(/[^\p{L}]+/u).filter((t) => t.length >= 3 && !COMMON_WORDS.has(t.toLowerCase()));

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One scrubber per run: the same email or phone always maps to the same fake one. */
const createScrubber = (tokens = []) => {
  const phones = new Map();
  const unique = [...new Set(tokens.map((t) => t.toLowerCase()))].sort((a, b) => b.length - a.length);
  const namePattern = unique.length ? new RegExp(`(?<![\\p{L}])(?:${unique.map(escapeRegex).join("|")})(?![\\p{L}])`, "giu") : null;

  const fakePhone = (phone) => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.startsWith(FAKE_PHONE_PREFIX)) return digits;
    if (!phones.has(digits)) phones.set(digits, `${FAKE_PHONE_PREFIX}${String(phones.size + 1).padStart(7, "0")}`);
    return phones.get(digits);
  };

  const scrubString = (text) => {
    let out = text.replace(EMAIL_PATTERN, fakeEmail).replace(PHONE_PATTERN, fakePhone);
    if (namePattern && isFreeText(out)) out = out.replace(namePattern, "Test");
    return out;
  };

  const scrubValue = (value) => {
    if (typeof value === "string") return scrubString(value);
    if (Array.isArray(value)) return value.map(scrubValue);
    if (!isPlainObject(value)) return value; // ObjectId, Date, numbers, BSON types
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (REMOVED_KEYS.has(lower)) continue;
      out[key] = BLANK_KEYS.has(lower) && (typeof inner === "string" || inner === null) ? "" : scrubValue(inner);
    }
    return out;
  };

  /** Scrubs one document; person collections also get fake top-level names and usernames. */
  const scrubDocument = (collectionName, doc) => {
    const out = scrubValue(doc);
    if (PERSON_COLLECTIONS.includes(collectionName)) {
      for (const key of NAME_KEYS) {
        if (typeof doc[key] === "string" && doc[key].trim()) {
          out[key] = key === "firstName" ? "Test" : key === "lastName" ? `User ${shortHash(doc[key], 6)}` : fakeName(doc[key]);
        }
      }
      if (collectionName === "users" && typeof doc.username === "string") out.username = `user_${shortHash(doc.username, 12)}`;
    }
    if (collectionName === "users" && "password" in doc) out.hasPassword = false;
    return out;
  };

  return { scrubDocument, scrubString };
};

/** Real users' name words, read before scrubbing so they can be replaced wherever they appear. */
const collectNameTokens = async (db) => {
  const tokens = new Set();
  const names = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names.filter((c) => PERSON_COLLECTIONS.includes(c.name))) {
    const projection = Object.fromEntries(NAME_KEYS.map((k) => [k, 1]));
    for await (const doc of db.collection(name).find({}, { projection })) {
      NAME_KEYS.forEach((key) => nameTokens(doc[key]).forEach((t) => tokens.add(t)));
    }
  }
  return [...tokens];
};

const userCollections = async (db) =>
  (await db.listCollections({ type: "collection" }, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."));

/** Scrubs every collection in place. Returns { collection: documentsChanged }. */
const scrubDatabase = async (db, { log = () => {} } = {}) => {
  const tokens = await collectNameTokens(db);
  const { scrubDocument } = createScrubber(tokens);
  const changed = {};
  for (const name of await userCollections(db)) {
    const collection = db.collection(name);
    if (EMPTIED_COLLECTIONS.includes(name) || name.endsWith(".chunks")) {
      changed[name] = (await collection.deleteMany({})).deletedCount;
      log(`${name}: emptied (${changed[name]})`);
      continue;
    }
    let ops = [];
    changed[name] = 0;
    const flush = async () => {
      if (ops.length) await collection.bulkWrite(ops, { ordered: false });
      ops = [];
    };
    for await (const doc of collection.find({})) {
      const scrubbed = scrubDocument(name, doc);
      if (JSON.stringify(scrubbed) === JSON.stringify(doc)) continue;
      ops.push({ replaceOne: { filter: { _id: doc._id }, replacement: scrubbed } });
      changed[name] += 1;
      if (ops.length >= 500) await flush();
    }
    await flush();
    log(`${name}: ${changed[name]} documents scrubbed`);
  }
  return { changed, tokens };
};

/**
 * Looks for personal data left after scrubbing. `tokens` are the name words read before the
 * scrub (empty when only verifying). Returns { collection: { emails, phones, names } }.
 */
const findLeftovers = async (db, tokens = []) => {
  const lowerTokens = new Set(tokens.map((t) => t.toLowerCase()));
  const leftovers = {};
  const visit = (value, counts) => {
    if (typeof value === "string") {
      counts.emails += (value.match(EMAIL_PATTERN) || []).filter((e) => !e.toLowerCase().endsWith(`@${FAKE_EMAIL_DOMAIN}`)).length;
      counts.phones += (value.match(PHONE_PATTERN) || []).filter((p) => !p.replace(/\D/g, "").slice(-10).startsWith(FAKE_PHONE_PREFIX)).length;
      if (lowerTokens.size && isFreeText(value)) counts.names += nameTokens(value).filter((t) => lowerTokens.has(t.toLowerCase())).length;
    } else if (Array.isArray(value)) value.forEach((v) => visit(v, counts));
    else if (isPlainObject(value)) Object.values(value).forEach((v) => visit(v, counts));
  };
  for (const name of await userCollections(db)) {
    const counts = { emails: 0, phones: 0, names: 0 };
    for await (const doc of db.collection(name).find({})) visit(doc, counts);
    if (counts.emails || counts.phones || counts.names) leftovers[name] = counts;
  }
  return leftovers;
};

module.exports = {
  FAKE_EMAIL_DOMAIN,
  FAKE_PHONE_PREFIX,
  createScrubber,
  scrubDatabase,
  findLeftovers,
};
