// Back up the MongoDB documents a legacy resume migration may update.
// Usage from server/: node scripts/backup-resume-migration.js
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

const sources = [
  ["users", ["resumeUrl"]],
  ["resumes", ["resumeUrl"]],
  ["studentprofiles", ["resume.resumeUrl"]],
  ["fresherprofiles", ["resume.resumeUrl"]],
  ["professionalprofiles", ["resume.resumeUrl"]],
  ["applications", ["resumeUrl", "applicationData.resumeUrl"]],
];
const atPath = (doc, field) => field.split(".").reduce((value, key) => value?.[key], doc);

async function main() {
  const uri = process.env.MONGODB_URI;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name;
  if (!uri || !cloudName) throw new Error("MongoDB URI and Cloudinary cloud name are required");
  const prefix = `https://res.cloudinary.com/${cloudName}/raw/upload/`;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "careerconnect-resume-backup-"));
  fs.chmodSync(backupDir, 0o700);
  const existing = new Set((await mongoose.connection.db.listCollections().toArray()).map((entry) => entry.name));
  const manifest = { createdAt: new Date().toISOString(), collections: [] };

  for (const [collectionName, fields] of sources) {
    if (!existing.has(collectionName)) continue;
    const collection = mongoose.connection.db.collection(collectionName);
    const documents = new Map();
    for (const field of fields) {
      const cursor = collection.find({ [field]: { $type: "string" } }).batchSize(200);
      for await (const doc of cursor) {
        const url = atPath(doc, field);
        if (typeof url === "string" && url.startsWith(prefix) &&
            url.includes("/careerconnect/resumes/")) {
          documents.set(doc._id.toString(), doc);
        }
      }
    }
    if (documents.size === 0) continue;
    const filename = `${collectionName}.ejson.gz`;
    const contents = zlib.gzipSync(Buffer.from(EJSON.stringify([...documents.values()], { relaxed: false })));
    fs.writeFileSync(path.join(backupDir, filename), contents, { mode: 0o600, flag: "wx" });
    const restored = EJSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(backupDir, filename))).toString());
    if (restored.length !== documents.size) throw new Error("Backup verification failed");
    manifest.collections.push({
      name: collectionName,
      file: filename,
      documents: documents.size,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
    });
  }

  if (manifest.collections.length === 0) throw new Error("No legacy resume documents found; nothing backed up");
  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2),
    { mode: 0o600, flag: "wx" });
  console.log(`Verified private backup: ${backupDir}`);
  console.log(`Collections: ${manifest.collections.length}; documents: ${manifest.collections.reduce((sum, item) => sum + item.documents, 0)}`);
}

main().catch(() => {
  console.error("Resume backup failed; no migration should be run");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
