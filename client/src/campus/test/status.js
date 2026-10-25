import { isAnswered } from "./answers";

// Question states shown in the palette, the legend and the submit summary (CAT-style).
export const STATUS = {
  answered: { label: "Answered", chip: "border-emerald-500 bg-emerald-500 text-white" },
  answered_review: { label: "Answered and bookmarked", chip: "border-violet-600 bg-violet-600 text-white" },
  review: { label: "Bookmarked", chip: "border-violet-300 bg-violet-100 text-violet-800" },
  not_answered: { label: "Not answered", chip: "border-rose-300 bg-rose-50 text-rose-700" },
  not_visited: { label: "Not visited", chip: "border-slate-300 bg-white text-slate-500" },
};

export const ORDER = ["answered", "not_answered", "review", "answered_review", "not_visited"];

export const statusOf = (question, answer, bookmarked, visited) => {
  const done = isAnswered(question, answer);
  if (bookmarked) return done ? "answered_review" : "review";
  if (done) return "answered";
  return visited ? "not_answered" : "not_visited";
};

export const countBy = (statuses) => {
  const counts = Object.fromEntries(ORDER.map((k) => [k, 0]));
  Object.values(statuses).forEach((s) => { counts[s] += 1; });
  return counts;
};
