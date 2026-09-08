import api from "../api/api";

/**
 * Course Service
 * Handles all Student, Employee, Employer LMS, Catalog, Recommendations, Enrollment, and Management APIs.
 */

// ==========================================
// STUDENT & DISCOVERY COURSE APIS
// ==========================================

/**
 * Fetch AI-recommended courses for the logged-in student.
 */
export const getRecommendedCourses = async () => {
  try {
    const res = await api.get("/courses/recommended");
    return res.data;
  } catch (error) {
    try {
      const fallbackRes = await api.get("/courses/my-courses");
      if (fallbackRes.data?.success) {
        const published = (fallbackRes.data.courses || []).filter(
          (c) => c.status === "Published"
        );
        return { success: true, count: published.length, courses: published };
      }
    } catch {
      // Ignored
    }
    throw error;
  }
};

/**
 * Get detailed information for a single published course.
 * @param {string} courseId 
 */
export const getCourseDetails = async (courseId) => {
  const res = await api.get(`/courses/${courseId}`);
  return res.data;
};

/**
 * Apply / Enroll in a course as a student.
 * @param {string} courseId 
 */
export const applyForCourse = async (courseId) => {
  const res = await api.post(`/courses/${courseId}/apply`);
  return res.data;
};

/**
 * Get enrolled and completed courses with progress for the logged-in student.
 */
export const getStudentMyCourses = async () => {
  const res = await api.get("/student/courses");
  return res.data;
};

/**
 * Fetch course lessons/content for an enrolled student.
 * @param {string} courseId 
 */
export const getStudentCourseContent = async (courseId) => {
  const res = await api.get(`/student/courses/${courseId}/content`);
  return res.data;
};

/**
 * Mark a specific course lesson / content as completed and update progress percentage.
 * @param {string} courseId 
 * @param {string} contentId 
 */
export const markContentComplete = async (courseId, contentId) => {
  const res = await api.patch(
    `/student/courses/${courseId}/content/${contentId}/complete`
  );
  return res.data;
};

// ==========================================
// EMPLOYEE / EMPLOYER LEARNING APIS
// ==========================================

/**
 * Get all published courses for employee catalog browsing.
 * @param {Object} params - { search, domain, category, level }
 */
export const getEmployerCourseCatalog = async (params = {}) => {
  const res = await api.get("/employer/learning/courses", { params });
  return res.data;
};

/**
 * Enroll in a course as an employee / employer.
 * @param {string} courseId 
 */
export const enrollInEmployerCourse = async (courseId) => {
  const res = await api.post("/employer/learning/enroll", { courseId });
  return res.data;
};

/**
 * Get enrolled courses, learning paths, and progress for the logged-in employer/employee.
 */
export const getMyLearning = async () => {
  const res = await api.get("/employer/learning/my-learning");
  return res.data;
};

/**
 * Update employee course progress percentage and completed lessons.
 * @param {string} enrollmentId 
 * @param {Object|number} data - { progressPercentage, completedLessonId } or progressPercentage
 */
export const updateEnrollmentProgress = async (enrollmentId, data) => {
  const payload = typeof data === "number" ? { progressPercentage: data } : data;
  const res = await api.patch(`/employer/learning/progress/${enrollmentId}`, payload);
  return res.data;
};

/**
 * Fetch earned certificates for the logged-in user.
 */
export const getMyCertificates = async () => {
  const res = await api.get("/employer/learning/certificates");
  return res.data;
};

// ==========================================
// EMPLOYER / INSTRUCTOR COURSE CREATOR APIS
// ==========================================

/**
 * Get courses created by the logged-in employer.
 */
export const getEmployerCourses = async () => {
  const res = await api.get("/courses/my-courses");
  return res.data;
};

/**
 * Create a new course (Draft state).
 * @param {Object} courseData 
 */
export const createCourse = async (courseData) => {
  const res = await api.post("/courses", courseData);
  return res.data;
};

/**
 * Update course details.
 * @param {string} courseId 
 * @param {Object} courseData 
 */
export const updateCourse = async (courseId, courseData) => {
  const res = await api.put(`/courses/${courseId}`, courseData);
  return res.data;
};

/**
 * Delete a course.
 * @param {string} courseId 
 */
export const deleteCourse = async (courseId) => {
  const res = await api.delete(`/courses/${courseId}`);
  return res.data;
};

/**
 * Update course publication status (Draft, Published, Archived).
 * @param {string} courseId 
 * @param {string} status 
 */
export const updateCourseStatus = async (courseId, status) => {
  const res = await api.patch(`/courses/${courseId}/status`, { status });
  return res.data;
};

/**
 * Fetch course contents / curriculum (for employer manager).
 * @param {string} courseId 
 */
export const getCourseContent = async (courseId) => {
  const res = await api.get(`/course-content/${courseId}`);
  return res.data;
};

/**
 * Upload & add course content / lecture.
 * @param {string} courseId 
 * @param {FormData|Object} formData 
 */
export const addCourseContent = async (courseId, formData) => {
  const isFormData = formData instanceof FormData;
  const res = await api.post(`/courses/${courseId}/content`, formData, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

/**
 * Update existing course content.
 * @param {string} contentId 
 * @param {Object} data 
 */
export const updateCourseContent = async (contentId, data) => {
  const res = await api.put(`/course-content/${contentId}`, data);
  return res.data;
};

/**
 * Delete course content.
 * @param {string} contentId 
 */
export const deleteCourseContent = async (contentId) => {
  const res = await api.delete(`/course-content/${contentId}`);
  return res.data;
};

/**
 * Get student applications for an employer's course.
 * @param {string} courseId 
 */
export const getCourseApplications = async (courseId) => {
  const res = await api.get(`/courses/${courseId}/applications`);
  return res.data;
};

/**
 * Update student application status (Enrolled, Rejected).
 * @param {string} courseId 
 * @param {string} applicationId 
 * @param {string} status 
 */
export const updateCourseApplicationStatus = async (
  courseId,
  applicationId,
  status
) => {
  const res = await api.patch(
    `/courses/${courseId}/applications/${applicationId}/status`,
    { status }
  );
  return res.data;
};

export default {
  getRecommendedCourses,
  getCourseDetails,
  applyForCourse,
  getStudentMyCourses,
  getStudentCourseContent,
  markContentComplete,
  getEmployerCourseCatalog,
  enrollInEmployerCourse,
  getMyLearning,
  updateEnrollmentProgress,
  getMyCertificates,
  getEmployerCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
  getCourseContent,
  addCourseContent,
  updateCourseContent,
  deleteCourseContent,
  getCourseApplications,
  updateCourseApplicationStatus,
};
