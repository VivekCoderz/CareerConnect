const multer = require("multer");

// Use memory storage so req.file.buffer is available for direct Cloudinary streaming.
// This avoids saving files locally and then needing to serve them from the Express server,
// which caused black-screen videos (wrong port) and PDF 401 errors (local paths not Cloudinary).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB
  },
});

module.exports = upload;