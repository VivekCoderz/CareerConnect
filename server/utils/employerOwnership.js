// One ownership check for employer data (BUG-05..13): a listing, application or interview
// belongs to this employer when they created it / it is under their EmployerProfile, or it
// belongs to their company. The company context only counts while the company exists and
// is active (ADM-11/12): an inactive or deleted company shares nothing.

const Company = require("../models/Company");
const EmployerProfile = require("../models/EmployerProfile");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const Application = require("../models/Application");

const isCompanyActive = (company) => Boolean(company) && String(company.status || "").toLowerCase() === "active";

/** The user's company if it exists and is active, otherwise null. */
const getActiveCompany = async (user) => {
  if (!user?.companyId) return null;
  const company = await Company.findById(user.companyId).lean();
  return isCompanyActive(company) ? company : null;
};

/**
 * Whether GET /api/companies/:id shows this EmployerProfile: published, admin-approved, and
 * the employer's company (if any) active. `profile.userId` must be populated with companyId.
 */
const isPublicEmployerProfile = async (profile) =>
  Boolean(profile) &&
  profile.isPublished === true &&
  profile.verificationStatus === "approved" &&
  (!profile.userId?.companyId || Boolean(await getActiveCompany(profile.userId)));

/** { userId, profileId, companyId } for ownership queries. */
const getOwnerScope = async (user) => {
  const [profile, company] = await Promise.all([
    EmployerProfile.findOne({ userId: user._id }).select("_id").lean(),
    getActiveCompany(user),
  ]);
  return { userId: user._id, profileId: profile?._id || null, companyId: company?._id || null };
};

// Older listings and applications store the owner's user id in employerId.
const ownerIdClauses = (scope) => [
  { employerId: scope.userId },
  ...(scope.profileId ? [{ employerId: scope.profileId }] : []),
  ...(scope.companyId ? [{ companyId: scope.companyId }] : []),
];

/** $or clauses for jobs / internships owned by this employer. */
const listingOwnerClauses = (scope) => [{ createdBy: scope.userId }, ...ownerIdClauses(scope)];

/** $or clauses for applications to this employer's listings. */
const applicationOwnerClauses = async (scope) => {
  const listingFilter = { $or: listingOwnerClauses(scope) };
  const [jobIds, internshipIds] = await Promise.all([
    Job.distinct("_id", listingFilter),
    Internship.distinct("_id", listingFilter),
  ]);
  return [
    ...ownerIdClauses(scope),
    ...(jobIds.length ? [{ jobId: { $in: jobIds } }] : []),
    ...(internshipIds.length ? [{ internshipId: { $in: internshipIds } }] : []),
  ];
};

/** $or clauses for interviews run by this employer. */
const interviewOwnerClauses = (scope) => ownerIdClauses(scope);

/**
 * The application if it belongs to this employer, otherwise null.
 * populate: list of populate() argument arrays, e.g. [["jobId"], ["candidateId", "fullName"]].
 */
const findOwnedApplication = async (user, applicationId, populate = []) => {
  const scope = await getOwnerScope(user);
  let query = Application.findOne({ _id: applicationId, $or: await applicationOwnerClauses(scope) });
  for (const args of populate) query = query.populate(...args);
  return query;
};

module.exports = {
  isCompanyActive,
  getActiveCompany,
  isPublicEmployerProfile,
  getOwnerScope,
  listingOwnerClauses,
  applicationOwnerClauses,
  interviewOwnerClauses,
  findOwnedApplication,
};
