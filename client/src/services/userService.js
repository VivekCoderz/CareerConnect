import api from "../api/api";

export const getProfile = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put("/users/profile", data);
  return res.data;
};

export const getUserById = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

export const getCareerGoals = async () => {
  const res = await api.get("/users/career-goals");
  return res.data;
};

export const setCareerGoal = async (data) => {
  const res = await api.post("/users/career-goals", data);
  return res.data;
};

export default {
  getProfile,
  updateProfile,
  getUserById,
  getCareerGoals,
  setCareerGoal,
};
