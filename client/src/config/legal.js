// Details shown on /privacy, /terms and /contact (G05). Fill these in from the final
// legal text before launch. Anything left null renders as a highlighted "[...]" marker
// and keeps the "Draft" banner on all three pages, so an unfinished page is obvious.
export const LEGAL = {
  version: "2026-10-01",
  lastUpdated: "4 October 2026", // date the final text is published

  // Details from Ram (4 Oct). The legal name is provisional ("for now").
  entityName: "CareerConnect", // registered legal name of the company operating CareerConnect
  registeredAddress:
    "First Floor, 23, Ashoka Apartment, Pocket 11A, Rohini Sector 23, New Delhi, North West Delhi, Delhi 201005",
  jurisdictionCity: "Delhi", // courts with jurisdiction (Terms §12)

  grievanceOfficer: "Amit Verma", // name of the Grievance Officer (DPDP Act)
  // Placeholder inboxes on the company domain until the real ones are set up; each
  // must be a monitored mailbox before launch (grievance is a DPDP requirement).
  emails: {
    grievance: "grievance@e2job.com",
    support: "support@e2job.com",
    report: "report@e2job.com",
    employers: "employers@e2job.com",
    partnerships: "partnerships@e2job.com",
  },

  deletionDays: 30, // days to delete profile and resumes after account deletion
  resolutionDays: 30, // days to resolve a grievance
};

/** Version of the Terms and Privacy Policy a new account agrees to; sent as termsVersion at signup. */
export const TERMS_VERSION = LEGAL.version;

const required = [
  LEGAL.lastUpdated,
  LEGAL.entityName,
  LEGAL.registeredAddress,
  LEGAL.jurisdictionCity,
  LEGAL.grievanceOfficer,
  ...Object.values(LEGAL.emails),
  LEGAL.deletionDays,
  LEGAL.resolutionDays,
];

export const isLegalComplete = required.every((value) => value !== null && value !== "");
