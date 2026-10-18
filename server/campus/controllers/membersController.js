const User = require("../../models/User");
const AuditLog = require("../../models/AuditLog");
const CampusMember = require("../models/CampusMember");
const Batch = require("../models/Batch");
const { readRows, validateRows } = require("../services/importer");
const { memberView } = require("./authController");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const audit = (req, action, details) =>
  AuditLog.create({
    actorId: req.user._id,
    actorName: req.user.fullName || "",
    actorEmail: req.user.email || "",
    action,
    module: "Campus",
    target: String(req.institution._id),
    details,
  }).catch(() => null); // the action itself already succeeded; a lost log line must not undo it

const parseUpload = async (req) => {
  if (!req.file) throw Object.assign(new Error("Attach the student sheet (.xlsx or .csv)."), { status: 400 });
  const raw = await readRows(req.file);
  return validateRows(raw, { allowedEmailDomains: req.institution.allowedEmailDomains || [] });
};

const fail = (res, error, next) => (error.status ? res.status(error.status).json({ success: false, message: error.message }) : next(error));

// POST /api/campus/ops/import/preview (multipart "file"): nothing is saved.
exports.previewImport = async (req, res, next) => {
  try {
    const result = await parseUpload(req);
    const existing = await CampusMember.find({
      institutionId: req.institution._id,
      email: { $in: result.rows.map((r) => r.data.email).filter(Boolean) },
    }).select("email").lean();
    const known = new Set(existing.map((m) => m.email));
    result.rows.forEach((r) => { r.action = r.errors.length ? "skip" : known.has(r.data.email) ? "update" : "create"; });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return fail(res, error, next);
  }
};

/** Finds or creates the E2Job user behind an imported student. */
const userFor = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    if (existing.role !== "user" || (existing.userType && existing.userType !== "student")) {
      return { error: "This email already belongs to a non-student E2Job account" };
    }
    return { user: existing };
  }
  const user = await User.create({
    fullName: data.fullName,
    email: data.email,
    userType: "student",
    role: "user",
    isEmailVerified: true,
    hasPassword: false,
    authProviders: ["google"],
  });
  return { user };
};

// POST /api/campus/ops/import/commit (multipart "file", body batchName): valid rows only.
exports.commitImport = async (req, res, next) => {
  try {
    const batchName = String(req.body?.batchName || "").trim().slice(0, 80);
    if (!batchName) return res.status(400).json({ success: false, message: "Enter the batch name, e.g. MBA 2025-27." });
    const result = await parseUpload(req);
    if (result.missingColumns.length) {
      return res.status(400).json({ success: false, message: `Missing columns: ${result.missingColumns.join(", ")}` });
    }
    const batch = await Batch.findOneAndUpdate(
      { institutionId: req.institution._id, name: batchName },
      { $setOnInsert: { institutionId: req.institution._id, name: batchName } },
      { upsert: true, returnDocument: "after" }
    );
    const counts = { created: 0, updated: 0, skipped: 0 };
    const problems = [];
    for (const row of result.rows) {
      if (row.errors.length) { counts.skipped += 1; continue; }
      const { data } = row;
      const member = await CampusMember.findOne({ institutionId: req.institution._id, email: data.email });
      if (member) {
        const cgpaChanged = data.cgpa !== null && data.cgpa !== member.cgpa;
        Object.assign(member, { fullName: data.fullName, rollNo: data.rollNo, phone: data.phone, batchId: batch._id });
        if (data.cgpa !== null) member.cgpa = data.cgpa;
        if (cgpaChanged) member.verification = { status: "pending", by: null, at: null };
        await member.save();
        counts.updated += 1;
        continue;
      }
      const { user, error } = await userFor(data);
      if (error) { counts.skipped += 1; problems.push({ line: row.line, errors: [error] }); continue; }
      await CampusMember.create({
        institutionId: req.institution._id,
        batchId: batch._id,
        userId: user._id,
        role: "student",
        email: data.email,
        fullName: data.fullName,
        rollNo: data.rollNo,
        phone: data.phone,
        cgpa: data.cgpa,
        importedAt: new Date(),
      });
      counts.created += 1;
    }
    await audit(req, "CAMPUS_IMPORT", { batch: batchName, ...counts });
    return res.status(200).json({ success: true, batch: { id: batch._id, name: batch.name }, ...counts, problems });
  } catch (error) {
    return fail(res, error, next);
  }
};

// GET /api/campus/ops/members?role=&band=&verification=&search=
exports.listMembers = async (req, res, next) => {
  try {
    const q = { institutionId: req.institution._id, status: "active" };
    if (["student", "manager"].includes(req.query.role)) q.role = req.query.role;
    if (["1", "2", "3"].includes(String(req.query.band))) q.band = Number(req.query.band);
    if (["pending", "verified"].includes(req.query.verification)) q["verification.status"] = req.query.verification;
    const search = String(req.query.search || "").trim().slice(0, 80);
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      q.$or = [{ fullName: rx }, { email: rx }, { rollNo: rx }];
    }
    const members = await CampusMember.find(q).sort({ fullName: 1 }).limit(1000);
    return res.status(200).json({ success: true, members: members.map(memberView) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/members/:id/verify { verified: true|false }
exports.setVerification = async (req, res, next) => {
  try {
    const member = await CampusMember.findOne({ _id: req.params.id, institutionId: req.institution._id });
    if (!member) return res.status(404).json({ success: false, message: "Student not found." });
    const verified = req.body?.verified === true;
    member.verification = verified ? { status: "verified", by: req.user._id, at: new Date() } : { status: "pending", by: null, at: null };
    await member.save();
    await audit(req, verified ? "CAMPUS_VERIFY" : "CAMPUS_UNVERIFY", { memberId: String(member._id) });
    return res.status(200).json({ success: true, member: memberView(member) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/profile
exports.getProfile = async (req, res) => res.status(200).json({ success: true, member: memberView(req.member) });

// PATCH /api/campus/profile { fullName?, phone?, cgpa? }: an edit of a verified detail
// makes it pending again (PRD R6).
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, cgpa } = req.body || {};
    const errors = {};
    const changes = {};
    if (fullName !== undefined) {
      const v = typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
      if (v.length < 2 || v.length > 120) errors.fullName = "Enter your full name.";
      else changes.fullName = v;
    }
    if (phone !== undefined) {
      const v = typeof phone === "string" ? phone.replace(/\D/g, "").slice(-10) : "";
      if (v && v.length !== 10) errors.phone = "Enter a 10-digit mobile number.";
      else changes.phone = v;
    }
    if (cgpa !== undefined) {
      const v = cgpa === null || cgpa === "" ? null : Number(cgpa);
      if (v !== null && (!Number.isFinite(v) || v < 0 || v > 10)) errors.cgpa = "CGPA must be from 0 to 10.";
      else changes.cgpa = v === null ? null : Math.round(v * 100) / 100;
    }
    if (Object.keys(errors).length) return res.status(400).json({ success: false, errors, message: "Please correct the highlighted fields." });

    const m = req.member;
    const changed = Object.keys(changes).filter((k) => changes[k] !== m[k]);
    changed.forEach((k) => { m[k] = changes[k]; });
    if (changed.length && m.verification?.status === "verified") m.verification = { status: "pending", by: null, at: null };
    await m.save();
    if (changes.fullName && changed.includes("fullName")) await User.updateOne({ _id: m.userId }, { fullName: changes.fullName });
    return res.status(200).json({ success: true, member: memberView(m) });
  } catch (error) {
    return next(error);
  }
};
