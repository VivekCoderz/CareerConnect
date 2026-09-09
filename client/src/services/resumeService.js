/**
 * Resume Service – Frontend
 * Uses shared api instance (withCredentials + Authorization header)
 */
import api from "../api/api";

/**
 * Generate resume from raw form data
 */
export const generateResumeAPI = async (
  rawData,
  template,
  syncProfile = false,
) => {
  const res = await api.post("/resume/generate", {
    rawData,
    template,
    syncProfile,
  });
  return res.data;
};

/**
 * Update resume based on user instruction
 */
export const updateResumeAPI = async (currentResume, instruction) => {
  const res = await api.post("/resume/update", {
    currentResume,
    instruction,
  });
  return res.data;
};

/**
 * Fetch the current logged-in user's saved resume (if any)
 */
export const fetchMyResumeAPI = async () => {
  const res = await api.get("/resume/me");
  return res.data;
};

/**
 * Save manual edits to resume
 */
export const saveManualEditAPI = async (generatedData) => {
  const res = await api.put("/resume/manual", { generatedData });
  return res.data;
};

/**
 * Fetch the current user's profile data pre-mapped into the resume rawData shape.
 * Returns { rawData, profileFound }
 */
export const fetchProfileForResumeAPI = async () => {
  const res = await api.get("/resume/profile-data");
  return res.data;
};

/**
 * Upload resume PDF to existing upload endpoint
 */
export const uploadResumeAPI = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const res = await api.post("/resume/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/**
 * Fetch all saved resumes of the current user
 */
export const fetchAllResumesAPI = async () => {
  const res = await api.get("/resume");
  return res.data;
};

/**
 * Save final resume with title and primary toggle
 */
export const saveFinalResumeAPI = async (payload) => {
  const res = await api.post("/resume/save", payload);
  return res.data;
};

/**
 * Fetch a single resume by its ID
 */
export const getResumeByIdAPI = async (id) => {
  const res = await api.get(`/resume/${id}`);
  return res.data;
};

/**
 * Set a resume as primary active
 */
export const setPrimaryResumeAPI = async (id) => {
  const res = await api.patch(`/resume/${id}/primary`);
  return res.data;
};

/**
 * Delete a resume by ID
 */
export const deleteResumeAPI = async (id) => {
  const res = await api.delete(`/resume/${id}`);
  return res.data;
};

/**
 * Upload and parse resume PDF with AI
 */
export const parseResumeAPI = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const res = await api.post("/resume/parse", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/**
 * Confirm and save verified parsed resume data into user profile
 */
export const confirmParsedProfileAPI = async (payload) => {
  const res = await api.post("/resume/confirm-parsed", payload);
  return res.data;
};

/**
 * Generate an opportunity-tailored resume (zero hallucination, verified profile/resume data only)
 */
export const tailorResumeAPI = async (payload) => {
  const res = await api.post("/resume/tailor", payload);
  return res.data;
};

/**
 * Fetch existing tailored resume for a specific job or internship
 */
export const fetchTailoredResumeAPI = async (opportunityType, id) => {
  const res = await api.get(`/resume/tailored/${opportunityType}/${id}`);
  return res.data;
};

