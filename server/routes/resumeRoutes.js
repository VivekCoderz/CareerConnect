const express = require("express");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
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
  tailorResumeHandler,
  getTailoredResumeHandler,
} = require("../controllers/resumeController.js");

const router = express.Router();

// Multer memory storage for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const original = (file.originalname || "").toLowerCase();
    const isAllowedExt =
      original.endsWith(".pdf") ||
      original.endsWith(".doc") ||
      original.endsWith(".docx");
    const isAllowedMime = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ].includes(file.mimetype);

    if (isAllowedExt || isAllowedMime) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

// All resume routes require authentication
router.use(protect);

router.get("/", getAllResumes);
router.post("/save", saveFinalResume);
router.post("/upload", upload.single("resume"), uploadResumeHandler);
<<<<<<< HEAD
router.post("/upload-and-parse", upload.single("resume"), uploadAndParseResumeHandler);
=======
router.post("/parse", upload.single("resume"), parseResumeHandler);
router.post("/confirm-parsed", confirmParsedProfileHandler);
router.post("/tailor", tailorResumeHandler);
router.get("/tailored/:opportunityType/:id", getTailoredResumeHandler);
>>>>>>> origin/develop
router.post("/generate", generateResumeHandler);
router.post("/update", updateResumeHandler);
router.get("/me", getMyResume);
router.put("/manual", saveManualEdit);
router.get("/profile-data", getProfileForResume);
router.get("/:id", getResumeById);
router.patch("/:id/primary", setPrimaryResume);
router.delete("/:id", deleteResume);

module.exports = router;