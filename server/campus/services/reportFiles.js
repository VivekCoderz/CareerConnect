const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Excel and PDF downloads for the university (PRD R14), built from reportData rows.

const STATUS = { not_started: "Not started", in_progress: "In progress", submitted: "Submitted", auto_submitted: "Auto-submitted" };
const BAND = { 1: "Band 1 (below 6.0)", 2: "Band 2 (6.0 to 7.99)", 3: "Band 3 (8.0 and above)" };

const styleHeader = (ws) => {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B3A82" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
};

/** Results sheet: one row per student, a column per section. */
const resultsWorkbook = async ({ assessment, published, rows }, institution) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = institution?.name || "";
  const ws = wb.addWorksheet("Results");
  const sections = assessment?.sections || [];
  ws.columns = [
    { header: "Name", key: "fullName", width: 28 },
    { header: "Roll no.", key: "rollNo", width: 14 },
    { header: "Email", key: "email", width: 32 },
    { header: "CGPA", key: "cgpa", width: 8 },
    { header: "Band", key: "band", width: 22 },
    { header: "Details verified", key: "verification", width: 15 },
    { header: "Test status", key: "testStatus", width: 16 },
    { header: "Fair-test events", key: "fairTestEvents", width: 15 },
    { header: "Flags", key: "flags", width: 24 },
    ...sections.map((s) => ({ header: `${s.title} (score / max)`, key: `s_${s.key}`, width: 20 })),
    { header: "Total", key: "total", width: 10 },
    { header: "Max", key: "max", width: 8 },
    { header: "Percentage", key: "percentage", width: 12 },
    { header: "Classes attended", key: "attendance", width: 16 },
  ];
  rows.forEach((r) => {
    const sectionCells = {};
    sections.forEach((s) => {
      const x = r.sections.find((y) => y.key === s.key);
      sectionCells[`s_${s.key}`] = x ? `${x.score} / ${x.max}` : "";
    });
    ws.addRow({
      ...r,
      band: BAND[r.band] || "",
      verification: r.verification === "verified" ? "Yes" : "Pending",
      testStatus: STATUS[r.testStatus] || r.testStatus,
      flags: r.flags.map((f) => (f.startsWith("possible_copy") ? "Possible copying" : f)).join(", "),
      ...sectionCells,
      total: r.total ?? "",
      max: r.max ?? "",
      percentage: r.percentage ?? "",
      attendance: `${r.classesAttended} of ${r.classesHeld}`,
    });
  });
  styleHeader(ws);
  const info = wb.addWorksheet("About");
  info.addRows([
    ["Institution", institution.name],
    ["Assessment", assessment?.title || "-"],
    ["Results", published ? "Published" : "Not published yet: scores are left empty"],
    ["Generated", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
  ]);
  return wb.xlsx.writeBuffer();
};

/** Attendance sheet: one row per class. */
const attendanceWorkbook = async ({ rows, sessions, attendance }) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Attendance");
  ws.columns = [
    { header: "Class", key: "title", width: 34 },
    { header: "Date and time (IST)", key: "when", width: 22 },
    { header: "For", key: "band", width: 22 },
    { header: "Trainer", key: "trainer", width: 20 },
    { header: "Invited", key: "invited", width: 10 },
    { header: "Joined", key: "joined", width: 10 },
    { header: "Students who joined", key: "names", width: 60 },
  ];
  const nameOf = new Map(rows.map((r) => [r.memberId, r.fullName]));
  sessions.sort((a, b) => a.startAt - b.startAt).forEach((s) => {
    const joined = attendance.filter((a) => String(a.sessionId) === String(s._id));
    ws.addRow({
      title: s.title,
      when: new Date(s.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      band: s.band ? BAND[s.band] : "Whole batch",
      trainer: s.trainerName,
      invited: rows.filter((r) => s.band === null || r.band === s.band).length,
      joined: joined.length,
      names: joined.map((a) => nameOf.get(String(a.memberId))).filter(Boolean).join(", "),
    });
  });
  styleHeader(ws);
  return wb.xlsx.writeBuffer();
};

const pdfBuffer = (draw) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    draw(doc);
    doc.end();
  });

const heading = (doc, institution, title) => {
  doc.fillColor(institution.brandColor || "#0B3A82").fontSize(18).text(institution.name);
  doc.fillColor("#1F2937").fontSize(13).text(title).moveDown(0.3);
  doc.fillColor("#64748B").fontSize(9).text(`Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} | ${institution.name}`).moveDown();
  doc.fillColor("#1F2937");
};

/** Batch summary PDF. */
const summaryPdf = (summary, institution) =>
  pdfBuffer((doc) => {
    heading(doc, institution, `Batch summary: ${summary.assessment?.title || "Assessment"}`);
    doc.fontSize(11).text(`Students: ${summary.students}    Details verified: ${summary.verified}    Flagged tests: ${summary.flagged}`);
    doc.text(`Submitted: ${(summary.status.submitted || 0) + (summary.status.auto_submitted || 0)}    Not started: ${summary.status.not_started || 0}`);
    if (summary.attendanceRate !== null) doc.text(`Training attendance: ${summary.attendanceRate}%`);
    doc.moveDown();
    if (!summary.published) {
      doc.fontSize(11).fillColor("#9A5B00").text("Results are not published yet, so scores are not included.").fillColor("#1F2937");
      return;
    }
    doc.fontSize(12).text("Average by section", { underline: true }).fontSize(10);
    summary.sections.forEach((s) => doc.text(`${s.title}: ${s.averagePercentage ?? "-"}%`));
    doc.moveDown().fontSize(12).text("By CGPA band", { underline: true }).fontSize(10);
    summary.byBand.forEach((b) => doc.text(`${BAND[b.band]}: ${b.students} students, ${b.submitted} submitted, average ${b.averagePercentage ?? "-"}%`));
    doc.moveDown().fontSize(12).text("Top performers", { underline: true }).fontSize(10);
    summary.top.forEach((t, i) => doc.text(`${i + 1}. ${t.fullName} (${t.rollNo || "-"}), ${BAND[t.band] || ""}: ${t.percentage}%`));
  });

/** One page per student who has a published score. */
const scorecardsPdf = ({ published, rows, assessment }, institution) =>
  pdfBuffer((doc) => {
    const scored = published ? rows.filter((r) => r.percentage !== null) : [];
    if (!scored.length) {
      heading(doc, institution, "Student scorecards");
      doc.fontSize(11).text("No published results yet.");
      return;
    }
    scored.forEach((r, i) => {
      if (i) doc.addPage();
      heading(doc, institution, `Scorecard: ${assessment.title}`);
      doc.fontSize(13).text(r.fullName).fontSize(10).text(`Roll no. ${r.rollNo || "-"}  |  ${BAND[r.band] || ""}  |  CGPA ${r.cgpa ?? "-"}`).moveDown();
      doc.fontSize(16).fillColor("#0B3A82").text(`${r.total} / ${r.max}  (${r.percentage}%)`).fillColor("#1F2937").moveDown(0.5);
      doc.fontSize(12).text("Sections", { underline: true }).fontSize(10);
      (assessment.sections || []).forEach((s) => {
        const x = r.sections.find((y) => y.key === s.key) || { score: 0, max: 0 };
        doc.text(`${s.title}: ${x.score} / ${x.max}`);
      });
      if (r.strengths.length) doc.moveDown().fontSize(12).text("Strengths", { underline: true }).fontSize(10).text(r.strengths.join("\n"));
      if (r.improvements.length) doc.moveDown().fontSize(12).text("To improve", { underline: true }).fontSize(10).text(r.improvements.join("\n"));
      doc.moveDown().fontSize(10).text(`Training classes attended: ${r.classesAttended} of ${r.classesHeld}`);
    });
  });

module.exports = { resultsWorkbook, attendanceWorkbook, summaryPdf, scorecardsPdf, STATUS, BAND };
