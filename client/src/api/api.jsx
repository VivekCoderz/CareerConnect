import axios from "axios";
import { store } from "../redux/store";
import { logout, setSessionExpired } from "../redux/features/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Request interceptor — attaches Bearer token from localStorage as fallback for cookies
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("careerconnect_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor — handles 401 Unauthorized globally.
 *
 * When the CareerConnect JWT expires or becomes invalid:
 *   1. Redux auth state is cleared (logout)
 *   2. sessionExpired flag is set (shows friendly message on Login page)
 *   3. Browser is redirected to /login?expired=1
 *
 * Public and auth pages are excluded to prevent redirect loops.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const isMeCheck = requestUrl.includes("/auth/me");
      const currentPath = window.location.pathname;

      const isPublicOrAuthPage =
        currentPath === "/" ||
        currentPath.startsWith("/home") ||
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/register") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/set-password") ||
        currentPath.startsWith("/companies") ||
        currentPath.startsWith("/opportunities");

      if (!isMeCheck && !isPublicOrAuthPage) {
        // Clear auth state
        store.dispatch(logout());
        store.dispatch(setSessionExpired(true));
        // Redirect with expired flag so Login page shows the friendly message
        window.location.replace("/login?expired=1");
      }
    }
    return Promise.reject(error);
  }
);

export default api;