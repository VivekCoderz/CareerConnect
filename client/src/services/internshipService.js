import api from "../api/api";

export const getInternships = async (params = {}) => {
  const { data } = await api.get("/internships", { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await api.get(`/internships/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await api.post("/internships", payload);
  return data;
};

export const getMyPosts = async () => {
  const { data } = await api.get("/internships", { params: { myPosts: true } });
  return data;
};

export const update = async (id, payload) => {
  const { data } = await api.put(`/internships/${id}`, payload);
  return data;
};

export const updateStatus = async (id, status) => {
  const { data } = await api.patch(`/internships/${id}/status`, { status });
  return data;
};

export const remove = async (id) => {
  const { data } = await api.delete(`/internships/${id}`);
  return data;
};

export const syncExternal = async () => {
  const { data } = await api.post("/internships/sync/external");
  return data;
};