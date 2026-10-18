// Whether a question counts as answered, for the palette and the submit check.
export const isAnswered = (question, answer) =>
  question.type === "mcq" ? Boolean(answer?.optionId) : question.type === "written" ? Boolean(answer?.text?.trim()) : Boolean(answer?.hasAudio);
