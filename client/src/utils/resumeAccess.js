// Authenticated Cloudinary resumes must be opened through the API, which checks
// the owner or the employer attached to the application before signing access.
export const getResumeHref = (url) => {
  if (typeof url !== "string" || !url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    if (parsed.hostname !== "res.cloudinary.com" ||
        !/^\/[^/]+\/raw\/authenticated\//.test(parsed.pathname)) return url;
    const apiBase = (import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    return `${apiBase}/resume/download?url=${encodeURIComponent(url)}`;
  } catch {
    return "";
  }
};
