import api from "../api/api";

export const getCourseCatalog = async (params = {}) => {
  const res = await api.get("/employer/learning/courses", { params });
  return res.data;
};

export const getMyLearning = async () => {
  const res = await api.get("/employer/learning/my-learning");
  return res.data;
};

export const enrollInCourse = async (courseId) => {
  const res = await api.post("/employer/learning/enroll", { courseId });
  return res.data;
};

export const updateProgress = async (enrollmentId, data) => {
  const res = await api.patch(`/employer/learning/progress/${enrollmentId}`, data);
  return res.data;
};

export const getMyCertificates = async () => {
  const res = await api.get("/employer/learning/certificates");
  return res.data;
};

export const getSkillDevelopment = async () => {
  const res = await api.get("/employer/learning/skill-development");
  return res.data;
};

export default {
  getCourseCatalog,
  getMyLearning,
  enrollInCourse,
  updateProgress,
  getMyCertificates,
  getSkillDevelopment,
};
