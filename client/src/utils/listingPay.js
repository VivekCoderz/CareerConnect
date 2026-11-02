const formatLakh = (n) => `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;

// Salary is shown only when the employer entered one.
export const formatPay = (job) => {
  if (job.employmentType === "Internship" && job.stipend) return job.stipend;
  const { min = 0, max = 0, isNegotiable } = job.salaryRange || {};
  if (!min && !max) return null;
  const range = min && max && min !== max ? `${formatLakh(min)} – ${formatLakh(max)}` : formatLakh(max || min);
  return `${range} / yr${isNegotiable ? " (negotiable)" : ""}`;
};
