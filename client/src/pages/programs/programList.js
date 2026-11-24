// C12: the launch programmes as page data (C01, decided 24 Nov), until GET /api/programs
// (C09) serves them. Durations and key tools are from Ram Mohan sir's Programmes tab.
// Keep the slugs in step with the C05 data files so the cards open the right pages.

export const LEVELS = ["Foundation", "Professional", "Advanced"];

export const TRACKS = [
  { id: "data-ai", label: "Data & AI" },
  { id: "software", label: "Software Development" },
  { id: "cloud-security", label: "Cloud & Security" },
];

export const PROGRAMS = [
  {
    slug: "ai-generative-ai",
    title: "AI & Generative AI",
    duration: "8–12 weeks",
    track: "data-ai",
    tools: ["Generative AI", "LLMs", "Prompt Engineering", "AI Agents", "Python"],
  },
  {
    slug: "data-analytics-business-intelligence",
    title: "Data Analytics & Business Intelligence",
    duration: "10–12 weeks",
    track: "data-ai",
    tools: ["Python", "SQL", "Excel", "Power BI", "Data Visualisation"],
  },
  {
    slug: "full-stack-web-development",
    title: "Full Stack Web Development",
    duration: "12–16 weeks",
    track: "software",
    tools: ["HTML", "CSS", "JavaScript", "React", "Node.js", "MongoDB", "APIs"],
  },
  {
    slug: "cybersecurity-ethical-hacking",
    title: "Cybersecurity & Ethical Hacking",
    duration: "12–16 weeks",
    track: "cloud-security",
    tools: ["Networking", "Linux", "VAPT", "Security Tools", "SOC Fundamentals"],
  },
  {
    slug: "cloud-computing-devops",
    title: "Cloud Computing & DevOps",
    duration: "12–16 weeks",
    track: "cloud-security",
    tools: ["AWS/Azure", "Cloud Infrastructure", "Docker", "CI/CD", "Deployment"],
  },
];
