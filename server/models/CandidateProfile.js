// One collection (candidateprofiles) for every candidate profile, one document per user.
//
// StudentProfile, FresherProfile and ProfessionalProfile are discriminators of this model:
// each keeps its own schema (so `careerGoal`, `experience` and the other fields whose type
// differs between them keep their old names and shapes), and Mongoose adds
// `candidateType: "student" | "fresher" | "professional"` to every query and new document.
// API responses keep their old shape; they only gain `candidateType`.
//
// The old studentprofiles / fresherprofiles / professionalprofiles collections are no longer
// used by the app. scripts/migrate-candidate-profiles.js copies them here and never writes
// to them; they stay as they are until after release (see docs/candidate-profile-migration.md).

const mongoose = require("mongoose");

const CANDIDATE_TYPES = ["student", "fresher", "professional"];
const ARCHIVE_COLLECTION = "candidateprofile_archive";

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },

    // Set by the migration script only: where this document was copied from.
    migratedFrom: {
      collection: String,
      sourceId: mongoose.Schema.Types.ObjectId,
      sourceUpdatedAt: Date,
      migratedAt: Date,
    },
  },
  {
    timestamps: true,
    collection: "candidateprofiles",
    discriminatorKey: "candidateType",
  }
);

// Only indexes a query uses: userId (above, unique), counts per type, and the resume-file
// reference check in services/resumeAssetCleanup.js.
candidateProfileSchema.index({ candidateType: 1 });
candidateProfileSchema.index({ "resume.resumeUrl": 1 });

const CandidateProfile = mongoose.model("CandidateProfile", candidateProfileSchema);

// A user has one profile. When a profile of a new type is created for a user whose
// userType changed (for example through /select-role), their profile of the old type is
// moved to candidateprofile_archive instead of blocking the new one. Before the single
// collection, that old profile stayed in its own collection and was no longer read.
const archiveOtherTypeProfile = async (userId, candidateType) => {
  if (!userId) return;
  const other = await CandidateProfile.collection.findOne({ userId, candidateType: { $ne: candidateType } });
  if (!other) return;
  await mongoose.connection.collection(ARCHIVE_COLLECTION).insertOne({
    userId,
    candidateType: other.candidateType,
    reason: "type-changed",
    newCandidateType: candidateType,
    archivedAt: new Date(),
    doc: other,
  });
  await CandidateProfile.collection.deleteOne({ _id: other._id });
};

// userId as an ObjectId, or null for anything else (missing, or a query like { $in: [...] }).
const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return typeof value === "string" && mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
};

/**
 * Registers one candidate type as a discriminator of CandidateProfile.
 * @param {string} modelName - the old model name (StudentProfile, ...), kept so refs and
 *   mongoose.model(name) keep working
 * @param {mongoose.Schema} schema - that type's schema, without userId (the base has it)
 * @param {string} candidateType - student | fresher | professional
 */
const defineCandidateType = (modelName, schema, candidateType) => {
  schema.pre("save", async function () {
    if (this.isNew) await archiveOtherTypeProfile(toObjectId(this.userId), candidateType);
  });
  for (const op of ["findOneAndUpdate", "updateOne", "updateMany"]) {
    schema.pre(op, async function () {
      if (!this.getOptions()?.upsert) return;
      await archiveOtherTypeProfile(toObjectId(this.getFilter()?.userId), candidateType);
    });
  }
  return CandidateProfile.discriminator(modelName, schema, candidateType);
};

module.exports = CandidateProfile;
module.exports.CANDIDATE_TYPES = CANDIDATE_TYPES;
module.exports.ARCHIVE_COLLECTION = ARCHIVE_COLLECTION;
module.exports.defineCandidateType = defineCandidateType;
