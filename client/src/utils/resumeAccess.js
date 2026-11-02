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


const NOT_A_PDF = "NOT_A_PDF";

const errorMessage = async (err) => {
  if (err.message === NOT_A_PDF) return "This resume file is not a valid PDF.";
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

// Fetches a protected resume through the api client, which sends the Bearer token, so
// this works when third-party cookies are blocked (a plain link to /resume/download
// would arrive without credentials). The API redirects to a short-lived signed
// Cloudinary URL. Cloudinary allows any origin but not credentials, so this request
// must not send cookies.
const fetchResumePdf = async (url) => {
  const res = await api.get("/resume/download", {
    params: { url },
    responseType: "blob",
    withCredentials: false,
    timeout: 30_000,
  });
  // Uploads are PDF only (G10). Browsers save any blob not typed application/pdf
  // instead of showing it, so check the file signature and type it ourselves rather
  // than trusting the response Content-Type.
  const signature = await res.data.slice(0, 5).text();
  if (signature !== "%PDF-") throw new Error(NOT_A_PDF);
  return new Blob([res.data], { type: "application/pdf" });
};

/**
 * Opens a resume in a new tab for viewing. Never downloads it; use downloadResume.
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
  if (!tab) {
    window.alert("Your browser blocked the resume tab. Allow pop-ups for this site and try again.");
    return;
  }
  tab.document.title = "Loading resume…";
  tab.document.body.textContent = "Loading resume…";

  try {
    const objectUrl = URL.createObjectURL(await fetchResumePdf(url));
    if (tab.closed) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    // If the browser is set to download PDFs instead of showing them, the tab stays on
    // this page, so leave a way forward.
    const doc = tab.document;
    doc.title = "Resume";
    doc.body.textContent = "";
    const note = doc.createElement("p");
    note.textContent = "Opening the resume… If it doesn't appear, ";
    const link = doc.createElement("a");
    link.href = objectUrl;
    link.textContent = "open it here";
    note.appendChild(link);
    note.append(".");
    doc.body.appendChild(note);
    tab.location.href = objectUrl;
    // Cut the opener only after navigating: Chrome opens a blob URL navigated from a
    // tab with no opener in another new tab, leaving this one stuck on the note above.
    tab.opener = null;
    // Keep the URL alive long enough for the fallback link in the tab to work.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10 * 60_000);
  } catch (err) {
    if (!tab.closed) tab.close();
    window.alert(await errorMessage(err));
  }
};

/**
 * Downloads a resume as a PDF file.
 * @param {string} url - stored resume URL
 * @param {string} [name] - candidate name, used for the file name
 */
export const downloadResume = async (url, name) => {
  const href = getResumeHref(url);
  if (!href) {
    window.alert("This resume link is not valid.");
    return;
  }
  // Resumes stored outside our Cloudinary account can't be fetched cross-origin, so
  // hand them to the browser.
  if (!needsApiAccess(url)) {
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const objectUrl = URL.createObjectURL(await fetchResumePdf(url));
    const safeName = (name || "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = safeName ? `${safeName}_Resume.pdf` : "resume.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    window.alert(await errorMessage(err));
  }
};
