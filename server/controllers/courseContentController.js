const Course = require("../models/Course");
const CourseContent = require("../models/CourseContent");

// ==========================================
// ADD COURSE CONTENT
// POST /api/courses/:courseId/content
// ==========================================

const addCourseContent = async (req, res) => {
  try {
    const user = req.user;

    // ------------------------------------------
    // Authentication check
    // ------------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ------------------------------------------
    // Only employer can add course content
    // ------------------------------------------

    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can add course content",
      });
    }

    // ------------------------------------------
    // Find course
    // ------------------------------------------

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ------------------------------------------
    // Check course ownership
    // ------------------------------------------

    if (course.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to add content to this course",
      });
    }

    // ------------------------------------------
    // Get content data
    // ------------------------------------------

    const {
      type,
      title,
      description,
      url,
      content,
      duration,
      section,
      order,
    } = req.body;

    // ------------------------------------------
    // Basic validation
    // ------------------------------------------

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        message: "Content type and title are required",
      });
    }

    // ------------------------------------------
    // Validate content type
    // ------------------------------------------

    if (!["video", "pdf", "notes"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
      });
    }

    // ------------------------------------------
    // Video / PDF require URL
    // ------------------------------------------

    if ((type === "video" || type === "pdf") && !url) {
      return res.status(400).json({
        success: false,
        message: `${type} URL is required`,
      });
    }

    // ------------------------------------------
    // Notes require text content
    // ------------------------------------------

    if (type === "notes" && !content) {
      return res.status(400).json({
        success: false,
        message: "Notes content is required",
      });
    }

    // ------------------------------------------
    // Create course content
    // ------------------------------------------

    const courseContent = await CourseContent.create({
      course: course._id,
      type,
      title,
      description,
      url,
      content,
      duration,
      section,
      order,
      createdBy: user._id,
    });

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Course content added successfully",
      courseContent,
    });
  } catch (error) {
    console.error("Add Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add course content",
      error: error.message,
    });
  }
};



module.exports = {
  addCourseContent,
};