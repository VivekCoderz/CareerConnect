const EmployerProfile = require("../models/EmployerProfile");
const { getActiveCompany } = require("../utils/employerOwnership");

const AWAITING_VERIFICATION = "Your company is awaiting verification";

const isEmployerApproved = (profile) => profile?.verificationStatus === "approved";

/**
 * Verification fields for a newly created employer profile, honouring the
 * autoApproveEmployers platform setting.
 */
const initialVerificationFields = (settings, now = new Date()) =>
  settings?.autoApproveEmployers
    ? { verificationStatus: "approved", verifiedAt: now, verifiedBy: null }
    : { verificationStatus: "pending" };

/**
 * Blocks posting unless the employer's profile has been approved by a platform admin
 * and, for an employer linked to a company, that company is active.
 * Pass `when(req)` to enforce only for some requests (e.g. re-publishing).
 * Attaches the profile as req.employerProfile.
 */
const requireVerifiedEmployer = ({ when } = {}) => async (req, res, next) => {
  try {
    if (when && !when(req)) return next();

    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    if (!isEmployerApproved(profile)) {
      return res.status(403).json({
        success: false,
        code: "EMPLOYER_NOT_VERIFIED",
        verificationStatus: profile?.verificationStatus || null,
        message: AWAITING_VERIFICATION,
      });
    }

    // An employer linked to a company can't post while that company is inactive or
    // deleted (ADM-11/12).
    if (req.user.companyId && !(await getActiveCompany(req.user))) {
      return res.status(403).json({
        success: false,
        code: "COMPANY_INACTIVE",
        message: "Your company account is not active, so new listings can't be posted.",
      });
    }

    req.employerProfile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};

// The status endpoints only need verification when a listing is being (re)published.
const requireVerifiedEmployerToPublish = requireVerifiedEmployer({
  when: (req) => req.body?.status === "Published",
});

module.exports = {
  AWAITING_VERIFICATION,
  isEmployerApproved,
  initialVerificationFields,
  requireVerifiedEmployer: requireVerifiedEmployer(),
  requireVerifiedEmployerToPublish,
};
