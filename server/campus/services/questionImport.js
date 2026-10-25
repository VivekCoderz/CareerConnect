const ExcelJS = require("exceljs");
const { readRows, cellText } = require("./importer");

// The question bank as an Excel sheet: the sample format staff download, the parser for an
// uploaded sheet (every row checked before anything is saved), and the export of an existing
// test in the same format so it can be edited and uploaded again.

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const HEADERS = [
  ["section", "Section", 22],
  ["type", "Type", 12],
  ["prompt", "Question", 50],
  ["context", "Context (optional)", 30],
  ...LETTERS.map((l) => [`option${l}`, `Option ${l}`, 18]),
  ["correct", "Correct option", 10],
  ["points", "Marks", 8],
  ["negative", "Negative marks", 10],
  ["compulsory", "Compulsory", 11],
  ["rubric", "Marking guide", 40],
  ["minWords", "Min words", 10],
  ["maxWords", "Max words", 10],
  ["maxSeconds", "Max seconds", 11],
];
const ALIASES = {
  section: ["section"], type: ["type", "question type"], prompt: ["question", "prompt"], context: ["context (optional)", "context", "data"],
  correct: ["correct option", "correct", "answer"], points: ["marks", "points"], negative: ["negative marks", "negative", "minus marks"],
  compulsory: ["compulsory", "mandatory", "required"], rubric: ["marking guide", "rubric"], minWords: ["min words"], maxWords: ["max words"], maxSeconds: ["max seconds", "speaking seconds"],
  ...Object.fromEntries(LETTERS.map((l) => [`option${l}`, [`option ${l.toLowerCase()}`]])),
};
const TYPES = { mcq: "mcq", "multiple choice": "mcq", written: "written", "written answer": "written", speaking: "speaking" };
const MAX_QUESTIONS = 200;

const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/[_\s]+/g, " ").replace(/[.:]/g, "");
const slug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "section";
const yes = (v) => ["yes", "y", "true", "1", "compulsory"].includes(norm(v));

/** Parses an uploaded sheet. Returns { rows: [{ line, errors, summary }], questions, sections, valid, missingColumns }. */
const parseQuestions = async (file) => {
  const raw = await readRows(file);
  const header = (raw[0] || []).map(norm);
  const index = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) index[field] = i;
  }
  const missingColumns = ["section", "type", "prompt"].filter((f) => index[f] === undefined).map((f) => HEADERS.find((h) => h[0] === f)[1]);
  if (missingColumns.length) return { rows: [], questions: [], sections: [], valid: false, missingColumns };

  const sections = [];
  const questions = [];
  const rows = [];
  raw.slice(1).forEach((cells, i) => {
    const get = (f) => (index[f] === undefined ? "" : cellText(cells[index[f]]).trim());
    if (!get("prompt") && !get("section") && !get("type")) return;
    const line = i + 2;
    const errors = [];
    const sectionTitle = get("section").replace(/\s+/g, " ").slice(0, 80);
    const type = TYPES[norm(get("type"))];
    const prompt = get("prompt").slice(0, 3001);
    const points = Number(get("points") || (type === "mcq" ? 1 : 0));
    const negativeText = get("negative");
    const negative = negativeText === "" ? null : Number(negativeText);
    if (!sectionTitle) errors.push("Section is missing");
    if (!type) errors.push("Type must be MCQ, Written or Speaking");
    if (!prompt) errors.push("Question is missing");
    else if (prompt.length > 3000) errors.push("Question is longer than 3000 characters");
    if (!Number.isFinite(points) || points <= 0 || points > 100) errors.push("Marks must be a number from 0.5 to 100");
    if (negative !== null && (!Number.isFinite(negative) || negative < 0 || negative > points)) errors.push("Negative marks must be from 0 up to the marks");

    const q = { section: "", type, prompt, context: get("context").slice(0, 3000), points, compulsory: yes(get("compulsory")), negativeMarks: null };
    if (type === "mcq") {
      const options = LETTERS.map((l) => ({ id: l.toLowerCase(), text: get(`option${l}`).slice(0, 600) })).filter((o) => o.text);
      const correct = norm(get("correct"));
      if (options.length < 2) errors.push("A multiple-choice question needs at least 2 options");
      if (!LETTERS.map((l) => l.toLowerCase()).includes(correct)) errors.push("Correct option must be a letter, A to F");
      else if (!options.some((o) => o.id === correct)) errors.push(`Correct option ${correct.toUpperCase()} is empty`);
      Object.assign(q, { options, correctOptionId: correct, negativeMarks: negative });
    } else if (type) {
      if (negative) errors.push("Negative marks apply to multiple choice only");
      const rubric = get("rubric").slice(0, 3000);
      if (type === "written" && !rubric) errors.push("A written question needs a marking guide");
      const minWords = Number(get("minWords") || 0);
      const maxWords = Number(get("maxWords") || 0);
      const maxSeconds = Number(get("maxSeconds") || (type === "speaking" ? 120 : 0));
      if (type === "written" && (!Number.isInteger(minWords) || !Number.isInteger(maxWords) || minWords < 0 || (maxWords && maxWords < minWords))) errors.push("Min and max words must be whole numbers, max at least min");
      if (type === "speaking" && (!Number.isInteger(maxSeconds) || maxSeconds < 15 || maxSeconds > 600)) errors.push("Max seconds must be from 15 to 600");
      Object.assign(q, { options: [], correctOptionId: null, rubric, minWords, maxWords, maxSeconds: type === "speaking" ? maxSeconds : 0 });
    }
    if (sectionTitle) {
      let section = sections.find((s) => s.title.toLowerCase() === sectionTitle.toLowerCase());
      if (!section) {
        let key = slug(sectionTitle);
        while (sections.some((s) => s.key === key)) key = `${key}_2`;
        section = { key, title: sectionTitle };
        sections.push(section);
      }
      q.section = section.key;
    }
    rows.push({ line, errors, summary: `${type ? type.toUpperCase() : "?"} · ${sectionTitle || "?"} · ${prompt.slice(0, 80)}` });
    if (!errors.length) questions.push(q);
  });
  if (rows.length > MAX_QUESTIONS) rows[MAX_QUESTIONS].errors.push(`At most ${MAX_QUESTIONS} questions in one test`);
  questions.forEach((q, i) => { q.id = `q${String(i + 1).padStart(2, "0")}`; });
  const valid = rows.length > 0 && rows.length <= MAX_QUESTIONS && rows.every((r) => !r.errors.length);
  return { rows, questions, sections, valid, missingColumns: [] };
};

const EXAMPLES = [
  { section: "Quantitative Aptitude", type: "MCQ", prompt: "A shop sells a pen for Rs 120 after a 20% discount. What was the marked price?", optionA: "Rs 140", optionB: "Rs 144", optionC: "Rs 150", optionD: "Rs 160", correct: "C", points: 1, negative: 0.25, compulsory: "No" },
  { section: "Business Scenarios", type: "Written", prompt: "Sales of your product fell 15% in one quarter. Write a short plan to find the cause and recover.", points: 10, compulsory: "Yes", rubric: "Finds likely causes (3), uses data to confirm (3), clear action plan with owners and timeline (4).", minWords: 120, maxWords: 250 },
  { section: "Speaking", type: "Speaking", prompt: "Introduce yourself and say why you chose an MBA. Speak for up to two minutes.", points: 10, compulsory: "No", rubric: "Clarity (4), structure (3), confidence (3).", maxSeconds: 120 },
];

const styleHeader = (ws) => {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 30;
  ws.views = [{ state: "frozen", ySplit: 1 }];
};

/** Builds the questions workbook; with `questions` it exports an existing test. */
const questionsWorkbook = async ({ questions = null, sections = [], title = "" } = {}) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Questions");
  ws.columns = HEADERS.map(([key, header, width]) => ({ key, header, width, style: { alignment: { wrapText: true, vertical: "top" } } }));
  styleHeader(ws);
  const sectionTitle = (key) => sections.find((s) => s.key === key)?.title || key;
  const rows = questions
    ? questions.map((q) => ({
      section: sectionTitle(q.section), type: { mcq: "MCQ", written: "Written", speaking: "Speaking" }[q.type], prompt: q.prompt, context: q.context || "",
      ...Object.fromEntries(LETTERS.map((l) => [`option${l}`, q.options?.find((o) => o.id === l.toLowerCase())?.text || ""])),
      correct: q.correctOptionId ? q.correctOptionId.toUpperCase() : "", points: q.points, negative: q.negativeMarks ?? "",
      compulsory: q.compulsory ? "Yes" : "No", rubric: q.rubric || "", minWords: q.minWords || "", maxWords: q.maxWords || "", maxSeconds: q.maxSeconds || "",
    }))
    : EXAMPLES;
  rows.forEach((r) => ws.addRow(r));
  const last = Math.max(rows.length + 1, 300);
  const list = (col, values) => {
    for (let r = 2; r <= last; r += 1) ws.getCell(`${col}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${values}"`] };
  };
  list("B", "MCQ,Written,Speaking");
  list("K", "A,B,C,D,E,F");
  list("N", "Yes,No");

  const help = wb.addWorksheet("How to fill");
  help.columns = [{ width: 24 }, { width: 90 }];
  [
    ["Questions sheet", title ? `Questions of "${title}". Edit and upload again to replace them (only before anyone starts the test).` : "One row per question. Delete the three example rows before uploading."],
    ["Section", "The section name, for example Quantitative Aptitude. Sections appear in the order of their first question."],
    ["Type", "MCQ, Written or Speaking."],
    ["Question", "The question text. Required."],
    ["Context (optional)", "A table or passage shown above the question, for data interpretation."],
    ["Option A to F", "MCQ only: at least two options."],
    ["Correct option", "MCQ only: the letter of the right option, for example C."],
    ["Marks", "Marks for a right answer. MCQ default is 1."],
    ["Negative marks", "MCQ only. Marks taken off for a wrong answer when negative marking is on for the test. Leave blank to use the test's default. Blank answers never lose marks."],
    ["Compulsory", "Yes if the student must answer it before submitting. When time runs out the test is submitted anyway."],
    ["Marking guide", "Written: required, used to mark the answer. Speaking: used by the reviewer."],
    ["Min / Max words", "Written only: the word range shown to the student."],
    ["Max seconds", "Speaking only: the longest recording, 15 to 600 seconds (default 120)."],
  ].forEach((r) => help.addRow(r));
  help.getColumn(1).font = { bold: true };
  help.eachRow((row) => { row.alignment = { wrapText: true, vertical: "top" }; });
  return wb.xlsx.writeBuffer();
};

module.exports = { parseQuestions, questionsWorkbook, MAX_QUESTIONS };
