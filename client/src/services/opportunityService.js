import api from "../api/api";

export const getOpportunities = async (params = {}) => {
  const { data } = await api.get("/opportunities", { params });
  return data;
};

export const getOpportunityMetadata = async () => {
  const { data } = await api.get("/opportunities/meta");
  return data;
};

export const getHealth = async () => {
  const { data } = await api.get("/health");
  return data;
};

const opportunityService = {
  getOpportunities,
  getOpportunityMetadata,
  getHealth,
};

export default opportunityService;
