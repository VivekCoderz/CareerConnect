// Decides, without a network call, whether this page load is a campus portal
// (docs/campus/architecture.md, section 3). Known E2Job hosts open the normal app; any other
// host opens the campus app. In development, ?campus=<slug> opens the campus app on localhost.

const E2JOB_HOSTS = new Set(["e2job.com", "www.e2job.com", "localhost", "127.0.0.1"]);
const DEV_KEY = "campus_dev_tenant";

const readDevTenant = () => {
  if (!import.meta.env.DEV) return "";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("campus");
    if (fromUrl === "") sessionStorage.removeItem(DEV_KEY);
    else if (fromUrl) sessionStorage.setItem(DEV_KEY, fromUrl.toLowerCase());
    return sessionStorage.getItem(DEV_KEY) || "";
  } catch {
    return "";
  }
};

export const devTenant = readDevTenant();

export const isCampusHost = () => {
  if (import.meta.env.VITE_ENABLE_CAMPUS !== "true" && !devTenant) return false;
  const host = window.location.hostname.toLowerCase();
  if (devTenant) return true;
  // Vercel preview deployments of the main app stay on the main app.
  if (host.endsWith(".vercel.app")) return false;
  return !E2JOB_HOSTS.has(host);
};
