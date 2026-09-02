import api from "../api/api.jsx";

// Get professional profile
export const getProfessionalProfile = async () => {
  const response = await api.get("/professional/profile");
  return response.data;
};

// Update professional profile
export const updateProfessionalProfile = async (data) => {
  const response = await api.put("/professional/profile", data);
  return response.data;
};

// Save draft
export const saveProfessionalProfileDraft = async (data) => {
  const response = await api.patch("/professional/profile", data);
  return response.data;
};

// Get executive recommendations & skill gaps
export const getProfessionalRecommendations = async () => {
  const response = await api.get("/professional/recommendations");
  return response.data;
};

// Get public/recruiter view
export const getPublicProfessionalProfile = async (usernameOrId) => {
  const response = await api.get(`/professional/public/${usernameOrId}`);
  return response.data;
};

export default {
  getProfessionalProfile,
  updateProfessionalProfile,
  saveProfessionalProfileDraft,
  getProfessionalRecommendations,
  getPublicProfessionalProfile,
};
