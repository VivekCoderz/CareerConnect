const { buildRows, summarize } = require("../services/reportData");
const files = require("../services/reportFiles");
const CampusAttempt = require("../models/CampusAttempt");
const CampusFile = require("../models/CampusFile");
const { fileLink } = require("../services/files");

// University dashboard and downloads (PRD R14). Only the resolved institution's data is used.

const STATUSES = ["not_started", "in_progress", "submitted", "auto_submitted"];

// GET /api/campus/manager/overview?assessmentId=
exports.overview = async (req, res, next) => {
  try {
    const data = await buildRows(req.institution._id, req.query.assessmentId);
    return res.status(200).json({ success: true, summary: summarize(data) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/manager/students?band=&status=&search=&assessmentId=
exports.students = async (req, res, next) => {
  try {
    const { rows, published } = await buildRows(req.institution._id, req.query.assessmentId);
    const band = Number(req.query.band);
    const status = String(req.query.status || "");
    const search = String(req.query.search || "").trim().toLowerCase();
    const filtered = rows.filter((r) =>
      (![1, 2, 3].includes(band) || r.band === band) &&
      (!STATUSES.includes(status) || r.testStatus === status) &&
      (status !== "flagged" || r.flags.length || r.fairTestEvents) &&
      (!search || `${r.fullName} ${r.email} ${r.rollNo}`.toLowerCase().includes(search)));
    return res.status(200).json({ success: true, published, students: filtered });
  } catch (error) {
    return next(error);
  }
};

const send = (res, buffer, name, type) => {
  res.set("Content-Type", type);
  res.set("Content-Disposition", `attachment; filename="${name}"`);
  res.set("Cache-Control", "no-store");
  return res.send(Buffer.from(buffer));
};

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// GET /api/campus/manager/reports/:name  (results.xlsx | attendance.xlsx | summary.pdf | scorecards.pdf)
exports.report = async (req, res, next) => {
  try {
    const data = await buildRows(req.institution._id, req.query.assessmentId);
    const slug = req.institution.slug;
    switch (req.params.name) {
      case "results.xlsx":
        return send(res, await files.resultsWorkbook(data, req.institution), `${slug}-results.xlsx`, XLSX);
      case "attendance.xlsx":
        return send(res, await files.attendanceWorkbook(data), `${slug}-attendance.xlsx`, XLSX);
      case "summary.pdf":
        return send(res, await files.summaryPdf(summarize(data), req.institution), `${slug}-summary.pdf`, "application/pdf");
      case "scorecards.pdf":
        return send(res, await files.scorecardsPdf(data, req.institution), `${slug}-scorecards.pdf`, "application/pdf");
      default:
        return res.status(404).json({ success: false, message: "Unknown report." });
    }
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/manager/attempts/:memberId/proctoring : events and camera photos only
// (no answers or marking schemes) for the university's review of a flagged test.
exports.proctoring = async (req, res, next) => {
  try {
    const attempt = await CampusAttempt.findOne({ memberId: req.params.memberId, institutionId: req.institution._id })
      .sort({ createdAt: -1 }).lean();
    if (!attempt) return res.status(404).json({ success: false, message: "No test found for this student." });
    const fileIds = (attempt.proctor?.snapshots || []).map((s) => s.fileId);
    const filesById = new Map((await CampusFile.find({ _id: { $in: fileIds } }).lean()).map((f) => [String(f._id), f]));
    const base = `${req.protocol}://${req.get("host")}/api/campus`;
    return res.status(200).json({
      success: true,
      status: attempt.status,
      submitReason: attempt.submitReason,
      events: (attempt.proctor?.events || []).map((e) => ({ type: e.type, at: e.at, counted: Boolean(e.counted) })),
      flags: attempt.proctor?.flags || [],
      snapshots: (attempt.proctor?.snapshots || []).map((s) => ({ at: s.at, url: filesById.get(String(s.fileId)) ? fileLink(filesById.get(String(s.fileId)), base) : null })),
    });
  } catch (error) {
    return next(error);
  }
};
