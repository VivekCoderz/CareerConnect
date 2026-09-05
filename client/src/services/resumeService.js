/**
 * Resume Service – Frontend
 * Token cookie mein hai → credentials: "include" se automatically jayega
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
// ↑ apna backend port daalo

/**
 * Generate resume from raw form data
 */
export const generateResumeAPI = async (rawData, template) => {
  const res = await fetch(`${API_BASE}/api/resume/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // cookie automatically bhejega
    body: JSON.stringify({ rawData, template }),
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
 * Save manual edits on the generated resume
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