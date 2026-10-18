const CampusMember = require("../models/CampusMember");
const CampusAssessment = require("../models/CampusAssessment");
const CampusAttempt = require("../models/CampusAttempt");
const { CampusSession, CampusAttendance } = require("../models/CampusSession");

// One source for the university dashboard and every download, so their numbers always match
// (PRD R14). Scores are only included once results are published.

const pct = (score, max) => (max ? Math.round((score / max) * 1000) / 10 : 0);

/** The assessment to report on: the one asked for, else the latest of the institution. */
const pickAssessment = (institutionId, assessmentId) =>
  assessmentId
    ? CampusAssessment.findOne({ _id: assessmentId, institutionId }).lean()
    : CampusAssessment.findOne({ institutionId, status: { $ne: "archived" } }).sort({ opensAt: -1 }).lean();

const testStatus = (attempt) => {
  if (!attempt) return "not_started";
  if (attempt.status === "in_progress") return "in_progress";
  if (attempt.status === "auto_submitted") return "auto_submitted";
  return "submitted";
};

/** Rows for every student of the institution, with their test and attendance. */
const buildRows = async (institutionId, assessmentId) => {
  const assessment = await pickAssessment(institutionId, assessmentId);
  const published = Boolean(assessment?.resultsPublishedAt);
  const [members, attempts, sessions] = await Promise.all([
    CampusMember.find({ institutionId, role: "student", status: "active" }).sort({ fullName: 1 }).lean(),
    assessment ? CampusAttempt.find({ assessmentId: assessment._id }).lean() : [],
    CampusSession.find({ institutionId, status: "scheduled", startAt: { $lte: new Date() } }).lean(),
  ]);
  const attendance = await CampusAttendance.find({ sessionId: { $in: sessions.map((s) => s._id) } }).lean();
  const attendedBy = new Map();
  attendance.forEach((a) => attendedBy.set(String(a.memberId), (attendedBy.get(String(a.memberId)) || 0) + 1));
  const attemptBy = new Map(attempts.map((a) => [String(a.memberId), a]));
  const sectionKeys = (assessment?.sections || []).map((s) => s.key);

  const rows = members.map((m) => {
    const attempt = attemptBy.get(String(m._id));
    const heldForMember = sessions.filter((s) => s.band === null || s.band === m.band).length;
    const bySection = attempt?.scores?.bySection || {};
    return {
      memberId: String(m._id),
      fullName: m.fullName,
      email: m.email,
      rollNo: m.rollNo,
      phone: m.phone,
      cgpa: m.cgpa,
      band: m.band,
      verification: m.verification?.status || "pending",
      testStatus: testStatus(attempt),
      submitReason: attempt?.submitReason || "",
      fairTestEvents: attempt?.proctor?.countedEvents || 0,
      flags: attempt?.proctor?.flags || [],
      total: published && attempt ? attempt.scores.total : null,
      max: published && attempt ? attempt.scores.max : null,
      percentage: published && attempt ? pct(attempt.scores.total, attempt.scores.max) : null,
      sections: published && attempt ? sectionKeys.map((k) => ({ key: k, ...(bySection[k] || { score: 0, max: 0 }) })) : [],
      strengths: published && attempt ? attempt.feedback?.strengths || [] : [],
      improvements: published && attempt ? attempt.feedback?.improvements || [] : [],
      classesHeld: heldForMember,
      classesAttended: attendedBy.get(String(m._id)) || 0,
    };
  });
  return { assessment, published, rows, sessions, attendance };
};

/** Batch summary for the dashboard and the PDF. */
const summarize = ({ assessment, published, rows }) => {
  const byBand = [1, 2, 3].map((band) => {
    const inBand = rows.filter((r) => r.band === band);
    const scored = inBand.filter((r) => r.percentage !== null);
    return {
      band,
      students: inBand.length,
      submitted: inBand.filter((r) => ["submitted", "auto_submitted"].includes(r.testStatus)).length,
      averagePercentage: scored.length ? Math.round((scored.reduce((s, r) => s + r.percentage, 0) / scored.length) * 10) / 10 : null,
    };
  });
  const sections = (assessment?.sections || []).map((s) => {
    const scored = rows.filter((r) => r.sections.length);
    const totals = scored.reduce((acc, r) => {
      const x = r.sections.find((y) => y.key === s.key) || { score: 0, max: 0 };
      return { score: acc.score + x.score, max: acc.max + x.max };
    }, { score: 0, max: 0 });
    return { key: s.key, title: s.title, averagePercentage: published && totals.max ? pct(totals.score, totals.max) : null };
  });
  const status = {};
  rows.forEach((r) => { status[r.testStatus] = (status[r.testStatus] || 0) + 1; });
  const top = published
    ? rows.filter((r) => r.percentage !== null).sort((a, b) => b.percentage - a.percentage).slice(0, 5)
      .map((r) => ({ fullName: r.fullName, rollNo: r.rollNo, band: r.band, percentage: r.percentage }))
    : [];
  const held = rows.reduce((s, r) => s + r.classesHeld, 0);
  const attended = rows.reduce((s, r) => s + r.classesAttended, 0);
  return {
    assessment: assessment ? { id: assessment._id, title: assessment.title, opensAt: assessment.opensAt, closesAt: assessment.closesAt, resultsPublishedAt: assessment.resultsPublishedAt } : null,
    published,
    students: rows.length,
    verified: rows.filter((r) => r.verification === "verified").length,
    status,
    flagged: rows.filter((r) => r.flags.length || r.fairTestEvents).length,
    byBand,
    sections,
    top,
    attendanceRate: held ? Math.round((attended / held) * 1000) / 10 : null,
  };
};

module.exports = { buildRows, summarize, pct };
