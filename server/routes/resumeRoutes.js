const express = require("express");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const { isResumeFile } = require("../utils/fileSignatures");
const { getResumeDownload } = require("../controllers/resumeAccessController");
const {
  generateResumeHandler,
  updateResumeHandler,
  getMyResume,
  getAllResumes,
  saveFinalResume,
  getResumeById,
  setPrimaryResume,
  deleteResume,
  saveManualEdit,
  uploadResumeHandler,
  uploadAndParseResumeHandler,
  getProfileForResume,
  parseResumeHandler,
  confirmParsedProfileHandler,
  analyzeATSResumeHandler,
  tailorResumeHandler,
  getTailoredResumeHandler,
} = require("../controllers/resumeController.js");

const router = express.Router();

// Multer memory storage for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 8, parts: 9 },
  fileFilter: (req, file, cb) => {
    const original = (file.originalname || "").toLowerCase();
    const mimeByExtension = original.endsWith(".pdf") ? "application/pdf"
      : original.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : original.endsWith(".doc") ? "application/msword" : null;
    if (mimeByExtension && [mimeByExtension, "application/octet-stream"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error("Only PDF, DOC, and DOCX files are allowed");
      error.statusCode = 400;
      cb(error);
    }
  },
});

const validateResumeUpload = (req, res, next) => {
  if (req.file && !isResumeFile(req.file)) {
    return res.status(400).json({ success: false, message: "Invalid resume file" });
  }
  next();
};

// All resume routes require authentication
router.use(protect);

router.get("/download", getResumeDownload);
router.get("/", getAllResumes);
router.post("/save", saveFinalResume);
router.post("/upload", upload.single("resume"), validateResumeUpload, uploadResumeHandler);
router.post("/upload-and-parse", upload.single("resume"), validateResumeUpload, uploadAndParseResumeHandler);
router.post("/parse", upload.single("resume"), validateResumeUpload, parseResumeHandler);
router.post("/confirm-parsed", confirmParsedProfileHandler);
router.post("/ats-score", analyzeATSResumeHandler);
router.post("/tailor", tailorResumeHandler);
router.get("/tailored/:opportunityType/:id", getTailoredResumeHandler);
router.post("/generate", generateResumeHandler);
router.post("/update", updateResumeHandler);
router.get("/me", getMyResume);
router.put("/manual", saveManualEdit);
router.get("/profile-data", getProfileForResume);
router.get("/:id", getResumeById);
router.patch("/:id/primary", setPrimaryResume);
router.delete("/:id", deleteResume);

module.exports = router;
