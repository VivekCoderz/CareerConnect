const User = require("../../models/User");
const CampusMember = require("../models/CampusMember");
const Batch = require("../models/Batch");
const { readRows, validateRows } = require("../services/importer");
const { memberView } = require("./authController");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const { audit: writeAudit } = require("../utils/audit");

const audit = (req, action, details) => writeAudit(req.user, action, req.institution._id, details); // the action itself already succeeded; a lost log line must not undo it

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

/** Finds or creates the platform user behind an imported student or university admin. */
const userFor = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    if (existing.role !== "user" || (existing.userType && existing.userType !== "student")) {
      return { error: "This email already belongs to a non-student account" };
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

exports.userFor = userFor;
exports.audit = audit;
