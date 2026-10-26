const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const CampusMember = require("../models/CampusMember");
const Batch = require("../models/Batch");
const getFirebaseAdmin = require("../../config/firebaseAdmin");
const { isProduction } = require("../middleware/tenant");
const { completion } = require("../services/profile");

// Same token format as the main E2Job login, so the shared `protect` middleware accepts it.
const signToken = (user) =>
  jwt.sign({ id: user._id, av: user.authVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "25h" });

const emailDomain = (email) => String(email || "").split("@")[1]?.toLowerCase() || "";

const notRegistered = (res, institution) =>
  res.status(403).json({
    success: false,
    code: "NOT_REGISTERED",
    message: `Your email is not registered for this program. Contact ${institution.helpContact}.`,
  });

const memberView = (member) => ({
  id: member._id,
  role: member.role,
  fullName: member.fullName,
  email: member.email,
  rollNo: member.rollNo,
  phone: member.phone,
  cgpa: member.cgpa,
  band: member.band,
  verification: member.verification,
  consentAt: member.consentAt,
});

/** Signs in an imported member; anyone else gets NOT_REGISTERED (PRD R4). */
const signInMember = async (req, res, email) => {
  const institution = req.institution;
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return notRegistered(res, institution);
  const member = await CampusMember.findOne({ institutionId: institution._id, email: normalized, status: "active" });
  if (!member) return notRegistered(res, institution);
  const user = await User.findById(member.userId);
  if (!user || user.isActive === false) return notRegistered(res, institution);

  member.lastSignInAt = new Date();
  await member.save();
  return res.status(200).json({
    success: true,
    token: signToken(user),
    member: memberView(member),
    institution: institution.toPublic(),
    needsConsent: !member.consentAt,
  });
};

// POST /api/campus/auth/google { idToken }
exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};
    if (typeof idToken !== "string" || !idToken) {
      return res.status(400).json({ success: false, message: "Missing Google sign-in token." });
    }
    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ success: false, message: "Google sign-in is not available right now." });
    }
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, message: "Google sign-in failed. Please try again." });
    }
    const email = String(decoded.email || "").toLowerCase();
    const verified = decoded.email_verified === true || decoded.email_verified === "true";
    const allowed = (req.institution.allowedEmailDomains || []).includes(emailDomain(email));
    if (!email || !verified || !allowed) return notRegistered(res, req.institution);
    return signInMember(req, res, email);
  } catch (error) {
    return next(error);
  }
};

// Sample accounts only: no real person can own an address on this domain, so signing in without
// Google cannot be used to enter a real student's account.
const DEMO_DOMAIN = "demo.portal.test";

// POST /api/campus/auth/dev { email }: sample students without Google accounts.
// Local QA: CAMPUS_DEV_LOGIN=true, any imported email. Hosted demo: CAMPUS_DEMO_LOGIN=true, and only
// @demo.portal.test sample accounts.
exports.devSignIn = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const localQa = !isProduction() && process.env.CAMPUS_DEV_LOGIN === "true";
    const hostedDemo = process.env.CAMPUS_DEMO_LOGIN === "true" && emailDomain(email) === DEMO_DOMAIN;
    if (!localQa && !hostedDemo) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return signInMember(req, res, email);
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/me
exports.me = async (req, res, next) => {
  try {
    const batch = req.member.batchId ? await Batch.findById(req.member.batchId).lean() : null;
    return res.status(200).json({
      success: true,
      member: memberView(req.member),
      institution: req.institution.toPublic(),
      batch: batch ? { id: batch._id, name: batch.name, semester: batch.semester ?? null } : null,
      needsConsent: !req.member.consentAt,
      profileCompletion: req.member.role === "student" ? completion(req.member) : null,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/consent { accepted: true }
exports.consent = async (req, res, next) => {
  try {
    if (req.body?.accepted !== true) {
      return res.status(400).json({ success: false, message: "Please accept the notice to continue." });
    }
    if (!req.member.consentAt) {
      req.member.consentAt = new Date();
      await req.member.save();
    }
    return res.status(200).json({ success: true, consentAt: req.member.consentAt });
  } catch (error) {
    return next(error);
  }
};

exports.memberView = memberView;
