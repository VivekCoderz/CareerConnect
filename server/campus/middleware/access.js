// Header-only sign-in, so an E2Job cookie or session in the same browser never leaks in.
const { bearerAuth: protect } = require("./bearer");
const CampusMember = require("../models/CampusMember");

const ADMIN_ROLES = ["SUPER_ADMIN"];
const isE2JobAdmin = (user) => ADMIN_ROLES.includes(user?.role) || (user?.role === "admin" && !user?.companyId);

/** The signed-in user's membership of the resolved institution; 403 when they have none. */
const loadMember = async (req, res, next) => {
  try {
    const member = await CampusMember.findOne({
      institutionId: req.institution._id,
      userId: req.user._id,
      status: "active",
    });
    if (!member) {
      return res.status(403).json({ success: false, code: "NOT_A_MEMBER", message: "You are not registered for this program." });
    }
    req.member = member;
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Everything except /me and /consent needs the data notice accepted first (PRD R5). */
const requireConsent = (req, res, next) => {
  if (!req.member?.consentAt) {
    return res.status(403).json({ success: false, code: "CONSENT_REQUIRED", message: "Please accept the data notice first." });
  }
  return next();
};

const requireCampusRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.member?.role)) {
    return res.status(403).json({ success: false, code: "FORBIDDEN", message: "You do not have access to this page." });
  }
  return next();
};

/** E2Job operations (import, verification, review, publish). */
const requireE2JobAdmin = (req, res, next) => {
  if (!isE2JobAdmin(req.user)) {
    return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Staff access required." });
  }
  return next();
};

/** A university manager of this institution, or an E2Job admin. */
const managerOrAdmin = async (req, res, next) => {
  if (isE2JobAdmin(req.user)) return next();
  return loadMember(req, res, () => requireConsent(req, res, () => requireCampusRole("manager")(req, res, next)));
};

const member = [protect, loadMember];
const consentedMember = [protect, loadMember, requireConsent];
const student = [...consentedMember, requireCampusRole("student")];
const admin = [protect, requireE2JobAdmin];
const manager = [protect, managerOrAdmin];

module.exports = { member, consentedMember, student, admin, manager, isE2JobAdmin };
