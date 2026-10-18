const ExcelJS = require("exceljs");

// Reads the university's student sheet (.xlsx or .csv) and checks every row before anything is
// created (PRD R3). Template columns: name, email, roll no, cgpa, phone.
const COLUMNS = {
  fullName: ["name", "full name", "student name"],
  email: ["email", "university email", "email id", "mail"],
  rollNo: ["roll no", "roll number", "roll", "enrollment no", "enrolment no", "prn"],
  cgpa: ["cgpa", "gpa", "cgpa (10)"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact"],
};
const MAX_ROWS = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/[_\s]+/g, " ").replace(/[.:]/g, "");

const pad = (n) => String(n).padStart(2, "0");

const cellText = (value) => {
  if (value === null || value === undefined) return "";
  // Excel dates arrive as UTC dates; a time-only cell is a date on 1899-12-30.
  if (value instanceof Date) {
    if (value.getUTCFullYear() <= 1900) return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === "object") {
    if (value.text) return String(value.text); // hyperlink cell
    if (value.result !== undefined) return String(value.result); // formula cell
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
  }
  return String(value);
};

/** Splits one CSV line, honouring double quotes. */
const csvLine = (line) => {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
};

/** Raw rows (arrays of strings) from an uploaded file. */
const readRows = async (file) => {
  const name = String(file?.originalname || "").toLowerCase();
  if (name.endsWith(".csv")) {
    const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    return text.split(/\r?\n/).filter((l) => l.trim()).map(csvLine);
  }
  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer);
    const ws = wb.worksheets[0];
    const rows = [];
    ws?.eachRow({ includeEmpty: false }, (row) => {
      const values = [];
      for (let c = 1; c <= row.cellCount; c += 1) values.push(cellText(row.getCell(c).value));
      rows.push(values);
    });
    return rows;
  }
  throw Object.assign(new Error("Upload an .xlsx or .csv file."), { status: 400 });
};

/** Checks the rows; returns { rows: [{ line, data, errors }], summary, missingColumns }. */
const validateRows = (raw, { allowedEmailDomains = [] } = {}) => {
  if (!raw.length) return { rows: [], summary: { total: 0, valid: 0, invalid: 0 }, missingColumns: ["name", "email"] };
  const header = raw[0].map(norm);
  const index = {};
  for (const [field, names] of Object.entries(COLUMNS)) {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) index[field] = i;
  }
  const missingColumns = ["fullName", "email"].filter((f) => index[f] === undefined);
  if (missingColumns.length) return { rows: [], summary: { total: 0, valid: 0, invalid: 0 }, missingColumns };

  const seenEmail = new Map();
  const seenRoll = new Map();
  const rows = raw.slice(1, MAX_ROWS + 1).map((cells, i) => {
    const get = (f) => (index[f] === undefined ? "" : cellText(cells[index[f]]).trim());
    const data = {
      fullName: get("fullName").replace(/\s+/g, " "),
      email: get("email").toLowerCase(),
      rollNo: get("rollNo"),
      cgpa: get("cgpa") === "" ? null : Number(get("cgpa")),
      phone: get("phone").replace(/[^\d+]/g, ""),
    };
    const errors = [];
    if (!data.fullName) errors.push("Name is missing");
    if (!EMAIL.test(data.email)) errors.push("Email is missing or not valid");
    else if (allowedEmailDomains.length && !allowedEmailDomains.includes(data.email.split("@")[1])) {
      errors.push(`Email must end with @${allowedEmailDomains.join(" or @")}`);
    }
    if (data.cgpa !== null && (!Number.isFinite(data.cgpa) || data.cgpa < 0 || data.cgpa > 10)) {
      errors.push("CGPA must be a number from 0 to 10");
    }
    if (data.phone && !/^(\+?91)?\d{10}$/.test(data.phone)) errors.push("Phone must be a 10-digit number");
    if (data.email && seenEmail.has(data.email)) errors.push(`Same email as line ${seenEmail.get(data.email)}`);
    if (data.rollNo && seenRoll.has(data.rollNo)) errors.push(`Same roll number as line ${seenRoll.get(data.rollNo)}`);
    const line = i + 2; // spreadsheet line, header is line 1
    if (data.email) seenEmail.set(data.email, line);
    if (data.rollNo) seenRoll.set(data.rollNo, line);
    if (data.phone) data.phone = data.phone.slice(-10);
    if (data.cgpa !== null && Number.isFinite(data.cgpa)) data.cgpa = Math.round(data.cgpa * 100) / 100;
    return { line, data, errors };
  }).filter((r) => r.data.fullName || r.data.email || r.data.rollNo);

  const invalid = rows.filter((r) => r.errors.length).length;
  return { rows, summary: { total: rows.length, valid: rows.length - invalid, invalid }, missingColumns: [] };
};

module.exports = { readRows, validateRows, cellText, COLUMNS };
