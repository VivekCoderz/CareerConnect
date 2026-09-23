import api from "../api/api";
import {
  scheduleInterview,
  getInterviews,
  getInterviewById,
  submitInterviewFeedback,
  submitScorecard,
  cancelInterview,
  rescheduleInterview,
} from "./recruitmentService";

export {
  scheduleInterview,
  getInterviews,
  getInterviewById,
  submitInterviewFeedback,
  submitScorecard,
  cancelInterview,
  rescheduleInterview,
};

// Aliases for convenience
export const createInterview = scheduleInterview;
export const submitInterviewScorecard = submitScorecard;
export const updateInterview = async (id, data) => {
  const res = await api.put(`/interviews/${id}`, data);
  return res.data;
};
