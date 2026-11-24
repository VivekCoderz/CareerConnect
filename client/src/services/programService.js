import api from "../api/api.jsx";

/** Sends a programme enquiry (C10): the team calls the student back. Not an enrolment. */
export const submitProgramEnquiry = async (slug, enquiry) => {
  const response = await api.post(`/programs/${encodeURIComponent(slug)}/enquiry`, enquiry);
  return response.data;
};

export default { submitProgramEnquiry };
