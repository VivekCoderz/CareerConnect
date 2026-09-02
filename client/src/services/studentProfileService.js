import api from "../api/api";

// Get student profile
export const getStudentProfile = async () => {
  const response = await api.get("/student/profile");
  return response.data;
};

// Create student profile
export const createStudentProfile = async (data) => {
  const response = await api.put("/student/profile", data);
  return response.data;
};

// Update student profile
export const updateStudentProfile = async (data) => {
  const response = await api.put("/student/profile", data);
  return response.data;
};

// Delete student profile
export const deleteStudentProfile = async () => {
  const response = await api.delete("/student/profile");
  return response.data;
};