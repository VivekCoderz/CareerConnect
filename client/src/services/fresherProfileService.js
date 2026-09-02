import api from "../api/api.jsx";

// Get fresher profile
export const getFresherProfile = async () => {
  const response = await api.get("/fresher/profile");
  return response.data;
};

// Update fresher profile
export const updateFresherProfile = async (data) => {
  const response = await api.put("/fresher/profile", data);
  return response.data;
};

// Save fresher profile draft
export const saveFresherProfileDraft = async (data) => {
  const response = await api.patch("/fresher/profile", data);
  return response.data;
};

// Get fresher recommendations (skill gap & course matching)
export const getFresherRecommendations = async () => {
  const response = await api.get("/fresher/recommendations");
  return response.data;
};

// Get public fresher profile by username or id
export const getPublicFresherProfile = async (usernameOrId) => {
  const response = await api.get(`/fresher/public/${usernameOrId}`);
  return response.data;
};

export default {
  getFresherProfile,
  updateFresherProfile,
  saveFresherProfileDraft,
  getFresherRecommendations,
  getPublicFresherProfile,
};
