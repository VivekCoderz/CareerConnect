/*
 * One-time rollout for resumes uploaded before authenticated Cloudinary delivery.
 * Dry run: node scripts/migrate-public-resumes.js
 * Apply:   node scripts/migrate-public-resumes.js --apply
 * Run against the intended environment's MongoDB and Cloudinary credentials.
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const { cloudinary } = require("../config/cloudinary");
const ResumeAsset = require("../models/ResumeAsset");

const sources = [
  ["users", "resumeUrl", "_id"],
  ["resumes", "resumeUrl", "user"],
  ["studentprofiles", "resume.resumeUrl", "userId"],
  ["fresherprofiles", "resume.resumeUrl", "userId"],
  ["professionalprofiles", "resume.resumeUrl", "userId"],
  ["applications", "resumeUrl", "candidateId"],
  ["applications", "applicationData.resumeUrl", "candidateId"],
];

function parseLegacyUrl(value, cloudName) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.search) return null;
    const prefix = `/${cloudName}/raw/upload/`;
    if (!url.pathname.startsWith(prefix)) return null;
    const path = url.pathname.slice(prefix.length).replace(/^v\d+\//, "");
    const publicId = decodeURIComponent(path);
    if (!publicId.startsWith("careerconnect/resumes/") || publicId.length > 255) return null;
    return { publicId };
  } catch {
    return null;
  }
}

const atPath = (doc, path) => path.split(".").reduce((value, key) => value?.[key], doc);

async function main() {
  const apply = process.argv.includes("--apply");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name;
  if (!process.env.MONGODB_URI || !cloudName || !cloudinary.config().api_secret) {
    throw new Error("MONGODB_URI and Cloudinary credentials are required");
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = new Set((await mongoose.connection.db.listCollections().toArray()).map((entry) => entry.name));
  const assets = new Map();

  for (const [collectionName, field, ownerField] of sources) {
    if (!existing.has(collectionName)) continue;
    const cursor = mongoose.connection.db.collection(collectionName)
      .find({ [field]: { $type: "string" } }, { projection: { [field]: 1, [ownerField]: 1 } })
      .batchSize(200);
    for await (const doc of cursor) {
      const url = atPath(doc, field);
      const parsed = parseLegacyUrl(url, cloudName);
      const owner = doc[ownerField];
      if (!parsed || !owner) continue;
      const entry = assets.get(url) || { publicId: parsed.publicId, owners: new Set() };
      entry.owners.add(owner.toString());
      assets.set(url, entry);
    }
  }

  const ambiguous = [...assets.values()].filter((entry) => entry.owners.size !== 1).length;
  console.log(`Legacy resume references: ${assets.size}; ambiguous ownership: ${ambiguous}; mode: ${apply ? "apply" : "dry-run"}`);
  if (process.argv.includes("--verify-cloudinary")) {
    const counts = { public: 0, alreadyAuthenticated: 0, missing: 0 };
    for (const entry of assets.values()) {
      try {
        await cloudinary.api.resource(entry.publicId, { resource_type: "raw", type: "upload" });
        counts.public += 1;
      } catch {
        try {
          await cloudinary.api.resource(entry.publicId, { resource_type: "raw", type: "authenticated" });
          counts.alreadyAuthenticated += 1;
        } catch {
          counts.missing += 1;
        }
      }
    }
    console.log(`Cloudinary assets: public ${counts.public}; already authenticated ${counts.alreadyAuthenticated}; missing ${counts.missing}`);
    if (counts.missing) process.exitCode = 1;
  }
  if (!apply) return;

  let migrated = 0;
  let failed = 0;
  for (const [oldUrl, entry] of assets) {
    if (entry.owners.size !== 1) continue;
    try {
      let result;
      try {
        result = await cloudinary.uploader.rename(entry.publicId, entry.publicId, {
          resource_type: "raw", type: "upload", to_type: "authenticated",
          overwrite: false, invalidate: true,
        });
      } catch (renameError) {
        // A previous run may already have changed delivery type before DB updates.
        result = await cloudinary.api.resource(entry.publicId, {
          resource_type: "raw", type: "authenticated",
        });
      }
      const newUrl = result.secure_url || oldUrl.replace("/raw/upload/", "/raw/authenticated/");
      if (!newUrl.includes("/raw/authenticated/")) throw new Error("Cloudinary did not return an authenticated URL");

      await ResumeAsset.updateOne(
        { publicId: entry.publicId },
        { $setOnInsert: { user: [...entry.owners][0], publicId: entry.publicId, url: newUrl } },
        { upsert: true },
      );
      for (const [collectionName, field] of sources) {
        if (!existing.has(collectionName)) continue;
        await mongoose.connection.db.collection(collectionName).updateMany(
          { [field]: oldUrl }, { $set: { [field]: newUrl } },
        );
      }
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Resume migration item failed: ${error.message}`);
    }
  }
  console.log(`Migrated: ${migrated}; failed: ${failed}; skipped ambiguous: ${ambiguous}`);
  if (failed || ambiguous) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Resume migration aborted: ${error.message}`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
