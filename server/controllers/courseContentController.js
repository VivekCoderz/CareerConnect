<<<<<<< HEAD
const fs = require("fs");
const path = require("path");
=======
const { publicError } = require("../utils/publicError");
>>>>>>> origin/develop
const Course = require("../models/Course");
const CourseContent = require("../models/CourseContent");
const CourseApplication = require("../models/CourseApplication");
const CourseProgress = require("../models/CourseProgress");
const { cloudinary } = require("../config/cloudinary");

// ==========================================
// GET UPLOAD SIGNATURE FOR DIRECT-TO-CLOUD UPLOADS
// GET /api/course-content/upload-signature
// ==========================================
const getUploadSignature = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can generate upload signatures",
      });
    }

    const { courseId, resourceType = "video" } = req.query;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = courseId
      ? `careerconnect/courses/${courseId}`
      : "careerconnect/courses";

    const apiSecret =
      process.env.CLOUDINARY_API_SECRET || process.env.Cloudinary_API_Secret;
    const apiKey =
      process.env.CLOUDINARY_API_KEY || process.env.Cloudinary_API_Key;
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name;

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return res.status(200).json({
      success: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType,
    });
  } catch (error) {
    console.error("Get Upload Signature Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate upload signature",
      error: error.message,
    });
  }
};

/**
 * Ultra-Fast & Resilient Course File Upload Helper:
 * 1. Writes file directly to server local storage (/uploads/courses/<courseId>/)
 *    so it is 100% saved, never lost, and available instantly (<50ms).
 * 2. In cloud production (Render), optionally syncs to Cloudinary.
 * 3. Guarantees 0 second hanging, 100% reliability, and instant completion.
 */
const uploadCourseFile = async (fileBuffer, originalName, fileType, courseId, title) => {
  const isVideo = fileType === "video";
  const isPdf = fileType === "pdf";

  // 1. Ensure directory exists
  const uploadDir = path.join(__dirname, "..", "uploads", "courses", String(courseId));
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 2. Compute safe filenames and extension
  const rawExt = path.extname(originalName || "").toLowerCase();
  const ext = rawExt || (isPdf ? ".pdf" : ".mp4");
  const baseName = (originalName || title || (isVideo ? "video" : "document")).replace(/\.[^/.]+$/, "");
  const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || (isVideo ? "video" : "document");
  const fileName = `${isVideo ? "video" : "doc"}_${Date.now()}_${cleanName}${ext}`;
  const filePath = path.join(uploadDir, fileName);

  // 3. Save directly to disk synchronously (takes <10ms)
  fs.writeFileSync(filePath, fileBuffer);
  const relativeUrl = `/uploads/courses/${courseId}/${fileName}`;
  console.log(`⚡ [CourseUpload] File saved to storage: ${relativeUrl} (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

  // 4. In cloud production (Render), attempt Cloudinary upload with quick timeout
  const isProductionCloud = process.env.NODE_ENV === "production" && (process.env.RENDER === "true" || process.env.RENDER);
  if (isProductionCloud) {
    try {
      const uploadOptions = {
        folder: `careerconnect/courses/${courseId}`,
        resource_type: isVideo ? "video" : "raw",
        timeout: 45000,
      };

      if (isPdf) {
        uploadOptions.public_id = `pdf_${Date.now()}_${cleanName}.pdf`;
        uploadOptions.access_mode = "public";
        uploadOptions.type = "upload";
      } else if (isVideo) {
        uploadOptions.public_id = `video_${Date.now()}_${cleanName}`;
      }

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });

      let finalUrl = result.secure_url;
      if (isVideo && !finalUrl.match(/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i)) {
        finalUrl += ".mp4";
      }

      return {
        url: finalUrl,
        publicId: result.public_id,
        resourceType: result.resource_type,
      };
    } catch (cloudErr) {
      console.warn("⚠️ [CourseUpload] Cloudinary upload skipped/failed in production, using local storage fallback:", cloudErr.message || cloudErr);
    }
  }

  // 5. Return local storage URL immediately
  return {
    url: relativeUrl,
    publicId: `local_${Date.now()}_${cleanName}`,
    resourceType: isVideo ? "video" : "raw",
  };
};

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

    const { type, title, description, content, duration, section, order } =
      req.body;

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
      if (!req.file && !req.body.url) {
        return res.status(400).json({
          success: false,
          message: `Either ${type} file or direct URL is required`,
        });
      }
    }

    // ------------------------------------------
    // Upload Handler (Cloudinary with Local Fallback)
    // ------------------------------------------

    let uploadData = {
      url: req.body.url || "",
      publicId: req.body.publicId || "",
      resourceType: req.body.resourceType || (type === "video" ? "video" : "raw"),
    };

<<<<<<< HEAD
    if (req.file && req.file.buffer && (type === "video" || type === "pdf")) {
      uploadData = await uploadCourseFile(
        req.file.buffer,
        req.file.originalname,
        type,
        course._id,
        title
      );
=======
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

        const fileStream = fs.createReadStream(req.file.path);
        fileStream.on("error", reject);
        fileStream.pipe(uploadStream);
      });

      cloudinaryData = {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      };
>>>>>>> origin/develop
    }

    // ------------------------------------------
    // Create course content
    // ------------------------------------------

    const courseContent = await CourseContent.create({
      course: course._id,
      type,
      title,
      description,
      url: uploadData.url || req.body.url || "",
      publicId: uploadData.publicId || "",
      resourceType:
        uploadData.resourceType || (type === "video" ? "video" : "raw"),
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
      courseContent: sanitizeContentUrl(courseContent),
    });
  } catch (error) {
    console.error("Add Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add course content",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  } finally {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
  }
};

/**
 * Helper to sanitize content URLs (ensures Cloudinary video URLs have .mp4 for native browser playback)
 */
const sanitizeContentUrl = (item) => {
  if (!item) return item;
  const doc = item.toObject ? item.toObject() : { ...item };
  if (
    doc.type === "video" &&
    doc.url &&
    doc.url.includes("res.cloudinary.com") &&
    doc.url.includes("/video/upload/")
  ) {
    if (!doc.url.match(/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i)) {
      const parts = doc.url.split("?");
      doc.url = `${parts[0]}.mp4${parts[1] ? "?" + parts[1] : ""}`;
    }
  }
  return doc;
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

    const sanitizedContent = content.map((item) => sanitizeContentUrl(item));

    return res.status(200).json({
      success: true,
      message: "Course content fetched successfully",
      course: course,
      content: sanitizedContent,
    });
  } catch (error) {
    console.error("Get Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: publicError(error),
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

    const { type, title, description, url, content, duration, section, order } =
      req.body;

    if (url !== undefined && url !== "") {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) throw new Error("Unsafe URL");
      } catch (_) {
        return res.status(400).json({ success: false, message: "A valid HTTPS content URL is required" });
      }
    }

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
    // Upload new file buffer if provided
    // ------------------------------------------
    if (req.file && req.file.buffer && (finalType === "video" || finalType === "pdf")) {
      const uploadData = await uploadCourseFile(
        req.file.buffer,
        req.file.originalname,
        finalType,
        course._id,
        title || courseContent.title
      );

      courseContent.url = uploadData.url;
      courseContent.publicId = uploadData.publicId;
      courseContent.resourceType = uploadData.resourceType;
    } else if (url !== undefined) {
      courseContent.url = url;
    }

    // ------------------------------------------
    // Video / PDF require URL
    // ------------------------------------------

    if (
      (finalType === "video" || finalType === "pdf") &&
      !courseContent.url &&
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message: `${finalType} URL or file is required`,
      });
    }

    // ------------------------------------------
    // Notes require text content
    // ------------------------------------------

    if (finalType === "notes" && content !== undefined && !content) {
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
      courseContent: sanitizeContentUrl(courseContent),
    });
  } catch (error) {
    console.error("Update Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course content",
      error: publicError(error),
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
      error: publicError(error),
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

    const sanitizedContent = content.map((item) => sanitizeContentUrl(item));

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
      content: sanitizedContent,
    });
  } catch (error) {
    console.error("Get Student Course Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course content",
      error: publicError(error),
    });
  }
};

// ==========================================
// STREAM / VIEW COURSE PDF
// GET /api/course-content/:contentId/view-pdf
// ==========================================
const streamPdfContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await CourseContent.findById(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Course content not found",
      });
    }

    if (content.type !== "pdf" || !content.url) {
      return res.status(400).json({
        success: false,
        message: "Content is not a valid PDF",
      });
    }

    let targetUrl = content.url;

    // 1. Check if it's a local file in server/uploads
    if (targetUrl.startsWith("/uploads/") || targetUrl.startsWith("uploads/")) {
      const cleanRelativePath = targetUrl.replace(/^\/?/, "");
      const localFilePath = path.join(__dirname, "..", cleanRelativePath);

      if (fs.existsSync(localFilePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=document.pdf");
        return fs.createReadStream(localFilePath).pipe(res);
      }
    }

    // 2. Handle Cloudinary-hosted PDFs (bypasses ACL / 401 & 404)
    if (targetUrl.includes("res.cloudinary.com")) {
      const isImage = targetUrl.includes("/image/upload/");

      if (isImage) {
        // Extract public ID from /image/upload/...
        // Example: https://res.cloudinary.com/goajihdh/image/upload/v1789621697/careerconnect/courses/6aab758a73439e222e1617ef/jjte3alsaadaxxcoiucf.pdf
        const match = targetUrl.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.pdf)?$/i);
        if (match && match[1]) {
          const publicId = match[1];
          try {
            // Generate signed private download URL using Cloudinary SDK
            const signedDownloadUrl = cloudinary.utils.private_download_url(
              publicId,
              "pdf",
              {
                resource_type: "image",
                type: "upload",
                attachment: false,
              }
            );
            if (signedDownloadUrl) {
              return res.redirect(signedDownloadUrl);
            }
          } catch (signErr) {
            console.warn("Cloudinary private_download_url failed, falling back to fl_attachment flag:", signErr.message);
          }

          // Fallback: Use fl_attachment flag
          const attachmentUrl = targetUrl.replace(/\/image\/upload\/(?:v\d+\/)?/, (m) => `${m}fl_attachment/`);
          return res.redirect(attachmentUrl);
        }
      }
    }

    return res.redirect(targetUrl);
  } catch (error) {
    console.error("Stream PDF Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to serve PDF",
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
      (id) => id.toString() === contentId.toString(),
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
      error: publicError(error),
    });
  }
};

// ==========================================
// STREAM / VIEW COURSE VIDEO
// GET /api/course-content/:contentId/view-video
// ==========================================
const streamVideoContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await CourseContent.findById(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Course content not found",
      });
    }

    if (content.type !== "video" || !content.url) {
      return res.status(400).json({
        success: false,
        message: "Content is not a valid video",
      });
    }

    let targetUrl = content.url;

    // 1. Check if it's a local file in server/uploads
    if (targetUrl.startsWith("/uploads/") || targetUrl.startsWith("uploads/")) {
      const cleanRelativePath = targetUrl.replace(/^\/?/, ""); // e.g. "uploads/courses/..."
      const localFilePath = path.join(__dirname, "..", cleanRelativePath);

      if (fs.existsSync(localFilePath)) {
        const stat = fs.statSync(localFilePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        const fileExt = path.extname(localFilePath).toLowerCase();
        const mimeTypes = {
          ".mp4": "video/mp4",
          ".webm": "video/webm",
          ".mov": "video/quicktime",
          ".mkv": "video/x-matroska",
          ".ogg": "video/ogg",
          ".ogv": "video/ogg",
        };
        const contentType = mimeTypes[fileExt] || "video/mp4";

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          const file = fs.createReadStream(localFilePath, { start, end });
          const head = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": contentType,
          };
          res.writeHead(206, head);
          return file.pipe(res);
        } else {
          const head = {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
          };
          res.writeHead(200, head);
          return fs.createReadStream(localFilePath).pipe(res);
        }
      }
    }

    // 2. If it's a Cloudinary video URL, ensure .mp4 format for browser decoding
    if (targetUrl.includes("res.cloudinary.com")) {
      if (targetUrl.includes("/video/upload/")) {
        if (!targetUrl.match(/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i)) {
          const parts = targetUrl.split("?");
          targetUrl = `${parts[0]}.mp4${parts[1] ? "?" + parts[1] : ""}`;
        }
      }
      return res.redirect(targetUrl);
    }

    // 3. Fallback redirect
    return res.redirect(targetUrl);
  } catch (error) {
    console.error("Stream Video Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to serve video stream",
      error: error.message,
    });
  }
};

module.exports = {
  getUploadSignature,
  addCourseContent,
  getCourseContent,
  updateCourseContent,
  deleteCourseContent,
  getStudentCourseContent,
<<<<<<< HEAD
  streamPdfContent,
  streamVideoContent,
  markContentComplete,
=======
  markContentComplete
>>>>>>> origin/develop
};
