const on = (v) => String(v).toLowerCase() === "true";

export const FEATURES = {
  courses: on(import.meta.env.VITE_ENABLE_COURSES),
  payments: on(import.meta.env.VITE_ENABLE_PAYMENTS),
  assessments: on(import.meta.env.VITE_ENABLE_ASSESSMENTS),
  aiInterview: on(import.meta.env.VITE_ENABLE_AI_INTERVIEW),
  // Off until saved jobs are actually stored (POST /api/student/save returns 501).
  savedJobs: on(import.meta.env.VITE_ENABLE_SAVED_JOBS),
};