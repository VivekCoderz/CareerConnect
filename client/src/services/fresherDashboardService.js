import api from "../api/api.jsx";

// Get complete fresher dashboard data
export const getFresherDashboardData = async () => {
  const response = await api.get("/fresher/dashboard");
  return response.data;
};

export default {
  getFresherDashboardData,
};
