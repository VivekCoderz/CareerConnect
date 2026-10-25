const User = require("../../models/User");
const Batch = require("../models/Batch");
const CampusFile = require("../models/CampusFile");
const CampusMember = require("../models/CampusMember");
const { memberView } = require("./authController");
const { saveFile, fileLink } = require("../services/files");
const { validateProfile, completion } = require("../services/profile");

// The student's profile (PRD R6 plus the October additions): imported details, personal details,
// schooling, graduation, photo, resume and LinkedIn. Students and the university's admins see it.

const apiBase = (req) => `${req.protocol}://${req.get("host")}/api/campus`;

// Checks the file's first bytes, so a renamed file of another type is refused.
const KINDS = {
  photo: { types: { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47] }, label: "a JPG or PNG photo" },
  resume: { types: { "application/pdf": [0x25, 0x50, 0x44, 0x46] }, label: "a PDF" },
};
const matches = (buffer, magic) => magic.every((b, i) => buffer[i] === b);

const fileInfo = async (req, id) => {
  if (!id) return null;
  const file = await CampusFile.findOne({ _id: id, institutionId: req.institution._id });
  return file ? { url: fileLink(file, apiBase(req)), mimeType: file.mimeType, size: file.size, uploadedAt: file.createdAt } : null;
};

/** Everything the profile page and the university admin's student view show. */
const fullProfile = async (req, member) => {
  const batch = member.batchId ? await Batch.findById(member.batchId).lean() : null;
  const p = member.profile || {};
  return {
    member: memberView(member),
    batch: batch ? { id: batch._id, name: batch.name, semester: batch.semester ?? null } : null,
    profile: {
      dob: p.dob || null,
      gender: p.gender || "",
      linkedinUrl: p.linkedinUrl || "",
      class10: p.class10 || {},
      class12: p.class12 || {},
      diploma: p.diploma || {},
      graduation: p.graduation || {},
      photo: await fileInfo(req, p.photoFileId),
      resume: await fileInfo(req, p.resumeFileId),
    },
    completion: completion(member),
  };
};

// GET /api/campus/profile
exports.getProfile = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, ...(await fullProfile(req, req.member)) });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/campus/profile { fullName?, phone?, cgpa?, dob?, gender?, linkedinUrl?, class10?, class12?, diploma?, graduation? }
// Editing a verified imported detail (name, phone, CGPA) makes it pending again; the other
// details are not verified by staff.
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
    const extra = validateProfile(req.body || {});
    Object.assign(errors, extra.errors);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, errors, message: "Please correct the highlighted fields." });

    const m = req.member;
    const changed = Object.keys(changes).filter((k) => changes[k] !== m[k]);
    changed.forEach((k) => { m[k] = changes[k]; });
    if (changed.length && m.verification?.status === "verified") m.verification = { status: "pending", by: null, at: null };
    Object.entries(extra.value).forEach(([k, v]) => { m.profile[k] = v; });
    await m.save();
    if (changes.fullName && changed.includes("fullName")) await User.updateOne({ _id: m.userId }, { fullName: changes.fullName });
    return res.status(200).json({ success: true, ...(await fullProfile(req, m)) });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/campus/profile/photo (multipart "file") and /profile/resume. */
exports.upload = (kind) => async (req, res, next) => {
  try {
    const rule = KINDS[kind];
    const magic = req.file && rule.types[req.file.mimetype];
    if (!req.file || !magic || !matches(req.file.buffer, magic)) {
      return res.status(400).json({ success: false, message: `Upload ${rule.label} (up to 2 MB).` });
    }
    const file = await saveFile({ institutionId: req.institution._id, memberId: req.member._id, kind, buffer: req.file.buffer, mimeType: req.file.mimetype });
    req.member.profile[`${kind}FileId`] = file._id;
    await req.member.save();
    return res.status(200).json({ success: true, ...(await fullProfile(req, req.member)) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/manager/students/:memberId/profile (university admin or staff)
exports.studentProfile = async (req, res, next) => {
  try {
    const member = await CampusMember.findOne({ _id: req.params.memberId, institutionId: req.institution._id, role: "student" });
    if (!member) return res.status(404).json({ success: false, message: "Student not found." });
    return res.status(200).json({ success: true, ...(await fullProfile(req, member)) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/ops/batches and PATCH /api/campus/ops/batches/:id { semester }
exports.listBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find({ institutionId: req.institution._id, status: "active" }).sort({ name: 1 }).lean();
    return res.status(200).json({ success: true, batches: batches.map((b) => ({ id: b._id, name: b.name, semester: b.semester ?? null })) });
  } catch (error) {
    return next(error);
  }
};

exports.setSemester = async (req, res, next) => {
  try {
    const v = req.body?.semester === null || req.body?.semester === "" ? null : Number(req.body?.semester);
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 12)) return res.status(400).json({ success: false, message: "Semester must be from 1 to 12." });
    const batch = await Batch.findOneAndUpdate({ _id: req.params.id, institutionId: req.institution._id }, { semester: v }, { returnDocument: "after" });
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });
    return res.status(200).json({ success: true, batch: { id: batch._id, name: batch.name, semester: batch.semester } });
  } catch (error) {
    return next(error);
  }
};
