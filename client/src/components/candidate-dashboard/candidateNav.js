import { FEATURES } from "../../config/features";

// The one dashboard shell (CandidateDashboardShell) is shared by students, freshers and
// professionals. Everything that differs by candidate type lives here: the menu, the hub
// label, the accent colours and where profile / settings go. Tailwind classes are written
// out in full so the build keeps them.

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  resume: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  liveResume: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  projects: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  skills: "M13 10V3L4 14h7v7l9-11h-7z",
  certifications: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  education: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  courses: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  applications: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  people: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  lightbulb: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  growth: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
};

// `link` items leave the dashboard; the rest are tabs. `feature` hides an item when that
// feature flag is off.
const STUDENT_NAV = [
  { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { id: "profile", label: "My Profile", link: "/student/profile", icon: ICONS.profile },
  { id: "resume", label: "Resume Builder", icon: ICONS.resume },
  // FL-15: Live Resume, the shareable web version of the candidate's resume
  { id: "live-resume", label: "Live Resume", link: "/live-resume", icon: ICONS.liveResume },
  { id: "projects", label: "My Projects", icon: ICONS.projects },
  { id: "skills", label: "Skills & Gap Analysis", icon: ICONS.skills },
  { id: "certifications", label: "Certifications", icon: ICONS.certifications },
  { id: "education", label: "Education", icon: ICONS.education },
  { id: "internships", label: "Internships", icon: ICONS.briefcase },
  { id: "jobs", label: "Jobs", icon: ICONS.building },
  { id: "courses", label: "Courses", icon: ICONS.courses, feature: "courses" },
  { id: "applications", label: "My Applications", icon: ICONS.applications },
  { id: "interviews", label: "My Interviews", icon: ICONS.calendar },
  { id: "saved", label: "Saved Opportunities", icon: ICONS.bookmark, feature: "savedJobs" },
  { id: "notifications", label: "Notifications", icon: ICONS.bell },
  { id: "support", label: "Help & Support", icon: ICONS.help },
];

const FRESHER_NAV = [
  { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { id: "jobs", label: "Find Jobs", icon: ICONS.briefcase },
  { id: "internships", label: "Internships", icon: ICONS.building },
  { id: "applications", label: "Applications", icon: ICONS.applications },
  { id: "interviews", label: "Interviews", icon: ICONS.people },
  { id: "courses", label: "Courses", icon: ICONS.courses, feature: "courses" },
  { id: "skills", label: "Skills", icon: ICONS.skills },
  { id: "resume", label: "Resume", icon: ICONS.resume },
  { id: "projects", label: "Projects", icon: ICONS.projects },
  { id: "recommendations", label: "Career Advice", icon: ICONS.lightbulb, feature: "careerAdvice" },
  { id: "notifications", label: "Notifications", icon: ICONS.bell },
  { id: "profile", label: "My Profile", link: "/fresher/profile", icon: ICONS.profile },
  { id: "support", label: "Help & Support", icon: ICONS.help },
];

const PROFESSIONAL_NAV = [
  { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { id: "opportunities", label: "Opportunities", icon: ICONS.briefcase },
  { id: "jobs", label: "Browse Jobs", icon: ICONS.search },
  { id: "internships", label: "Internships", icon: ICONS.building },
  { id: "courses", label: "Courses", icon: ICONS.courses, feature: "courses" },
  { id: "interviews", label: "Interviews", icon: ICONS.people },
  { id: "applications", label: "Applications", icon: ICONS.applications },
  { id: "growth", label: "Career Growth", icon: ICONS.growth },
  { id: "skills", label: "Skills", icon: ICONS.skills },
  { id: "resume", label: "Resume", link: "/resume-builder", icon: ICONS.resume },
  { id: "achievements", label: "Achievements", icon: ICONS.sparkles },
  { id: "certifications", label: "Certifications", icon: ICONS.certifications },
  { id: "notifications", label: "Notifications", icon: ICONS.bell },
  { id: "profile", label: "My Profile", link: "/professional/profile", icon: ICONS.profile },
  { id: "support", label: "Help & Support", icon: ICONS.help },
];

export const CANDIDATE_TYPES = {
  student: {
    label: "Student",
    hubLabel: "Student Hub",
    homePath: "/student/dashboard",
    profilePath: "/student/profile",
    nav: STUDENT_NAV,
    // Settings: none in the sidebar; the account menu links to /account.
    settings: null,
    theme: {
      hubText: "text-blue-600",
      navActive: "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20",
      navIdle: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      linkIconHover: "group-hover:text-blue-600",
      buttonHover: "hover:text-blue-600 hover:bg-blue-50",
      avatar: "bg-blue-600",
      menuHover: "hover:text-blue-600",
      typeText: "text-blue-600",
    },
  },
  fresher: {
    label: "Fresher",
    hubLabel: "Fresher Hub",
    homePath: "/fresher/dashboard",
    profilePath: "/fresher/profile",
    nav: FRESHER_NAV,
    settings: { link: "/account", label: "Settings" },
    theme: {
      hubText: "text-[#f59e0b]",
      navActive: "bg-[#1e3a8a] text-white font-semibold shadow-sm shadow-blue-900/20",
      navIdle: "text-slate-600 hover:bg-blue-50 hover:text-[#1e3a8a]",
      linkIconHover: "group-hover:text-[#1e3a8a]",
      buttonHover: "hover:text-blue-600 hover:bg-blue-50",
      avatar: "bg-gradient-to-br from-[#1e3a8a] to-blue-700",
      menuHover: "hover:text-[#1e3a8a]",
      typeText: "text-[#f59e0b]",
    },
  },
  professional: {
    label: "Professional",
    hubLabel: "Professional Hub",
    homePath: "/professional/dashboard",
    profilePath: "/professional/profile",
    nav: PROFESSIONAL_NAV,
    // Career & privacy settings are a dashboard tab for professionals.
    settings: { tab: "settings", label: "Settings", menuLabel: "Career & Privacy Settings" },
    theme: {
      hubText: "text-purple-600",
      navActive: "bg-purple-600 text-white font-semibold shadow-sm shadow-purple-600/25",
      navIdle: "text-slate-600 hover:bg-purple-50 hover:text-purple-700",
      linkIconHover: "group-hover:text-purple-600",
      buttonHover: "hover:text-purple-600 hover:bg-purple-50",
      avatar: "bg-gradient-to-br from-purple-600 to-indigo-700",
      menuHover: "hover:text-purple-700",
      typeText: "text-purple-600",
    },
  },
};

export const SETTINGS_ICON = [
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
];

/** The menu items shown for this candidate type, with feature-flagged ones left out. */
export const navItemsFor = (type) =>
  CANDIDATE_TYPES[type].nav.filter((item) => !item.feature || FEATURES[item.feature]);
