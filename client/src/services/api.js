import axios from "axios";
import { store } from "../redux/store";
import { logout, setSessionExpired } from "../redux/features/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      const isAuthPage =
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/register") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/set-password");

      if (!isAuthPage) {
        store.dispatch(logout());
        store.dispatch(setSessionExpired(true));

        window.location.replace("/login?expired=1");
      }
    }

    return Promise.reject(error);
  }
);

export default api;