import api from "../api/api";

// Employees
export const getEmployees = async (params = {}) => {
  const res = await api.get("/organization/employees", { params });
  return res.data;
};

export const addEmployee = async (data) => {
  const res = await api.post("/organization/employees", data);
  return res.data;
};

export const updateEmployee = async (id, data) => {
  const res = await api.put(`/organization/employees/${id}`, data);
  return res.data;
};

export const deleteEmployee = async (id) => {
  const res = await api.delete(`/organization/employees/${id}`);
  return res.data;
};

// Departments
export const getDepartments = async () => {
  const res = await api.get("/organization/departments");
  return res.data;
};

export const createDepartment = async (data) => {
  const res = await api.post("/organization/departments", data);
  return res.data;
};

// Training Assignments
export const getTrainingAssignments = async () => {
  const res = await api.get("/organization/training");
  return res.data;
};

export const assignTraining = async (data) => {
  const res = await api.post("/organization/training/assign", data);
  return res.data;
};

// Skill Gap Analysis
export const getSkillGapAnalysis = async () => {
  const res = await api.get("/organization/skill-gaps");
  return res.data;
};

export default {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  createDepartment,
  getTrainingAssignments,
  assignTraining,
  getSkillGapAnalysis,
};
