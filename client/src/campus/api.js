import axios from "axios";
import { devTenant } from "./host";

// The campus client only talks to /api/campus (architecture rule 3). Its token is kept apart
// from the main app's token.

const TOKEN_KEY = "campus_token";
const ROOT = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL || "/api";

export const campusApi = axios.create({ baseURL: `${ROOT}/campus`, timeout: 30000 });

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode without storage: the session simply ends with the tab.
  }
};

campusApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (devTenant) config.headers["X-Campus-Tenant"] = devTenant;
  return config;
});

/** A readable message from an API error. */
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || (error?.code === "ECONNABORTED" ? "The connection is slow. Please try again." : fallback);

export const errorCode = (error) => error?.response?.data?.code || "";

/** Downloads a report with the token and saves it under its file name. */
export const downloadFile = async (path, fileName) => {
  const res = await campusApi.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** E2Job staff sign in with the existing admin login (architecture section 5). */
export const adminLogin = async (emailOrUsername, password) => {
  // No cookies: the campus portal uses the returned token only.
  const res = await axios.post(`${ROOT}/admin/login`, { emailOrUsername, password });
  return res.data;
};
