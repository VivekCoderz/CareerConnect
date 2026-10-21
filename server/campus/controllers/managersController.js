const CampusMember = require("../models/CampusMember");
const { memberView } = require("./authController");
const { userFor, audit } = require("./membersController");

// University admins ("managers"): our staff add the people at the university who may open the
// university dashboard. They sign in with Google like students, so the email must be on one of
// the institution's allowed domains.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const view = (m) => ({ ...memberView(m), status: m.status, lastSignInAt: m.lastSignInAt, createdAt: m.createdAt });

// GET /api/campus/ops/managers
exports.list = async (req, res, next) => {
  try {
    const managers = await CampusMember.find({ institutionId: req.institution._id, role: "manager" }).sort({ status: 1, fullName: 1 });
    return res.status(200).json({ success: true, managers: managers.map(view), allowedEmailDomains: req.institution.allowedEmailDomains || [] });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/managers { fullName, email, phone? }
exports.add = async (req, res, next) => {
  try {
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim().replace(/\s+/g, " ") : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.replace(/\D/g, "").slice(-10) : "";
    const domains = req.institution.allowedEmailDomains || [];
    const errors = {};
    if (fullName.length < 2 || fullName.length > 120) errors.fullName = "Enter the full name.";
    if (!EMAIL.test(email) || email.length > 160) errors.email = "Enter a valid email.";
    else if (!domains.includes(email.split("@")[1])) errors.email = `Use an email ending in ${domains.map((d) => `@${d}`).join(" or ") || "the university domain"}; only these can sign in.`;
    if (phone && phone.length !== 10) errors.phone = "Enter a 10-digit mobile number.";
    if (Object.keys(errors).length) return res.status(400).json({ success: false, errors, message: "Please correct the highlighted fields." });

    let member = await CampusMember.findOne({ institutionId: req.institution._id, email });
    if (member?.role === "student") {
      return res.status(409).json({ success: false, message: "This email is registered as a student in this portal." });
    }
    if (member?.status === "active") {
      return res.status(409).json({ success: false, message: "This person is already a university admin." });
    }
    if (member) {
      Object.assign(member, { status: "active", fullName, phone });
    } else {
      const { user, error } = await userFor({ fullName, email });
      if (error) return res.status(409).json({ success: false, message: error });
      member = new CampusMember({
        institutionId: req.institution._id,
        userId: user._id,
        role: "manager",
        email,
        fullName,
        phone,
        // The data notice is written for students; admins are set up by our staff directly.
        consentAt: new Date(),
        importedAt: new Date(),
      });
    }
    await member.save();
    await audit(req, "CAMPUS_MANAGER_ADD", { memberId: String(member._id), email });
    return res.status(201).json({ success: true, manager: view(member) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/managers/:id/remove: access ends on their next request.
exports.remove = async (req, res, next) => {
  try {
    const member = await CampusMember.findOne({ _id: req.params.id, institutionId: req.institution._id, role: "manager" });
    if (!member) return res.status(404).json({ success: false, message: "University admin not found." });
    member.status = "removed";
    await member.save();
    await audit(req, "CAMPUS_MANAGER_REMOVE", { memberId: String(member._id), email: member.email });
    return res.status(200).json({ success: true, manager: view(member) });
  } catch (error) {
    return next(error);
  }
};
