import api from "../api/api";

export const getCourseCatalog = async (params = {}) => {
  const res = await api.get("/employer/learning/courses", { params });
  return res.data;
};

export const getMyLearning = async () => {
  const res = await api.get("/employer/learning/my-learning");
  return res.data;
};

export const getLearningPaths = async () => {
  const res = await api.get("/employer/learning/learning-paths");
  return res.data;
};

export const enrollInCourse = async (payload) => {
  const body = typeof payload === "string" ? { courseId: payload } : payload;
  const res = await api.post("/employer/learning/enroll", body);
  return res.data;
};

export const updateProgress = async (enrollmentId, data) => {
  const payload = typeof data === "number" ? { progressPercentage: data } : data;
  const res = await api.patch(`/employer/learning/progress/${enrollmentId}`, payload);
  return res.data;
};

export const validateCompetency = async (data) => {
  const res = await api.post("/employer/learning/validate-competency", data);
  return res.data;
};

export const getMyCertificates = async () => {
  const res = await api.get("/employer/learning/certificates");
  return res.data;
};

export const verifyCertificate = async (credentialId) => {
  const res = await api.get(`/employer/learning/verify/${credentialId}`);
  return res.data;
};

export const getSkillDevelopment = async () => {
  const res = await api.get("/employer/learning/skill-development");
  return res.data;
};

export default {
  getCourseCatalog,
  getMyLearning,
  getLearningPaths,
  enrollInCourse,
  updateProgress,
  validateCompetency,
  getMyCertificates,
  verifyCertificate,
  getSkillDevelopment,
};
