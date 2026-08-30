const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// GET /api/employer/learning/courses (Browse all published LMS courses)
exports.getCourseCatalog = async (req, res, next) => {
  try {
    const { domain, category, level, search } = req.query;
    const query = { status: "Published" };

    if (domain && domain !== "All") query.domain = domain;
    if (category && category !== "All") query.category = category;
    if (level && level !== "All") query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { skills: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employer/learning/my-learning (Courses the logged-in employer is enrolled in)
exports.getMyLearning = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate("courseId")
      .sort({ updatedAt: -1 });

    const inProgress = enrollments.filter((e) => e.status !== "Completed");
    const completed = enrollments.filter((e) => e.status === "Completed");

    return res.status(200).json({
      success: true,
      totalEnrolled: enrollments.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/employer/learning/enroll
exports.enrollInCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    let enrollment = await Enrollment.findOne({ userId, courseId });
    if (enrollment) {
      return res.status(200).json({
        success: true,
        message: "Already enrolled in this course",
        enrollment,
      });
    }

    enrollment = await Enrollment.create({
      userId,
      courseId,
      enrolledRole: req.user.role || "employer",
      progressPercentage: 0,
      status: "In Progress",
    });

    return res.status(201).json({
      success: true,
      message: "Successfully enrolled in course",
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/employer/learning/progress/:enrollmentId
exports.updateProgress = async (req, res, next) => {
  try {
    const { progressPercentage, completedLessonId, quizScore } = req.body;
    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      userId: req.user._id,
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    if (progressPercentage !== undefined) {
      enrollment.progressPercentage = Math.min(100, Math.max(0, Number(progressPercentage)));
    }

    if (completedLessonId && !enrollment.completedLessons.includes(completedLessonId)) {
      enrollment.completedLessons.push(completedLessonId);
    }

    if (quizScore) {
      enrollment.quizScores.push(quizScore);
    }

    if (enrollment.progressPercentage >= 100) {
      enrollment.status = "Completed";
      enrollment.completedAt = new Date();
      enrollment.certificateId = `CERT-GU-${Math.floor(100000 + Math.random() * 900000)}`;
      enrollment.certificateUrl = `https://careerconnect.geetauniversity.edu.in/certificates/${enrollment.certificateId}`;
    }

    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Progress updated",
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employer/learning/certificates
exports.getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Enrollment.find({
      userId: req.user._id,
      status: "Completed",
    }).populate("courseId", "title domain category duration");

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employer/learning/skill-development
exports.getSkillDevelopment = async (req, res, next) => {
  try {
    // Curated learning paths & skill targets for recruiters & business leaders
    const skillTracks = [
      {
        skill: "Tech Recruitment & Talent Sourcing",
        currentLevel: "Intermediate",
        targetLevel: "Advanced",
        progress: 68,
        recommendedCourse: "Modern Technical Screening & Sourcing Strategies",
      },
      {
        skill: "People Analytics & HR Metrics",
        currentLevel: "Beginner",
        targetLevel: "Intermediate",
        progress: 42,
        recommendedCourse: "Data-Driven Talent Acquisition & Analytics",
      },
      {
        skill: "Engineering Team Leadership",
        currentLevel: "Intermediate",
        targetLevel: "Master",
        progress: 85,
        recommendedCourse: "Agile Leadership & Cross-Functional Team Building",
      },
    ];

    return res.status(200).json({
      success: true,
      skillTracks,
    });
  } catch (error) {
    next(error);
  }
};
