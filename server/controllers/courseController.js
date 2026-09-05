const Course = require("../models/Course");
const StudentProfile = require("../models/StudentProfile");
const CourseApplication=require("../models/CourseApplication");
const CourseProgress = require("../models/CourseProgress");

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

// ==========================================
// GET RECOMMENDED COURSES FOR STUDENT
// GET /api/courses/recommended
// ==========================================

const getRecommendedCourses = async (req, res) => {
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
    // Only students can access recommendations
    // ------------------------------------------

    if (user.role !== "user" || user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access recommended courses",
      });
    }

    // ------------------------------------------
    // Find student's profile
    // ------------------------------------------

    const studentProfile = await StudentProfile.findOne({
      userId: user._id,
    });

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // ------------------------------------------
    // Get all published courses
    // ------------------------------------------

    const courses = await Course.find({
      status: "Published",
    }).lean();

    // ------------------------------------------
    // Student profile data
    // ------------------------------------------

    const technicalSkills = (studentProfile.technicalSkills || []).map(
      (skill) => skill.toLowerCase().trim()
    );

    const softSkills = (studentProfile.softSkills || []).map(
      (skill) => skill.toLowerCase().trim()
    );

    const interests = (studentProfile.interests || []).map(
      (interest) => interest.toLowerCase().trim()
    );

    const preferredRoles = (
      studentProfile.jobPreferences?.preferredRoles || []
    ).map((role) => role.toLowerCase().trim());

    const careerGoal = (studentProfile.careerGoal || "")
      .toLowerCase()
      .trim();

    // ------------------------------------------
    // Education information
    // ------------------------------------------

    const education = studentProfile.education || [];

    const educationDegrees = education
      .map((edu) => edu.degree || "")
      .filter(Boolean)
      .map((degree) => degree.toLowerCase().trim());

    const fieldsOfStudy = education
      .map((edu) => edu.fieldOfStudy || "")
      .filter(Boolean)
      .map((field) => field.toLowerCase().trim());

    // ------------------------------------------
    // Calculate recommendation score
    // ------------------------------------------

    const recommendedCourses = courses.map((course) => {
      let score = 0;
      const matchedSkills = [];

      const courseSkills = (course.skills || []).map(
        (skill) => skill.toLowerCase().trim()
      );

      // ------------------------------------------
      // 1. Technical Skills → +5
      // ------------------------------------------

      courseSkills.forEach((courseSkill) => {
        if (technicalSkills.includes(courseSkill)) {
          score += 5;
          matchedSkills.push(courseSkill);
        }
      });

      // ------------------------------------------
      // 2. Soft Skills → +1
      // ------------------------------------------

      courseSkills.forEach((courseSkill) => {
        if (softSkills.includes(courseSkill)) {
          score += 1;
        }
      });

      // ------------------------------------------
      // 3. Interests → +3
      // ------------------------------------------

      interests.forEach((interest) => {
        const interestMatch =
          courseSkillContains(courseSkills, interest) ||
          textContains(course.title, interest) ||
          textContains(course.category, interest) ||
          textContains(course.domain, interest);

        if (interestMatch) {
          score += 3;
        }
      });

      // ------------------------------------------
      // 4. Career Goal → +4
      // ------------------------------------------

      if (
        careerGoal &&
        (
          textContains(course.title, careerGoal) ||
          textContains(course.description, careerGoal) ||
          textContains(course.category, careerGoal) ||
          textContains(course.domain, careerGoal)
        )
      ) {
        score += 4;
      }

      // ------------------------------------------
      // 5. Preferred Roles → +4
      // ------------------------------------------

      preferredRoles.forEach((role) => {
        if (
          textContains(course.title, role) ||
          textContains(course.description, role) ||
          textContains(course.category, role) ||
          textContains(course.domain, role)
        ) {
          score += 4;
        }
      });

      // ------------------------------------------
      // 6. Education Degree → +2
      // ------------------------------------------

      educationDegrees.forEach((degree) => {
        if (
          textContains(course.title, degree) ||
          textContains(course.description, degree) ||
          textContains(course.category, degree) ||
          textContains(course.domain, degree)
        ) {
          score += 2;
        }
      });

      // ------------------------------------------
      // 7. Field of Study → +3
      // ------------------------------------------

      fieldsOfStudy.forEach((field) => {
        if (
          textContains(course.title, field) ||
          textContains(course.description, field) ||
          textContains(course.category, field) ||
          textContains(course.domain, field)
        ) {
          score += 3;
        }
      });

      // ------------------------------------------
      // Recommendation label
      // ------------------------------------------

      let recommendation = "Other";

      if (score >= 12) {
        recommendation = "Highly Recommended";
      } else if (score >= 6) {
        recommendation = "Recommended";
      } else if (score > 0) {
        recommendation = "Related";
      }

      return {
        ...course,
        recommendationScore: score,
        recommendation,
        matchedSkills,
      };
    });

    // ------------------------------------------
    // Sort highest recommendation first
    // ------------------------------------------

    recommendedCourses.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    return res.status(200).json({
      success: true,
      count: recommendedCourses.length,
      studentProfile: {
        technicalSkills: studentProfile.technicalSkills || [],
        interests: studentProfile.interests || [],
        careerGoal: studentProfile.careerGoal || "",
      },
      courses: recommendedCourses,
    });
  } catch (error) {
    console.error("Get Recommended Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recommended courses",
      error: error.message,
    });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const textContains = (value, searchText) => {
  if (!value || !searchText) {
    return false;
  }

  return value.toLowerCase().includes(searchText.toLowerCase());
};

const courseSkillContains = (skills, searchText) => {
  if (!searchText) {
    return false;
  }

  return skills.some((skill) =>
    skill.toLowerCase().includes(searchText.toLowerCase())
  );
};

// ==========================================
// GET COURSE DETAILS
// GET /api/courses/:id
// ==========================================

const getCourseDetails = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      status: "Published",
    }).populate(
      "createdBy",
      "fullName username email profileImage"
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Get Course Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course details",
      error: error.message,
    });
  }
};

// ==========================================
// APPLY FOR COURSE
// POST /api/courses/:id/apply
// ==========================================

const applyCourse = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only students can apply
    if (user.role !== "user" || user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can apply for courses",
      });
    }

    // Check published course
    const course = await Course.findOne({
      _id: req.params.id,
      status: "Published",
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or is not published",
      });
    }

    // Check duplicate application
    const existingApplication = await CourseApplication.findOne({
      student: user._id,
      course: course._id,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this course",
        application: existingApplication,
      });
    }

    // Create application
    const application = await CourseApplication.create({
      student: user._id,
      course: course._id,
      status: "Applied",
    });

    return res.status(201).json({
      success: true,
      message: "Course application submitted successfully",
      application,
    });
  } catch (error) {
    console.error("Apply Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to apply for course",
      error: error.message,
    });
  }
};

// ==========================================
// GET COURSE APPLICATIONS
// GET /api/courses/:courseId/applications
// Employer can view applications for own course
// ==========================================

const getCourseApplications = async (req, res) => {
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
    // Only employers can access applications
    // ------------------------------------------

    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can view course applications",
      });
    }

    const { courseId } = req.params;

    // ------------------------------------------
    // Find course
    // ------------------------------------------

    const course = await Course.findById(courseId);

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
        message: "You are not authorized to view these applications",
      });
    }

    // ------------------------------------------
    // Get applications
    // ------------------------------------------

    const applications = await CourseApplication.find({
      course: courseId,
    })
      .populate(
        "student",
        "fullName username email profileImage"
      )
      .sort({ createdAt: -1 });

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      count: applications.length,
      course: {
        _id: course._id,
        title: course.title,
      },
      applications,
    });
  } catch (error) {
    console.error("Get Course Applications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course applications",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE COURSE APPLICATION STATUS
// PATCH /api/courses/:courseId/applications/:applicationId/status
// Employer can approve or reject application
// ==========================================

const updateCourseApplicationStatus = async (req, res) => {
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
    // Only employers can update applications
    // ------------------------------------------

    if (user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can update course applications",
      });
    }

    const { courseId, applicationId } = req.params;
    const { status } = req.body;

    // ------------------------------------------
    // Validate status
    // ------------------------------------------

    if (!["Enrolled", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either Enrolled or Rejected",
      });
    }

    // ------------------------------------------
    // Find course
    // ------------------------------------------

    const course = await Course.findById(courseId);

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
        message: "You are not authorized to manage this course",
      });
    }

    // ------------------------------------------
    // Find application
    // ------------------------------------------

    const application = await CourseApplication.findOne({
      _id: applicationId,
      course: courseId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Course application not found",
      });
    }

    // ------------------------------------------
    // Application must be in Applied state
    // ------------------------------------------

    if (application.status !== "Applied") {
      return res.status(400).json({
        success: false,
        message: `Application is already ${application.status}`,
      });
    }

    // ------------------------------------------
    // Update status
    // ------------------------------------------

    application.status = status;

    await application.save();

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      application,
    });
  } catch (error) {
    console.error("Update Course Application Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course application status",
      error: error.message,
    });
  }
};

// ==========================================
// GET STUDENT MY COURSES
// GET /api/student/courses
// ==========================================

const getStudentMyCourses = async (req, res) => {
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
        message: "Only students can access My Courses",
      });
    }

    // ------------------------------------------
    // Find enrolled/completed course applications
    // ------------------------------------------

    const applications = await CourseApplication.find({
      student: user._id,
      status: { $in: ["Enrolled", "Completed"] },
    })
      .populate("course")
      .sort({ createdAt: -1 });

    // ------------------------------------------
    // Attach progress to every course
    // ------------------------------------------

    const courses = await Promise.all(
      applications.map(async (application) => {
        const progressData = await CourseProgress.findOne({
          student: user._id,
          course: application.course._id,
        });

        return {
          applicationId: application._id,
          course: application.course,
          status: application.status,
          progress: progressData
            ? progressData.progress
            : application.progress || 0,
        };
      })
    );

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Get Student My Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student courses",
      error: error.message,
    });
  }
};


module.exports = {
  createCourse,
  getMyCourses,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
  getRecommendedCourses,
  getCourseDetails,
  applyCourse,
  getCourseApplications,
  updateCourseApplicationStatus,
  getStudentMyCourses,
};