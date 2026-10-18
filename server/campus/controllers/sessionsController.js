const { CampusSession, CampusAttendance } = require("../models/CampusSession");
const Batch = require("../models/Batch");
const { readRows } = require("../services/importer");
const { safeMeetUrl } = require("../utils/meet");

// Training classes on Google Meet (PRD R13). The Meet link is only handed out from 15 minutes
// before the class until it ends, and joining records attendance.

const JOIN_EARLY_MS = 15 * 60 * 1000;

const joinWindow = (s, now = Date.now()) => ({
  joinOpensAt: new Date(s.startAt.getTime() - JOIN_EARLY_MS),
  canJoin: now >= s.startAt.getTime() - JOIN_EARLY_MS && now <= s.endAt.getTime(),
});

const view = (s, attended) => ({
  id: s._id,
  title: s.title,
  description: s.description,
  trainerName: s.trainerName,
  startAt: s.startAt,
  endAt: s.endAt,
  band: s.band,
  attended: Boolean(attended),
  ...joinWindow(s),
});

const forMember = (req) => ({
  institutionId: req.institution._id,
  batchId: req.member.batchId,
  status: "scheduled",
  $or: [{ band: null }, { band: req.member.band }],
});

// GET /api/campus/sessions
exports.mySessions = async (req, res, next) => {
  try {
    const sessions = await CampusSession.find(forMember(req)).sort({ startAt: 1 });
    const attended = await CampusAttendance.find({ memberId: req.member._id, sessionId: { $in: sessions.map((s) => s._id) } }).select("sessionId").lean();
    const done = new Set(attended.map((a) => String(a.sessionId)));
    const now = Date.now();
    const upcoming = sessions.filter((s) => s.endAt.getTime() >= now).map((s) => view(s, done.has(String(s._id))));
    const past = sessions.filter((s) => s.endAt.getTime() < now).reverse().map((s) => view(s, done.has(String(s._id))));
    return res.status(200).json({ success: true, next: upcoming[0] || null, upcoming, past });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/sessions/:id/join
exports.join = async (req, res, next) => {
  try {
    const session = await CampusSession.findOne({ _id: req.params.id, ...forMember(req) });
    if (!session) return res.status(404).json({ success: false, message: "Class not found." });
    if (!joinWindow(session).canJoin) {
      return res.status(409).json({ success: false, code: "NOT_YET", message: "You can join from 15 minutes before the class starts." });
    }
    await CampusAttendance.updateOne(
      { sessionId: session._id, memberId: req.member._id },
      { $setOnInsert: { sessionId: session._id, memberId: req.member._id, institutionId: req.institution._id, joinedAt: new Date() } },
      { upsert: true }
    );
    return res.status(200).json({ success: true, meetUrl: session.meetUrl });
  } catch (error) {
    return next(error);
  }
};

const parseSession = (body, batchId) => {
  const errors = [];
  const title = String(body.title || "").trim();
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  const meetUrl = safeMeetUrl(body.meetUrl);
  const band = body.band === null || body.band === "" || body.band === undefined ? null : Number(body.band);
  if (!title) errors.push("Title is missing");
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) errors.push("Start and end time are not valid");
  if (!meetUrl) errors.push("Meet link must be a https://meet.google.com/... link");
  if (band !== null && ![1, 2, 3].includes(band)) errors.push("Band must be 1, 2, 3 or empty for everyone");
  return {
    errors,
    data: { title, startAt, endAt, meetUrl, band, batchId, trainerName: String(body.trainerName || "").trim().slice(0, 120), description: String(body.description || "").trim().slice(0, 1000) },
  };
};

const batchFor = async (req) => {
  const id = req.body?.batchId;
  return id ? Batch.findOne({ _id: id, institutionId: req.institution._id }) : Batch.findOne({ institutionId: req.institution._id, status: "active" }).sort({ createdAt: -1 });
};

// GET /api/campus/ops/sessions
exports.listAll = async (req, res, next) => {
  try {
    const sessions = await CampusSession.find({ institutionId: req.institution._id }).sort({ startAt: 1 }).lean();
    const counts = await CampusAttendance.aggregate([
      { $match: { institutionId: req.institution._id } },
      { $group: { _id: "$sessionId", n: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.n]));
    return res.status(200).json({ success: true, sessions: sessions.map((s) => ({ ...s, id: s._id, attendance: byId.get(String(s._id)) || 0 })) });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/sessions
exports.create = async (req, res, next) => {
  try {
    const batch = await batchFor(req);
    if (!batch) return res.status(400).json({ success: false, message: "Import students first, so the batch exists." });
    const { errors, data } = parseSession(req.body || {}, batch._id);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(". ") });
    const session = await CampusSession.create({ ...data, institutionId: req.institution._id });
    return res.status(201).json({ success: true, session });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/campus/ops/sessions/:id  (cancels; attendance is kept)
exports.cancel = async (req, res, next) => {
  try {
    const r = await CampusSession.updateOne({ _id: req.params.id, institutionId: req.institution._id }, { status: "cancelled" });
    if (!r.matchedCount) return res.status(404).json({ success: false, message: "Class not found." });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/sessions/import (multipart "file"): title, date, start, end, meet link, band, trainer
exports.importSchedule = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Attach the schedule (.xlsx or .csv)." });
    const batch = await batchFor(req);
    if (!batch) return res.status(400).json({ success: false, message: "Import students first, so the batch exists." });
    const raw = await readRows(req.file);
    const header = (raw[0] || []).map((h) => String(h).trim().toLowerCase());
    const col = (...names) => header.findIndex((h) => names.includes(h));
    const c = { title: col("title", "topic"), date: col("date"), start: col("start", "start time"), end: col("end", "end time"), meet: col("meet link", "link", "meet"), band: col("band"), trainer: col("trainer", "trainer name") };
    const results = [];
    for (const [i, cells] of raw.slice(1).entries()) {
      const get = (k) => (c[k] >= 0 ? String(cells[c[k]] ?? "").trim() : "");
      const at = (time) => new Date(`${get("date")}T${time.length === 5 ? `${time}:00` : time}+05:30`);
      const { errors, data } = parseSession({ title: get("title"), startAt: at(get("start")), endAt: at(get("end")), meetUrl: get("meet"), band: get("band"), trainerName: get("trainer") }, batch._id);
      if (!errors.length) await CampusSession.create({ ...data, institutionId: req.institution._id });
      results.push({ line: i + 2, title: data.title, errors });
    }
    return res.status(200).json({ success: true, created: results.filter((r) => !r.errors.length).length, results });
  } catch (error) {
    return error.status ? res.status(error.status).json({ success: false, message: error.message }) : next(error);
  }
};
