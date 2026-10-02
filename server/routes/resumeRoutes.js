const express = require("express");
const protect = require("../middleware/authMiddleware");
const { aiResumeLimiter, aiDailyLimiter } = require("../middleware/rateLimitMiddleware");
const multer = require("multer");
const { isResumeFile } = require("../utils/fileSignatures");
const { getResumeDownload } = require("../controllers/resumeAccessController");
const { scheduleResumeCleanup } = require("../services/resumeAssetCleanup");
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
  parseJobDescriptionHandler,
  analyzeATSResumeHandler,
  tailorResumeHandler,
  getTailoredResumeHandler,
  generateATSResumeHandler,
  atsPdfCheckHandler,
  atsPdfOptimizeHandler,
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

const jobDescriptionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (req, file, cb) => {
    const isPdfName = (file.originalname || "").toLowerCase().endsWith(".pdf");
    const isPdfMime = ["application/pdf", "application/octet-stream"].includes(file.mimetype);
    if (isPdfName && isPdfMime) return cb(null, true);
    const error = new Error("Only PDF job descriptions are allowed");
    error.statusCode = 400;
    return cb(error);
  },
});

const atsPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 3, parts: 5 },
  fileFilter: (_req, file, cb) => {
    const validField = file.fieldname === "resume" || file.fieldname === "jobDescription";
    const validName = (file.originalname || "").toLowerCase().endsWith(".pdf");
    const validMime = ["application/pdf", "application/octet-stream"].includes(file.mimetype);
    if (validField && validName && validMime) return cb(null, true);
    const error = new Error("Upload PDF files for the resume and job description.");
    error.statusCode = 400;
    return cb(error);
  },
});

// All resume routes require authentication
router.use(protect);

// After any successful resume change, delete the user's resume files that nothing
// references any more (runs in the background, after the response).
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400 && req.user?._id) scheduleResumeCleanup(req.user._id);
    });
  }
  next();
});

router.get("/download", getResumeDownload);
router.get("/", getAllResumes);
router.post("/save", saveFinalResume);
router.post("/upload", upload.single("resume"), validateResumeUpload, uploadResumeHandler);
router.post("/upload-and-parse", upload.single("resume"), validateResumeUpload, aiResumeLimiter, aiDailyLimiter, uploadAndParseResumeHandler);
router.post("/parse", upload.single("resume"), validateResumeUpload, aiResumeLimiter, aiDailyLimiter, parseResumeHandler);
router.post("/confirm-parsed", confirmParsedProfileHandler);
router.post("/parse-job-description", jobDescriptionUpload.single("jobDescription"), aiResumeLimiter, parseJobDescriptionHandler);
router.post("/ats-score", aiResumeLimiter, analyzeATSResumeHandler);
router.post("/tailor", aiResumeLimiter, aiDailyLimiter, tailorResumeHandler);
router.get("/tailored/:opportunityType/:id", getTailoredResumeHandler);
router.post("/generate", aiResumeLimiter, aiDailyLimiter, generateResumeHandler);
router.post("/ats-generate", aiResumeLimiter, aiDailyLimiter, generateATSResumeHandler);
router.post("/ats-pdf/check", atsPdfUpload.fields([{ name: "resume", maxCount: 1 }, { name: "jobDescription", maxCount: 1 }]), aiResumeLimiter, atsPdfCheckHandler);
router.post("/ats-pdf/optimize", atsPdfUpload.fields([{ name: "resume", maxCount: 1 }, { name: "jobDescription", maxCount: 1 }]), aiResumeLimiter, aiDailyLimiter, atsPdfOptimizeHandler);
router.post("/update", aiResumeLimiter, updateResumeHandler);
router.get("/me", getMyResume);
router.put("/manual", saveManualEdit);
router.get("/profile-data", getProfileForResume);
router.get("/:id", getResumeById);
router.patch("/:id/primary", setPrimaryResume);
router.delete("/:id", deleteResume);

module.exports = router;
