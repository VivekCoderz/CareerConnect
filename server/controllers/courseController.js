const Course = require("../models/Course");

// ==========================================
// CREATE COURSE
// POST /api/courses
// ==========================================

const createCourse = async (req, res) => {
  try {
    // Logged-in user auth middleware se aayega
    const user = req.user;

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only employer can create courses
    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can create courses",
      });
    }

    const {
      title,
      description,
      thumbnail,
      domain,
      category,
      level,
      duration,
      durationUnit,
      skills,
      price,
    } = req.body;

    // Basic validation
    if (
      !title ||
      !description ||
      !domain ||
      !category ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, description, domain, category and duration are required",
      });
    }

    // Create course
    const course = await Course.create({
      title,
      description,
      thumbnail,
      domain,
      category,
      level,
      duration,
      durationUnit,
      skills,
      price,

      // IMPORTANT:
      // createdBy comes from authenticated user
      // NOT from frontend
      createdBy: user._id,

      // New course is always Draft
      status: "Draft",
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Create Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};

// ==========================================
// GET MY COURSES
// GET /api/courses/my-courses
// ==========================================

const getMyCourses = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only employer can access My Courses
    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can access My Courses",
      });
    }

    const courses = await Course.find({
      createdBy: user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Get My Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};



// ==========================================
// UPDATE COURSE
// PUT /api/courses/:id
// ==========================================

const updateCourse = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find course
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // IMPORTANT:
    // Only the employee who created the course can update it
    if (course.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this course",
      });
    }

    const {
      title,
      description,
      thumbnail,
      domain,
      category,
      level,
      duration,
      durationUnit,
      skills,
      price,
    } = req.body;

    // Update only provided fields
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (domain !== undefined) course.domain = domain;
    if (category !== undefined) course.category = category;
    if (level !== undefined) course.level = level;
    if (duration !== undefined) course.duration = duration;
    if (durationUnit !== undefined) course.durationUnit = durationUnit;
    if (skills !== undefined) course.skills = skills;
    if (price !== undefined) course.price = price;

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    console.error("Update Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};
// ==========================================
// DELETE COURSE
// DELETE /api/courses/:id
// ==========================================

const deleteCourse = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Only course creator can delete
    if (course.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this course",
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};


// ==========================================
// PUBLISH / UNPUBLISH COURSE
// PATCH /api/courses/:id/status
// ==========================================

const updateCourseStatus = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Only course creator can change status
    if (course.createdBy.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to change this course",
      });
    }

    const { status } = req.body;

    if (!["Draft", "Published", "Archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course status",
      });
    }

    course.status = status;

    // Set publishedAt only when publishing
    if (status === "Published") {
      course.publishedAt = new Date();
    } else {
      course.publishedAt = null;
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course ${status.toLowerCase()} successfully`,
      course,
    });
  } catch (error) {
    console.error("Update Course Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course status",
      error: error.message,
    });
  }
};

module.exports = {
  createCourse,getMyCourses,updateCourse,deleteCourse,updateCourseStatus
};