import api from "../api/api";

/**
 * Fetches the currently authenticated user from backend.
 * Uses HTTP-only cookie or stored token automatically.
 */
export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

/**
 * Logs out the current user.
 */
export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

/**
 * Updates user profile / experience level or user type.
 */
export const updateUserType = async (userType) => {
  const response = await api.patch("/auth/update-experience-level", {
    userType,
  });
  return response.data;
};
