const PlatformSetting = require("../models/PlatformSetting");

// Platform settings live in a single PlatformSetting document. Reads are cached
// briefly because some checks (e.g. maintenance mode) run on every write request.
const CACHE_TTL_MS = 15 * 1000;
const EDITABLE_FIELDS = Object.keys(PlatformSetting.schema.paths).filter(
  (path) => !["_id", "__v", "createdAt", "updatedAt"].includes(path)
);
// Always read and write the same (oldest) document.
const SINGLETON_SORT = { createdAt: 1, _id: 1 };

let cache = null;

const schemaDefaults = () => {
  const { _id, ...defaults } = new PlatformSetting().toObject();
  return defaults;
};

const pickSettings = (doc) =>
  Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, doc[field]]));

/**
 * Returns the platform settings, falling back to schema defaults when no
 * document exists or the database cannot be read.
 */
async function getPlatformSettings({ fresh = false } = {}) {
  if (!fresh && cache && cache.expiresAt > Date.now()) return cache.value;
  // Don't wait on Mongoose command buffering while the database is not connected.
  if (PlatformSetting.db.readyState !== 1) return pickSettings(schemaDefaults());

  let value;
  try {
    const doc = await PlatformSetting.findOne().sort(SINGLETON_SORT).lean();
    value = pickSettings({ ...schemaDefaults(), ...(doc || {}) });
  } catch (err) {
    console.warn("Platform settings unavailable, using defaults:", err.message);
    return pickSettings(schemaDefaults());
  }

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/**
 * Returns an error message when a known setting has the wrong type, otherwise null.
 */
function validateSettingsUpdate(updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) return "Settings must be an object";
  for (const [key, value] of Object.entries(updates)) {
    if (!EDITABLE_FIELDS.includes(key)) continue;
    const expected = PlatformSetting.schema.path(key).instance.toLowerCase();
    if (typeof value !== expected) return `${key} must be a ${expected}`;
  }
  return null;
}

/**
 * Applies known setting fields from `updates` (unknown keys are ignored) and
 * returns the saved settings. Call validateSettingsUpdate first.
 */
async function updatePlatformSettings(updates = {}) {
  const $set = Object.fromEntries(
    Object.entries(updates || {}).filter(([key]) => EDITABLE_FIELDS.includes(key))
  );

  const doc = await PlatformSetting.findOneAndUpdate({}, { $set }, {
    upsert: true,
    new: true,
    sort: SINGLETON_SORT,
    runValidators: true,
    setDefaultsOnInsert: true,
  }).lean();

  clearPlatformSettingsCache();
  return pickSettings({ ...schemaDefaults(), ...doc });
}

function clearPlatformSettingsCache() {
  cache = null;
}

module.exports = {
  getPlatformSettings,
  updatePlatformSettings,
  clearPlatformSettingsCache,
  validateSettingsUpdate,
  EDITABLE_SETTINGS: EDITABLE_FIELDS,
};
