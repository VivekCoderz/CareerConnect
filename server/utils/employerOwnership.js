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

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * The company behind a public /companies/:id page (CC-01): `id` is an EmployerProfile id or
 * its user's id. Returns { profile, company, scope }, where company is the employer's active
 * Company (if any) and scope is for listingOwnerClauses (their own listings plus colleagues'
 * under that Company). Returns null when there is no such company to show: an unknown id,
 * a profile without its user account, or a company that is inactive or deleted (ADM-11/12).
 * Whether the showcase itself is public (published and approved) is up to the caller.
 */
const findCompanyPage = async (id) => {
  if (!OBJECT_ID.test(String(id || ""))) return null;
  const profile = await EmployerProfile.findOne({ $or: [{ _id: id }, { userId: id }] })
    .populate("userId", "fullName email profileImage companyId");
  if (!profile?.userId) return null;

  const company = await getActiveCompany(profile.userId);
  if (profile.userId.companyId && !company) return null;
  return {
    profile,
    company,
    scope: { userId: profile.userId._id, profileId: profile._id, companyId: company?._id || null },
  };
};

/**
 * For the public list endpoints' ?company=<id> filter (CC-01): { invalid: true } for a
 * malformed id, otherwise { clause } to add under $and. The clause matches that company
 * page's listings, or nothing when there is no such company page.
 */
const companyListingFilter = async (id) => {
  if (!OBJECT_ID.test(String(id))) return { invalid: true };
  const page = await findCompanyPage(id);
  return { clause: page ? { $or: listingOwnerClauses(page.scope) } : { _id: null } };
};

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
  findCompanyPage,
  companyListingFilter,
  getOwnerScope,
  listingOwnerClauses,
  applicationOwnerClauses,
  interviewOwnerClauses,
  findOwnedApplication,
};
