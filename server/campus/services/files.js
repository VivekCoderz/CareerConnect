const crypto = require("crypto");
const CampusFile = require("../models/CampusFile");

// Private storage for speaking recordings and camera snapshots (architecture section 7).
// Cloudinary "authenticated" files when Cloudinary is configured, otherwise MongoDB (local / QA).
// Files are only reachable through a link that expires after a few minutes.

const LINK_SECONDS = 5 * 60;

const cloudinaryReady = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const cloudinary = () => require("../../config/cloudinary").cloudinary;

const uploadToCloudinary = (buffer, { resourceType, folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary().uploader.upload_stream(
      { resource_type: resourceType, type: "authenticated", folder, public_id: crypto.randomUUID() },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

/** Saves an uploaded file for an attempt and returns the CampusFile document. */
const saveFile = async ({ institutionId, attemptId = null, memberId = null, kind, buffer, mimeType }) => {
  const base = { institutionId, attemptId, memberId, kind, mimeType, size: buffer.length };
  if (cloudinaryReady()) {
    // Cloudinary stores audio under "video" and PDFs under "raw".
    const resourceType = kind === "audio" ? "video" : kind === "resume" ? "raw" : "image";
    const result = await uploadToCloudinary(buffer, { resourceType, folder: `campus/${kind}` });
    return CampusFile.create({ ...base, storage: "cloudinary", cloudinaryId: result.public_id, cloudinaryResourceType: resourceType });
  }
  return CampusFile.create({ ...base, storage: "mongo", data: buffer });
};

const sign = (id, exp) => crypto.createHmac("sha256", process.env.JWT_SECRET || "campus").update(`${id}.${exp}`).digest("hex");

/** A link that works for a few minutes, for <audio> and <img> tags that cannot send a token. */
const fileLink = (file, apiBase) => {
  const exp = Math.floor(Date.now() / 1000) + LINK_SECONDS;
  if (file.storage === "cloudinary") {
    const format = { audio: "webm", resume: "pdf", photo: file.mimeType === "image/png" ? "png" : "jpg" }[file.kind] || "jpg";
    return cloudinary().utils.private_download_url(file.cloudinaryId, format, {
      resource_type: file.cloudinaryResourceType,
      type: "authenticated",
      expires_at: exp,
    });
  }
  return `${apiBase}/files/${file._id}/raw?exp=${exp}&sig=${sign(String(file._id), exp)}`;
};

/** GET /api/campus/files/:id/raw?exp=&sig= : serves a MongoDB-stored file to a valid link. */
const serveRaw = async (req, res, next) => {
  try {
    const exp = Number(req.query.exp);
    const sig = String(req.query.sig || "");
    const expected = sign(String(req.params.id), exp);
    const valid = Number.isFinite(exp) && exp >= Date.now() / 1000 && sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!valid) return res.status(403).json({ success: false, message: "This link has expired." });
    const file = await CampusFile.findById(req.params.id).select("+data");
    if (!file || file.storage !== "mongo" || !file.data) return res.status(404).end();
    res.set("Content-Type", file.mimeType);
    res.set("X-Content-Type-Options", "nosniff");
    if (file.kind === "resume") res.set("Content-Disposition", "inline; filename=\"resume.pdf\"");
    res.set("Cache-Control", "private, max-age=300");
    return res.send(file.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = { saveFile, fileLink, serveRaw, cloudinaryReady };
