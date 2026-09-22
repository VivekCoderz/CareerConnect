const crypto = require("crypto");
const os = require("os");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, os.tmpdir()),
  filename: (_req, _file, callback) => callback(null, `careerconnect-${crypto.randomUUID()}`),
});

const allowed = new Map([
  [".pdf", ["application/pdf", "application/octet-stream"]],
  [".mp4", ["video/mp4", "application/octet-stream"]],
  [".m4v", ["video/x-m4v", "video/mp4", "application/octet-stream"]],
  [".mov", ["video/quicktime", "application/octet-stream"]],
  [".webm", ["video/webm", "application/octet-stream"]],
]);

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 20, parts: 21 },
  fileFilter: (_req, file, callback) => {
    const name = (file.originalname || "").toLowerCase();
    const extension = [...allowed.keys()].find((item) => name.endsWith(item));
    if (extension && allowed.get(extension).includes(file.mimetype)) return callback(null, true);
    const error = new Error("Only PDF, MP4, MOV, M4V, and WebM files are allowed");
    error.statusCode = 400;
    callback(error);
  },
});

module.exports = upload;
