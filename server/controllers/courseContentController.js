const Course = require("../models/Course");
const CourseContent = require("../models/CourseContent");
const CourseApplication = require("../models/CourseApplication");
const CourseProgress = require("../models/CourseProgress");
const cloudinary = require("../config/cloudinary");


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
    // Notes
    // ------------------------------------------

    if (type === "notes") {
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Notes content is required",
        });
      }
    }

    // ------------------------------------------
    // Video / PDF
    // ------------------------------------------

    if (type === "video" || type === "pdf") {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `${type} file is required`,
        });
      }
    }

    // ------------------------------------------
    // Cloudinary upload
    // ------------------------------------------

    let cloudinaryData = {
      url: "",
      publicId: "",
      resourceType: null,
    };

    if (type === "video" || type === "pdf") {
      const resourceType = type === "video" ? "video" : "raw";

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `careerconnect/courses/${course._id}`,
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });

      cloudinaryData = {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      };
    }

    // ------------------------------------------
    // Create course content
    // ------------------------------------------

    const courseContent = await CourseContent.create({
      course: course._id,
      type,
      title,
      description,
      url: cloudinaryData.url,
      publicId: cloudinaryData.publicId,
      resourceType: cloudinaryData.resourceType,
      content: type === "notes" ? content : "",
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


// ==========================================
// GET COURSE CONTENT
// Employee's own course content fetch
// ==========================================
const getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check whether course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check whether logged-in employee owns this course
    if (course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this course content",
      });
    }

    // Fetch all content belonging to this course
    const content = await CourseContent.find({
      course: courseId,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Course content fetched successfully",
      course: course,
      content: content,
    });
  } catch (error) {
    console.error("Get Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE COURSE CONTENT
// PUT /api/course-content/:contentId
// ==========================================

const updateCourseContent = async (req, res) => {
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
    // Only employer can update course content
    // ------------------------------------------

    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can update course content",
      });
    }

    const { contentId } = req.params;

    // ------------------------------------------
    // Find content
    // ------------------------------------------

    const courseContent = await CourseContent.findById(contentId);

    if (!courseContent) {
      return res.status(404).json({
        success: false,
        message: "Course content not found",
      });
    }

    // ------------------------------------------
    // Find course
    // ------------------------------------------

    const course = await Course.findById(courseContent.course);

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
        message: "You are not allowed to update this course content",
      });
    }

    // ------------------------------------------
    // Get updated data
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
    // Validate content type if provided
    // ------------------------------------------

    if (type !== undefined && !["video", "pdf", "notes"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
      });
    }

    // ------------------------------------------
    // Determine final type
    // ------------------------------------------

    const finalType = type !== undefined ? type : courseContent.type;

    // ------------------------------------------
    // Video / PDF require URL
    // ------------------------------------------

    if (
      (finalType === "video" || finalType === "pdf") &&
      url !== undefined &&
      !url
    ) {
      return res.status(400).json({
        success: false,
        message: `${finalType} URL is required`,
      });
    }

    // If changing to video/pdf, existing URL must also exist
    if (
      (finalType === "video" || finalType === "pdf") &&
      url === undefined &&
      !courseContent.url
    ) {
      return res.status(400).json({
        success: false,
        message: `${finalType} URL is required`,
      });
    }

    // ------------------------------------------
    // Notes require text content
    // ------------------------------------------

    if (
      finalType === "notes" &&
      content !== undefined &&
      !content
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes content is required",
      });
    }

    if (
      finalType === "notes" &&
      content === undefined &&
      !courseContent.content
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes content is required",
      });
    }

    // ------------------------------------------
    // Update fields
    // ------------------------------------------

    if (type !== undefined) courseContent.type = type;
    if (title !== undefined) courseContent.title = title;
    if (description !== undefined) courseContent.description = description;
    if (url !== undefined) courseContent.url = url;
    if (content !== undefined) courseContent.content = content;
    if (duration !== undefined) courseContent.duration = duration;
    if (section !== undefined) courseContent.section = section;
    if (order !== undefined) courseContent.order = order;

    // ------------------------------------------
    // Save updated content
    // ------------------------------------------

    await courseContent.save();

    return res.status(200).json({
      success: true,
      message: "Course content updated successfully",
      courseContent,
    });
  } catch (error) {
    console.error("Update Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course content",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE COURSE CONTENT
// ==========================================
const deleteCourseContent = async (req, res) => {
  try {
    const { contentId } = req.params;

    // Find content
    const content = await CourseContent.findById(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Course content not found",
      });
    }

    // Find course
    const course = await Course.findById(content.course);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check course ownership
    if (course.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this content",
      });
    }

    await CourseContent.findByIdAndDelete(contentId);

    return res.status(200).json({
      success: true,
      message: "Course content deleted successfully",
    });
  } catch (error) {
    console.error("Delete Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==========================================
// GET STUDENT COURSE CONTENT
// GET /api/student/courses/:courseId/content
// Only enrolled students can access content
// ==========================================

const getStudentCourseContent = async (req, res) => {
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
    // Only students can access course content
    // ------------------------------------------

    if (user.role !== "user" || user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access course content",
      });
    }

    const { courseId } = req.params;

    // ------------------------------------------
    // Check course exists
    // ------------------------------------------

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ------------------------------------------
    // Check student's course application
    // ------------------------------------------

    const application = await CourseApplication.findOne({
      student: user._id,
      course: courseId,
    });

    if (!application) {
      return res.status(403).json({
        success: false,
        message: "You have not applied for this course",
      });
    }

    // ------------------------------------------
    // Only enrolled students can access content
    // ------------------------------------------

    if (application.status !== "Enrolled") {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to access its content",
        status: application.status,
      });
    }

    // ------------------------------------------
    // Fetch course content
    // ------------------------------------------

    const content = await CourseContent.find({
      course: courseId,
    }).sort({ order: 1, createdAt: 1 });

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Course content fetched successfully",
      course: {
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
      },
      progress: application.progress || 0,
      content,
    });
  } catch (error) {
    console.error("Get Student Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course content",
      error: error.message,
    });
  }
};

// ==========================================
// MARK COURSE CONTENT AS COMPLETE
// PATCH /api/student/courses/:courseId/content/:contentId/complete
// ==========================================

const markContentComplete = async (req, res) => {
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
    // Only students
    // ------------------------------------------

    if (user.role !== "user" || user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can complete course content",
      });
    }

    const { courseId, contentId } = req.params;

    // ------------------------------------------
    // Check enrollment
    // ------------------------------------------

    const application = await CourseApplication.findOne({
      student: user._id,
      course: courseId,
      status: "Enrolled",
    });

    if (!application) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course",
      });
    }

    // ------------------------------------------
    // Check content exists in this course
    // ------------------------------------------

    const content = await CourseContent.findOne({
      _id: contentId,
      course: courseId,
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Course content not found",
      });
    }

    // ------------------------------------------
    // Find or create progress
    // ------------------------------------------

    let courseProgress = await CourseProgress.findOne({
      student: user._id,
      course: courseId,
    });

    if (!courseProgress) {
      courseProgress = await CourseProgress.create({
        student: user._id,
        course: courseId,
        completedContents: [],
        progress: 0,
      });
    }

    // ------------------------------------------
    // Avoid duplicate completion
    // ------------------------------------------

    const alreadyCompleted = courseProgress.completedContents.some(
      (id) => id.toString() === contentId.toString()
    );

    if (!alreadyCompleted) {
      courseProgress.completedContents.push(contentId);
    }

    // ------------------------------------------
    // Get total course contents
    // ------------------------------------------

    const totalContents = await CourseContent.countDocuments({
      course: courseId,
    });

    // ------------------------------------------
    // Calculate progress automatically
    // ------------------------------------------

    const completedCount = courseProgress.completedContents.length;

    const progress =
      totalContents > 0
        ? Math.round((completedCount / totalContents) * 100)
        : 0;

    courseProgress.progress = progress;

    await courseProgress.save();

    // ------------------------------------------
    // Update CourseApplication progress
    // ------------------------------------------

    application.progress = progress;

    if (progress === 100) {
      application.status = "Completed";
    }

    await application.save();

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Content marked as completed",
      progress: courseProgress.progress,
      completedContents: courseProgress.completedContents,
      status: application.status,
    });
  } catch (error) {
    console.error("Mark Content Complete Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course progress",
      error: error.message,
    });
  }
};

module.exports = {
  addCourseContent,
  getCourseContent,
  updateCourseContent,
  deleteCourseContent,
  getStudentCourseContent,
  markContentComplete
};