import api from "../api/api.jsx";

// Get complete professional dashboard data
export const getProfessionalDashboardData = async () => {
  const response = await api.get("/professional/dashboard");
  return response.data;
};

export default {
  getProfessionalDashboardData,
};
