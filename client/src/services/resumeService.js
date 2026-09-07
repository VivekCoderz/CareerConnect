/**
 * Resume Service – Frontend
 * Token cookie mein hai → credentials: "include" se automatically jayega
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
// ↑ apna backend port daalo

/**
 * Generate resume from raw form data
 */
export const generateResumeAPI = async (
  rawData,
  template,
  syncProfile = false,
) => {
  const res = await fetch(`${API_BASE}/api/resume/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // cookie automatically bhejega
    body: JSON.stringify({ rawData, template, syncProfile }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to generate resume");
  }

  return res.json();
};

/**
 * Update resume based on user instruction
 */
export const updateResumeAPI = async (currentResume, instruction) => {
  const res = await fetch(`${API_BASE}/api/resume/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // cookie automatically bhejega
    body: JSON.stringify({ currentResume, instruction }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update resume");
  }

  return res.json();
};

/**
 * Fetch the current logged-in user's saved resume (if any)
 */
export const fetchMyResumeAPI = async () => {
  const res = await fetch(`${API_BASE}/api/resume/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch resume");
  }

  return res.json();
};

/**
 * Fetch the current user's profile data mapped to resume rawData shape
 */
export const saveManualEditAPI = async (generatedData) => {
  const res = await fetch(`${API_BASE}/api/resume/manual`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ generatedData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to save manual edits");
  }

  return res.json();
};

/**
 * Fetch the current user's profile data pre-mapped into the resume rawData shape.
 * Returns { rawData, profileFound }
 */
export const fetchProfileForResumeAPI = async () => {
  const res = await fetch(`${API_BASE}/api/resume/profile-data`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch profile data");
  }

  return res.json();
};

/**
 * Upload resume PDF to existing upload endpoint
 */
export const uploadResumeAPI = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const res = await fetch(`${API_BASE}/api/resume/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to upload resume");
  }

  return res.json();
};
