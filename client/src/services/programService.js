import api from "../api/api.jsx";

// Career programmes (C09): public data served from the C05 files.

/** One programme with its full detail; a 404 means unknown or unpublished. */
export const getProgram = async (slug) => {
  const response = await api.get(`/programs/${encodeURIComponent(slug)}`);
  return response.data.program;
};

export default { getProgram };
