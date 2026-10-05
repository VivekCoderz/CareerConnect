import api from "../api/api";

const isProtectedResumeUrl = (parsed) =>
  parsed.hostname === "res.cloudinary.com" &&
  /^\/[^/]+\/raw\/authenticated\//.test(parsed.pathname);

// Authenticated Cloudinary resumes must be opened through the API, which checks
// the owner or the employer attached to the application before signing access.
export const getResumeHref = (url) => {
  if (typeof url !== "string" || !url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    if (!isProtectedResumeUrl(parsed)) return url;
    const apiBase = (import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    return `${apiBase}/resume/download?url=${encodeURIComponent(url)}`;
  } catch {
    return "";
  }
};

const needsApiAccess = (url) => {
  try {
    return isProtectedResumeUrl(new URL(url));
  } catch {
    return false;
  }
};

const errorMessage = async (err) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // not JSON, fall through
    }
  }
  if (err.response?.status === 403) return "You don't have access to this resume.";
  if (err.response?.status === 404) return "This resume could not be found.";
  return "The resume could not be opened. Please try again.";
};

/**
 * Opens a resume in a new tab. Protected resumes are fetched through the api client,
 * which sends the Bearer token, so this works when third-party cookies are blocked
 * (a plain link to /resume/download would arrive without credentials).
 * Call it directly from a click handler so the new tab isn't blocked as a popup.
 * @param {string} url - stored resume URL
 */
export const openResume = async (url) => {
  const href = getResumeHref(url);
  if (!href) {
    window.alert("This resume link is not valid.");
    return;
  }
  if (!needsApiAccess(url)) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }

  // Open the tab before the request: browsers (Safari especially) block window.open
  // calls that happen after an await.
  const tab = window.open("", "_blank");
  if (tab) {
    tab.opener = null;
    tab.document.title = "Loading resume…";
    tab.document.body.textContent = "Loading resume…";
  }

  try {
    // The API redirects to a short-lived signed Cloudinary URL. Cloudinary allows any
    // origin but not credentials, so this request must not send cookies; the Bearer
    // token added by the api client authenticates it.
    const res = await api.get("/resume/download", {
      params: { url },
      responseType: "blob",
      withCredentials: false,
      timeout: 30_000,
    });
    let blob = res.data;
    if (!blob.type || blob.type === "application/octet-stream") {
      blob = new Blob([blob], { type: "application/pdf" });
    }
    const objectUrl = URL.createObjectURL(blob);
    if (tab && !tab.closed) {
      // If the browser downloads PDFs instead of showing them (a browser setting or a
      // download-manager extension), the tab stays on this page, so leave a way forward.
      const doc = tab.document;
      doc.title = "Your resume";
      doc.body.textContent = "";
      const note = doc.createElement("p");
      note.textContent = "Opening your resume… If it doesn't appear, check your Downloads folder or ";
      const link = doc.createElement("a");
      link.href = objectUrl;
      link.textContent = "open it here";
      note.appendChild(link);
      note.append(".");
      doc.body.appendChild(note);
      tab.location.href = objectUrl;
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    // Keep the URL alive long enough for the fallback link in the tab to work.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10 * 60_000);
  } catch (err) {
    if (tab && !tab.closed) tab.close();
    window.alert(await errorMessage(err));
  }
};
