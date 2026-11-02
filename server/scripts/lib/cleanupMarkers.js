/**
 * Fields the one-time cleanup scripts write on the profiles they decide about, so a re-run
 * never decides again from content that a script itself changed.
 *
 * They are not in the schemas on purpose: strict mode strips unknown keys from profile
 * updates, so users can't set or clear them. Writes pass `strict: false`.
 *
 * - sampleDataCleanedAt:   a cleanup script cleared sample data or placeholders here.
 * - sampleDataLeftAloneAt: a cleanup script found sample data with other edits and left
 *                          the profile alone. It stays left alone on every later run.
 * - allowContactMigratedAt: migrate-allowcontact-false switched allowContact to false. The
 *                          old value was not the user's choice, but the new one isn't
 *                          either, so the sample-data cleanup must not read it as "default".
 */
const SAMPLE_DATA_CLEANED = "sampleDataCleanedAt";
const SAMPLE_DATA_LEFT_ALONE = "sampleDataLeftAloneAt";
const ALLOW_CONTACT_MIGRATED = "allowContactMigratedAt";

// Profiles no sample-data cleanup run has decided about yet.
const NOT_YET_DECIDED = {
  [SAMPLE_DATA_CLEANED]: { $exists: false },
  [SAMPLE_DATA_LEFT_ALONE]: { $exists: false },
};
const ALREADY_DECIDED = {
  $or: [{ [SAMPLE_DATA_CLEANED]: { $exists: true } }, { [SAMPLE_DATA_LEFT_ALONE]: { $exists: true } }],
};

// Marks profiles as left alone without touching updatedAt: nothing the user sees changed.
const markLeftAlone = async (Model, ids, now) => {
  if (ids.length === 0) return 0;
  const result = await Model.updateMany(
    { _id: { $in: ids }, ...NOT_YET_DECIDED },
    { $set: { [SAMPLE_DATA_LEFT_ALONE]: now } },
    { strict: false, timestamps: false }
  );
  return result.modifiedCount;
};

module.exports = {
  SAMPLE_DATA_CLEANED,
  SAMPLE_DATA_LEFT_ALONE,
  ALLOW_CONTACT_MIGRATED,
  NOT_YET_DECIDED,
  ALREADY_DECIDED,
  markLeftAlone,
};
