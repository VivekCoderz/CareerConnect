import api from "../api/api.jsx";

// Get market analytics and hiring trends
export const getMarketInsights = async ({ role, location, period, experience } = {}) => {
  const params = {};
  if (role) params.role = role;
  if (location) params.location = location;
  if (period) params.period = period;
  if (experience) params.experience = experience;

  const response = await api.get("/professional/market-insights", { params });
  return response.data;
};

// Get company profile and matching job openings
export const getCompanyDetails = async (companySlug) => {
  const response = await api.get(`/professional/companies/${companySlug}`);
  return response.data;
};

export default {
  getMarketInsights,
  getCompanyDetails,
};
