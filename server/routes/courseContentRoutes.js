const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const fs = require("fs");
const { isCourseFile } = require("../utils/fileSignatures");

const {
  addCourseContent,
  getCourseContent,
  updateCourseContent,deleteCourseContent
} = require("../controllers/courseContentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

const validateCourseUpload = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const handle = await fs.promises.open(req.file.path, "r");
    const header = Buffer.alloc(16);
    try {
      await handle.read(header, 0, header.length, 0);
    } finally {
      await handle.close();
    }
    if (!isCourseFile(req.body.type, req.file.originalname, header)) {
      await fs.promises.unlink(req.file.path);
      return res.status(400).json({ success: false, message: "Invalid course file" });
    }
    next();
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
};

// ==========================================
// COURSE CONTENT ROUTES
// ==========================================

// Add content to a course
// POST /api/courses/:courseId/content
router.post("/:courseId",protect,upload.single("file"),validateCourseUpload,addCourseContent);
router.post("/:courseId/content",protect,upload.single("file"),validateCourseUpload,addCourseContent);
//get course content
router.get("/:courseId", protect, getCourseContent);
// Update course content
router.put("/:contentId", protect, updateCourseContent);

// Delete course content
router.delete("/:contentId", protect, deleteCourseContent);


module.exports = router;
