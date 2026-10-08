import { SITE_NAME, SITE_URL } from "../config/site";
import { deadlineEndIST } from "./listingDeadline";

// Google for Jobs structured data (G02): https://developers.google.com/search/docs/appearance/structured-data/job-posting
const EMPLOYMENT_TYPES = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Contract: "CONTRACTOR",
  Freelance: "CONTRACTOR",
  Internship: "INTERN",
  Trainee: "OTHER",
};

const isHttpUrl = (url) => typeof url === "string" && /^https?:\/\//i.test(url);

// Google prefers ISO 3166-1 alpha-2 codes for addressCountry.
const countryCode = (country) => (/^india$/i.test(String(country).trim()) ? "IN" : String(country).trim());

/**
 * Builds a schema.org JobPosting for a job posted on E2Job by an employer (stored with source "CareerConnect").
 * Returns null for external or scraped listings (Google penalises JobPosting markup on jobs the
 * site doesn't own) and when there is no company name (hiringOrganization is required).
 * Only fields the job actually has are included; nothing is filled in.
 * @param {object} job - job from GET /api/jobs/:id (employerId populated)
 * @returns {object|null}
 */
export const buildJobPostingSchema = (job) => {
  if (!job || job.isExternal || (job.source && job.source !== "CareerConnect")) return null;

  const company = job.employerId && typeof job.employerId === "object" ? job.employerId : {};
  const companyName = (company.companyName || job.companyName || "").trim();
  if (!companyName) return null;

  const remote = job.workMode === "Remote";
  const schema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: (job.description || job.title || "").replace(/\n/g, "<br>"),
    // Visible to candidates from approval, not from when the draft was created.
    datePosted: job.approvedAt || job.createdAt,
    identifier: { "@type": "PropertyValue", name: SITE_NAME, value: String(job._id) },
    url: `${SITE_URL}/jobs/${job._id}`,
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      ...(isHttpUrl(company.website) ? { sameAs: company.website } : {}),
      ...(isHttpUrl(company.logo) ? { logo: company.logo } : {}),
    },
  };

  if (EMPLOYMENT_TYPES[job.employmentType]) schema.employmentType = EMPLOYMENT_TYPES[job.employmentType];

  // Applications close at the end of the deadline day in IST (same rule as the server).
  const validThrough = deadlineEndIST(job.deadline);
  if (validThrough) schema.validThrough = validThrough.toISOString();

  if (remote) {
    schema.jobLocationType = "TELECOMMUTE";
    // Restrict applicants to a country only when the job names one and isn't open internationally.
    if (job.country && !job.isInternational) {
      schema.applicantLocationRequirements = { "@type": "Country", name: job.country };
    }
  }
  if (!remote || job.city) {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city || job.location || undefined,
        ...(job.state ? { addressRegion: job.state } : {}),
        ...(job.country ? { addressCountry: countryCode(job.country) } : {}),
      },
    };
  }

  // Salary only when the employer entered a real one.
  const { min = 0, max = 0, currency = "INR" } = job.salaryRange || {};
  if (min > 0 || max > 0) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency,
      value: {
        "@type": "QuantitativeValue",
        ...(min > 0 ? { minValue: min } : {}),
        ...(max > 0 ? { maxValue: max } : {}),
        unitText: "YEAR",
      },
    };
  }

  const { minYears } = job.experience || {};
  if (Number.isFinite(minYears) && minYears > 0) {
    schema.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: minYears * 12,
    };
  }
  if (job.requiredSkills?.length) schema.skills = job.requiredSkills.join(", ");

  return schema;
};

/** Serialises structured data for a <script type="application/ld+json"> tag without allowing "</script>" breakouts. */
export const toJsonLd = (schema) => JSON.stringify(schema).replace(/</g, "\\u003c");
