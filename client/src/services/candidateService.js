import api from "../api/api";

export const searchCandidates = async (params = {}) => {
  const res = await api.get("/candidates/search", { params });
  return res.data;
};

export const getCandidateById = async (id) => {
  const res = await api.get(`/candidates/${id}`);
  return res.data;
};

export default {
  searchCandidates,
  getCandidateById,
};
