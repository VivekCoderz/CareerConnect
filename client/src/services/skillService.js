import api from "../api/api";

export const getSkills = async (params = {}) => {
  const res = await api.get("/skills", { params });
  return res.data;
};

export const getTrendingSkills = async () => {
  const res = await api.get("/skills/trending");
  return res.data;
};

export const getSkillById = async (id) => {
  const res = await api.get(`/skills/${id}`);
  return res.data;
};

export const createSkill = async (data) => {
  const res = await api.post("/skills", data);
  return res.data;
};

export const updateSkill = async (id, data) => {
  const res = await api.put(`/skills/${id}`, data);
  return res.data;
};

export const deleteSkill = async (id) => {
  const res = await api.delete(`/skills/${id}`);
  return res.data;
};

export default {
  getSkills,
  getTrendingSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
};
