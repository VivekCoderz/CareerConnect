// Read-only audit of public Cloudinary resume assets and database references.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const { cloudinary } = require("../config/cloudinary");

function containsAsset(value, publicId, depth = 0) {
  if (depth > 12 || value == null) return false;
  if (typeof value === "string") return value.includes(publicId);
  if (typeof value !== "object" || Buffer.isBuffer(value) || value instanceof Date) return false;
  if (Array.isArray(value)) return value.some((item) => containsAsset(item, publicId, depth + 1));
  return Object.values(value).some((item) => containsAsset(item, publicId, depth + 1));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const assets = [];
  let cursor;
  do {
    const page = await cloudinary.api.resources({
      resource_type: "raw", type: "upload", prefix: "careerconnect/resumes",
      max_results: 500, ...(cursor ? { next_cursor: cursor } : {}),
    });
    assets.push(...page.resources.map((item) => item.public_id));
    cursor = page.next_cursor;
  } while (cursor);

  const matchCollections = new Map();
  const matchedAssets = new Set();
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    const perCollection = new Set();
    const documents = mongoose.connection.db.collection(name).find({}).batchSize(100);
    for await (const doc of documents) {
      for (const publicId of assets) {
        if (containsAsset(doc, publicId)) {
          perCollection.add(publicId);
          matchedAssets.add(publicId);
        }
      }
    }
    if (perCollection.size) matchCollections.set(name, perCollection.size);
  }
  console.log(`Public resume assets: ${assets.length}; referenced in MongoDB: ${matchedAssets.size}; unreferenced: ${assets.length - matchedAssets.size}`);
  for (const [name, count] of matchCollections) console.log(`${name}: ${count} referenced assets`);
  if (process.argv.includes("--apply")) {
    const unreferenced = assets.filter((id) => !matchedAssets.has(id));
    const manifestDir = fs.mkdtempSync(path.join(os.tmpdir(), "careerconnect-orphan-resumes-"));
    fs.chmodSync(manifestDir, 0o700);
    fs.writeFileSync(path.join(manifestDir, "public-ids.json"), JSON.stringify(unreferenced),
      { mode: 0o600, flag: "wx" });
    let restricted = 0;
    let failed = 0;
    for (const id of unreferenced) {
      try {
        await cloudinary.uploader.rename(id, id, {
          resource_type: "raw", type: "upload", to_type: "authenticated",
          overwrite: false, invalidate: true,
        });
        restricted += 1;
      } catch {
        failed += 1;
      }
    }
    console.log(`Unreferenced assets restricted: ${restricted}; failed: ${failed}; private manifest: ${manifestDir}`);
    if (failed || matchedAssets.size) process.exitCode = 1;
  }
}

main().catch(() => {
  console.error("Public resume asset audit failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
