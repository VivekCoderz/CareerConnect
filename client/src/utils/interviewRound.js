// Shared by the application trackers: a round the candidate has reached but that has no
// result yet is "Scheduled" once an interview is booked, "Not started" if the round is an
// interview (e.g. "HR Round") without one, and otherwise in progress (screening, tests).

/**
 * @param {{ name?: string, type?: string }} stage - recruitment stage
 * @returns {boolean} whether the round happens in an interview
 */
export const isInterviewRound = (stage) => /\binterview\b|\bhr\b/i.test(`${stage?.type || ""} ${stage?.name || ""}`);

/**
 * @param {{ status?: string } | null | undefined} interview
 * @returns {boolean} whether the interview is booked (scheduled or rescheduled)
 */
export const isBookedInterview = (interview) =>
  ["scheduled", "rescheduled"].includes(interview?.status?.toLowerCase());

/**
 * @param {object} stage - recruitment stage
 * @param {object|null} interview - the round's interview, if any
 * @returns {"scheduled" | "not started" | "in progress"}
 */
export const openRoundStatus = (stage, interview) =>
  isBookedInterview(interview) ? "scheduled" : isInterviewRound(stage) ? "not started" : "in progress";
