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
  getProfileForResume,
} = require("../controllers/resumeController.js");

const router = express.Router();

// Multer memory storage for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// All resume routes require authentication
router.use(protect);

router.get("/", getAllResumes);
router.post("/save", saveFinalResume);
router.post("/upload", upload.single("resume"), uploadResumeHandler);
router.post("/generate", generateResumeHandler);
router.post("/update", updateResumeHandler);
router.get("/me", getMyResume);
router.put("/manual", saveManualEdit);
router.get("/profile-data", getProfileForResume);
router.get("/:id", getResumeById);
router.patch("/:id/primary", setPrimaryResume);
router.delete("/:id", deleteResume);

module.exports = router;