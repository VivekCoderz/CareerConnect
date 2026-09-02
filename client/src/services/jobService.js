import api from "../api/api";

export const getJobs = async (params = {}) => {
  const res = await api.get("/jobs", { params });
  return res.data;
};

export const getJobById = async (id) => {
  const res = await api.get(`/jobs/${id}`);
  return res.data;
};

export const createJob = async (jobData) => {
  const res = await api.post("/jobs", jobData);
  return res.data;
};

export const updateJob = async (id, jobData) => {
  const res = await api.put(`/jobs/${id}`, jobData);
  return res.data;
};

export const updateJobStatus = async (id, status) => {
  const res = await api.patch(`/jobs/${id}/status`, { status });
  return res.data;
};

export const duplicateJob = async (id) => {
  const res = await api.post(`/jobs/${id}/duplicate`);
  return res.data;
};

export const deleteJob = async (id) => {
  const res = await api.delete(`/jobs/${id}`);
  return res.data;
};

export default {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  duplicateJob,
  deleteJob,
};
