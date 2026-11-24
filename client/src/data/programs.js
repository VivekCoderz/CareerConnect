// Career programmes shown on /programs (C13). The C05 content (syllabus, projects, tools,
// FAQ ...) is filled in here; a section with no content is not shown on the page.
//
// On purpose there are no trainer, batch or timing fields: the team shares those on the
// call after an enquiry, so the portal must never show them.

export const PROGRAM_LEVELS = [
  { value: "foundation", label: "Foundation" },
  { value: "professional", label: "Professional" },
  { value: "advanced", label: "Advanced" },
];

const program = (fields) => ({
  summary: "",
  syllabus: [], // [{ title, topics: [] }]
  projects: [],
  tools: [],
  mentorship: "",
  internship: "",
  // C02: E2Job issues the certificate alone for now; final wording comes from sir.
  certificate: "",
  faq: [], // [{ question, answer }]
  ...fields,
});

export const PROGRAMS = [
  program({ slug: "ai-generative-ai", title: "AI & Generative AI", duration: "8-12 weeks" }),
  program({
    slug: "data-analytics-business-intelligence",
    title: "Data Analytics & Business Intelligence",
    duration: "10-12 weeks",
  }),
  program({ slug: "full-stack-web-development", title: "Full Stack Web Development", duration: "12-16 weeks" }),
  program({
    slug: "cybersecurity-ethical-hacking",
    title: "Cybersecurity & Ethical Hacking",
    duration: "12-16 weeks",
  }),
  program({ slug: "cloud-computing-devops", title: "Cloud Computing & DevOps", duration: "12-16 weeks" }),
];

export const findProgram = (slug) => PROGRAMS.find((p) => p.slug === slug) || null;
