// Read-only production verification after migrating public resumes.
require("dotenv").config({ quiet: true });
const axios = require("axios");
const mongoose = require("mongoose");
const { cloudinary } = require("../config/cloudinary");
const ResumeAsset = require("../models/ResumeAsset");

const sourceFields = [
  ["users", "resumeUrl"], ["resumes", "resumeUrl"],
  ["studentprofiles", "resume.resumeUrl"],
  ["fresherprofiles", "resume.resumeUrl"],
  ["professionalprofiles", "resume.resumeUrl"],
  ["applications", "resumeUrl"],
  ["applications", "applicationData.resumeUrl"],
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = new Set((await mongoose.connection.db.listCollections().toArray()).map((item) => item.name));
  let legacyReferences = 0;
  for (const [collectionName, field] of sourceFields) {
    if (!existing.has(collectionName)) continue;
    legacyReferences += await mongoose.connection.db.collection(collectionName).countDocuments({
      [field]: /\/raw\/upload\/.*careerconnect\/resumes\//,
    });
  }

  const assets = await ResumeAsset.find({}).select("publicId url").lean();
  let authenticated = 0;
  let missing = 0;
  for (const asset of assets) {
    try {
      await cloudinary.api.resource(asset.publicId, { resource_type: "raw", type: "authenticated" });
      authenticated += 1;
    } catch {
      missing += 1;
    }
  }

  let cursor;
  let remainingPublicAssets = 0;
  do {
    const page = await cloudinary.api.resources({
      resource_type: "raw", type: "upload", prefix: "careerconnect/resumes",
      max_results: 500, ...(cursor ? { next_cursor: cursor } : {}),
    });
    remainingPublicAssets += page.resources.length;
    cursor = page.next_cursor;
  } while (cursor);

  let oldUrlStatus = "not checked";
  const sample = assets.find((asset) => asset.url.includes("/raw/authenticated/"));
  if (sample) {
    const oldUrl = sample.url.replace("/raw/authenticated/", "/raw/upload/");
    try {
      const response = await axios.head(oldUrl, {
        timeout: 7000, maxRedirects: 0, validateStatus: () => true,
      });
      oldUrlStatus = String(response.status);
    } catch {
      oldUrlStatus = "network error";
    }
  }

  console.log(`Legacy database references: ${legacyReferences}`);
  console.log(`Authenticated recorded assets: ${authenticated}; missing: ${missing}`);
  console.log(`Remaining public Cloudinary resume assets: ${remainingPublicAssets}`);
  console.log(`Sample old public URL HEAD status: ${oldUrlStatus}`);
  if (legacyReferences || missing || remainingPublicAssets || oldUrlStatus === "200") process.exitCode = 1;
}

main().catch(() => {
  console.error("Resume privacy verification failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
