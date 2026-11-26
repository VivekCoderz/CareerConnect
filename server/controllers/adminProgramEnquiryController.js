// C11: admin view of programme enquiries (C10): list with filters, status updates with a
// note, and a CSV export that opens cleanly in Excel. SUPER_ADMIN only (see adminRoutes).
const mongoose = require("mongoose");
const ProgramEnquiry = require("../models/ProgramEnquiry");
const { ENQUIRY_STATUSES, NOTE_MAX } = ProgramEnquiry;

const IST_OFFSET = "+05:30";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const EXPORT_MAX_ROWS = 10000;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "2026-11-26" as the start (or end) of that day in India; null if not a real date. */
const istDay = (value, endOfDay) => {
  if (!DATE_RE.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}${IST_OFFSET}`);
  // JS rolls 2026-02-31 over to 3 March; only accept a date that names a real day.
  return Number.isNaN(date.getTime()) || istDateTime(date).slice(0, 10) !== value ? null : date;
};

/**
 * Filters shared by the list and the export: programme, status, from/to (YYYY-MM-DD, India
 * time, both days included) and search (reference, name, email, mobile, college, city).
 * Returns { query } or { error } for a 400.
 */
const buildFilter = (params) => {
  const query = {};
  const program = text(params.program);
  if (program) query.programSlug = program;

  const status = text(params.status);
  if (status) {
    if (!ENQUIRY_STATUSES.includes(status)) return { error: { field: "status", message: `Status must be one of ${ENQUIRY_STATUSES.join(", ")}.` } };
    query.status = status;
  }

  const fromText = text(params.from);
  const toText = text(params.to);
  const from = fromText ? istDay(fromText, false) : null;
  const to = toText ? istDay(toText, true) : null;
  if (fromText && !from) return { error: { field: "from", message: "Use a date like 2026-11-26." } };
  if (toText && !to) return { error: { field: "to", message: "Use a date like 2026-11-26." } };
  if (from && to && from > to) return { error: { field: "to", message: "The end date is before the start date." } };
  if (from || to) query.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const search = text(params.search).slice(0, 100);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    const digits = search.replace(/\D/g, "");
    query.$or = [
      { reference: pattern },
      { name: pattern },
      { email: pattern },
      { college: pattern },
      { city: pattern },
      ...(digits.length >= 3 ? [{ phone: new RegExp(escapeRegex(digits)) }] : []),
    ];
  }
  return { query };
};

const positiveInt = (value, fallback, max) => {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

// GET /api/admin/program-enquiries?program=&status=&from=&to=&search=&page=&limit=
const listEnquiries = async (req, res, next) => {
  try {
    const { query, error } = buildFilter(req.query);
    if (error) return res.status(400).json({ success: false, ...error });

    const page = positiveInt(req.query.page, 1);
    const limit = positiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);

    const [enquiries, total, counts] = await Promise.all([
      ProgramEnquiry.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ProgramEnquiry.countDocuments(query),
      // Counts per status for the same filters except status, so the tabs show what each holds.
      ProgramEnquiry.aggregate([
        { $match: (({ status: _status, ...rest }) => rest)(query) },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]));
    counts.forEach(({ _id, count }) => {
      if (_id in statusCounts) statusCounts[_id] = count;
    });

    return res.status(200).json({
      success: true,
      data: {
        enquiries,
        statusCounts,
        statuses: ENQUIRY_STATUSES,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/admin/program-enquiries/:id  { status, note? }
const updateEnquiryStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Enquiry not found." });
    }
    const status = req.body?.status;
    const rawNote = req.body?.note;
    if (!ENQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, field: "status", message: `Status must be one of ${ENQUIRY_STATUSES.join(", ")}.` });
    }
    if (rawNote !== undefined && rawNote !== null && typeof rawNote !== "string") {
      return res.status(400).json({ success: false, field: "note", message: "The note must be text." });
    }
    const note = text(rawNote);
    if (note.length > NOTE_MAX) {
      return res.status(400).json({ success: false, field: "note", message: `Keep the note under ${NOTE_MAX} characters.` });
    }

    const enquiry = await ProgramEnquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found." });
    if (enquiry.status === status && !note) {
      return res.status(400).json({ success: false, message: "Change the status or add a note." });
    }

    enquiry.history.push({
      from: enquiry.status,
      to: status,
      note,
      by: req.user._id,
      byName: req.user.fullName || req.user.email || "",
    });
    enquiry.status = status;

    try {
      await enquiry.save();
    } catch (err) {
      // Re-opening it while the same email has another open enquiry for this programme.
      if (err?.code === 11000 && err.keyPattern?.email) {
        return res.status(409).json({
          success: false,
          code: "ENQUIRY_EXISTS",
          message: "This student already has another open enquiry for this programme.",
        });
      }
      throw err;
    }
    return res.status(200).json({ success: true, data: { enquiry: enquiry.toObject() } });
  } catch (err) {
    return next(err);
  }
};

// ─── CSV export ──────────────────────────────────────────────────────────────

const YEAR_LABELS = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year", 5: "5th year", graduated: "Graduated" };

const istDateTime = (date) => {
  if (!date) return "";
  // en-CA gives 2026-11-26; Excel reads "2026-11-26 14:05" as a date and time.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};

/**
 * One CSV cell. Every cell is quoted (commas, quotes and line breaks in a message stay in
 * one cell). Text that starts with = + - @ or a tab is prefixed with ' so Excel shows it
 * instead of running it as a formula (CSV injection); dates and numbers never start so.
 */
const csvCell = (value) => {
  let cell = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
};

const CSV_COLUMNS = [
  ["Reference", (e) => e.reference],
  ["Received (IST)", (e) => istDateTime(e.createdAt)],
  ["Programme", (e) => e.programTitle],
  ["Status", (e) => e.status],
  ["Name", (e) => e.name],
  ["Email", (e) => e.email],
  // "(+91) 98..." keeps the country code without Excel reading "+91..." as a number or formula.
  ["Mobile", (e) => `(${e.countryCode}) ${e.phone}`],
  ["College", (e) => e.college],
  ["Degree", (e) => e.degree],
  ["Year of study", (e) => YEAR_LABELS[e.yearOfStudy] || e.yearOfStudy],
  ["City", (e) => e.city],
  ["Preferred level", (e) => (e.level ? e.level[0].toUpperCase() + e.level.slice(1) : "")],
  ["Message", (e) => e.message],
  ["Logged in", (e) => (e.user ? "Yes" : "No")],
  ["Latest note", (e) => [...(e.history || [])].reverse().find((h) => h.note)?.note || ""],
  ["Last updated (IST)", (e) => istDateTime(e.updatedAt)],
];

const UTF8_BOM = String.fromCharCode(0xfeff);

const toCsv = (enquiries) => {
  const rows = [CSV_COLUMNS.map(([header]) => header), ...enquiries.map((e) => CSV_COLUMNS.map(([, get]) => get(e)))];
  // BOM so Excel reads UTF-8 (names in Hindi, "–" in titles); CRLF line ends for Excel.
  return `${UTF8_BOM}${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
};

// GET /api/admin/program-enquiries/export.csv  (same filters as the list, no paging)
const exportEnquiriesCsv = async (req, res, next) => {
  try {
    const { query, error } = buildFilter(req.query);
    if (error) return res.status(400).json({ success: false, ...error });

    const enquiries = await ProgramEnquiry.find(query).sort({ createdAt: -1 }).limit(EXPORT_MAX_ROWS).lean();
    const day = istDateTime(new Date()).slice(0, 10);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="programme-enquiries-${day}.csv"`,
      "Cache-Control": "no-store",
    });
    return res.status(200).send(toCsv(enquiries));
  } catch (err) {
    return next(err);
  }
};

module.exports = { listEnquiries, updateEnquiryStatus, exportEnquiriesCsv, buildFilter, toCsv, csvCell, EXPORT_MAX_ROWS };
