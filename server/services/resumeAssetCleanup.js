// Deletes a user's resume files from Cloudinary once nothing references them, so
// re-saving, replacing or deleting resumes doesn't fill the free Cloudinary quota.
// A file is kept while any resume, application, user or profile still points to it
// (employers must still be able to open the resume a candidate applied with).

const ResumeAsset = require("../models/ResumeAsset");
const Resume = require("../models/Resume");
const Application = require("../models/Application");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const { cloudinary } = require("../config/cloudinary");

// Uploads are saved before the record that points to them, so recent files are
// never treated as orphans.
const MIN_ASSET_AGE_MS = 10 * 60 * 1000;

const isResumeUrlReferenced = async (url) => {
  const references = await Promise.all([
    Resume.exists({ resumeUrl: url }),
    Application.exists({ resumeUrl: url }),
    User.exists({ resumeUrl: url }),
    StudentProfile.exists({ "resume.resumeUrl": url }),
    FresherProfile.exists({ "resume.resumeUrl": url }),
    ProfessionalProfile.exists({ "resume.resumeUrl": url }),
  ]);
  return references.some(Boolean);
};

const deleteResumeAsset = async (asset) => {
  await cloudinary.uploader.destroy(asset.publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
  await ResumeAsset.deleteOne({ _id: asset._id });
};

/**
 * Deletes the user's unreferenced resume files. Returns how many were deleted.
 */
const cleanupOrphanResumeAssets = async (userId, { minAgeMs = MIN_ASSET_AGE_MS } = {}) => {
  const cutoff = new Date(Date.now() - minAgeMs);
  const assets = await ResumeAsset.find({ user: userId, createdAt: { $lte: cutoff } }).lean();
  let deleted = 0;
  for (const asset of assets) {
    if (await isResumeUrlReferenced(asset.url)) continue;
    await deleteResumeAsset(asset);
    deleted += 1;
  }
  return deleted;
};

// One pending cleanup per user, run after the response so requests never wait on Cloudinary.
const pendingUsers = new Set();

const scheduleResumeCleanup = (userId) => {
  const key = String(userId || "");
  if (!key || pendingUsers.has(key)) return;
  pendingUsers.add(key);
  setImmediate(async () => {
    try {
      await cleanupOrphanResumeAssets(key);
    } catch (err) {
      console.warn(`Resume file cleanup failed for user ${key}: ${err.message}`);
    } finally {
      pendingUsers.delete(key);
    }
  });
};

module.exports = { cleanupOrphanResumeAssets, scheduleResumeCleanup, isResumeUrlReferenced, deleteResumeAsset };
