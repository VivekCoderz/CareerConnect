import axios from "axios";
import { store } from "../redux/store";
import { logout, setSessionExpired } from "../redux/features/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

/**
 * Response interceptor — handles 401 Unauthorized globally.
 *
 * When the CareerConnect JWT expires or becomes invalid:
 *   1. Redux auth state is cleared (logout)
 *   2. sessionExpired flag is set (shows friendly message on Login page)
 *   3. Browser is redirected to /login?expired=1
 *
 * Auth pages (/login, /register) are excluded to prevent redirect loops.
 */
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