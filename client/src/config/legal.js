// Details shown on /privacy, /terms and /contact (G05). Fill these in from the final
// legal text before launch. Anything left null renders as a highlighted "[...]" marker
// and keeps the "Draft" banner on all three pages, so an unfinished page is obvious.
export const LEGAL = {
  version: "2026-10-01",
  lastUpdated: null, // date the final text is published, e.g. "10 October 2026"

  entityName: null, // registered legal name of the company operating CareerConnect
  registeredAddress: null,
  jurisdictionCity: null, // courts with jurisdiction (Terms §12)

  grievanceOfficer: null, // name of the Grievance Officer (DPDP Act)
  emails: {
    grievance: null,
    support: null,
    report: null,
    employers: null,
    partnerships: null,
  },

  deletionDays: null, // days to delete profile and resumes after account deletion (draft: 30)
  resolutionDays: null, // days to resolve a grievance (draft: 30)
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
