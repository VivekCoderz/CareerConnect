// Campus tests from Excel: sample format, row checks, create and replace, negative marking on
// multiple choice only, compulsory questions, and the lock once students have started.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const ExcelJS = require("exceljs");
const { api, createInstitution, createAdmin, importStudents, signIn } = require("../helpers/campus");
const CampusAssessment = require("../../campus/models/CampusAssessment");
const CampusAttempt = require("../../campus/models/CampusAttempt");

const HEAD = ["Section", "Type", "Question", "Context (optional)", "Option A", "Option B", "Option C", "Option D", "Option E", "Option F", "Correct option", "Marks", "Negative marks", "Compulsory", "Marking guide", "Min words", "Max words", "Max seconds"];
const mcq = (section, prompt, correct, { marks = 1, negative = "", compulsory = "No" } = {}) => [section, "MCQ", prompt, "", "One", "Two", "Three", "Four", "", "", correct, marks, negative, compulsory, "", "", "", ""];
const sheet = async (rows) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Questions");
  ws.addRow(HEAD);
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
};
const binary = (res, cb) => { const c = []; res.on("data", (d) => c.push(d)); res.on("end", () => cb(null, Buffer.concat(c))); };

const GOOD = [
  mcq("Quant", "Pick B", "B", { marks: 2, compulsory: "Yes" }),
  mcq("Quant", "Pick C", "C", { marks: 2, negative: 1 }),
  mcq("Reasoning", "Pick A", "A"),
  ["Scenarios", "Written", "Write a plan", "", "", "", "", "", "", "", "", 10, "", "No", "Causes and actions", 50, 200, ""],
];

const setUp = async () => {
  const uni = await createInstitution();
  const admin = await createAdmin();
  const batch = await importStudents(uni, admin.token, [["Fake Student", "s1@fakeuni.test", "R1", "7.1", ""]]);
  return { uni, admin, batch, call: api(uni) };
};
const createTest = (call, admin, batch, file, extra = {}) =>
  call.post("/ops/assessments", admin.token)
    .field("title", "Excel Test").field("batchId", String(batch._id)).field("timeLimitMinutes", "30")
    .field("opensAt", new Date(Date.now() - 60000).toISOString()).field("closesAt", new Date(Date.now() + 3600000).toISOString())
    .field("negativeEnabled", extra.negativeEnabled ?? "true").field("negativeDefault", extra.negativeDefault ?? "0.5")
    .attach("file", file, "questions.xlsx");

describe("questions from Excel", () => {
  it("downloads a sample format that uploads cleanly once filled", async () => {
    const { admin, call } = await setUp();
    const res = await call.get("/ops/questions/template.xlsx", admin.token).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/questions-sample-format\.xlsx/);
    const preview = await call.post("/ops/questions/preview", admin.token).attach("file", res.body, "questions-sample-format.xlsx");
    expect(preview.body).toMatchObject({ valid: true, counts: { mcq: 1, written: 1, speaking: 1 }, totalMarks: 21, compulsory: 1 });
  });

  it("names every bad row and saves nothing", async () => {
    const { admin, batch, call } = await setUp();
    const bad = await sheet([
      mcq("Quant", "Fine", "A"),
      ["", "Essay", "", "", "", "", "", "", "", "", "", 0, "", "", "", "", "", ""],
      mcq("Quant", "Wrong key", "E"),
      ["Scenarios", "Written", "No guide", "", "", "", "", "", "", "", "", 10, "2", "No", "", "", "", ""],
      mcq("Quant", "Too much minus", "A", { marks: 1, negative: 3 }),
    ]);
    const preview = await call.post("/ops/questions/preview", admin.token).attach("file", bad, "q.xlsx");
    expect(preview.body.valid).toBe(false);
    const errors = Object.fromEntries(preview.body.rows.map((r) => [r.line, r.errors.join(" | ")]));
    expect(errors[2]).toBe("");
    expect(errors[3]).toMatch(/Section is missing.*Type must be.*Question is missing.*Marks must be/);
    expect(errors[4]).toMatch(/Correct option E is empty/);
    expect(errors[5]).toMatch(/Negative marks apply to multiple choice only.*marking guide/);
    expect(errors[6]).toMatch(/Negative marks must be from 0 up to the marks/);
    const created = await createTest(call, admin, batch, bad);
    expect(created.status).toBe(400);
    expect(created.body.code).toBe("SHEET_ERRORS");
    expect(await CampusAssessment.countDocuments({ batchId: batch._id })).toBe(0);
  });
});

describe("negative marking and compulsory questions", () => {
  it("takes marks off wrong MCQ answers only, blocks submit until compulsory ones are answered, and locks once started", async () => {
    const { uni, admin, batch, call } = await setUp();
    const created = await createTest(call, admin, batch, await sheet(GOOD));
    expect(created.status).toBe(201);
    const assessment = await CampusAssessment.findById(created.body.assessment.id);
    expect(assessment.sections.map((s) => s.title)).toEqual(["Quant", "Reasoning", "Scenarios"]);
    expect(assessment.instructions).toMatch(/Negative marking.*0\.5/);
    expect(assessment.instructions).toMatch(/1 question is compulsory/);

    const token = await signIn(uni, "s1@fakeuni.test");
    const listed = (await call.get("/assessments", token)).body.assessments[0];
    expect(listed).toMatchObject({ negativeMarking: { defaultMarks: 0.5 }, compulsoryCount: 1 });
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    const shown = Object.fromEntries(attempt.questions.map((q) => [q.prompt, q]));
    expect(shown["Pick B"]).toMatchObject({ compulsory: true, negativeMarks: 0.5, points: 2 });
    expect(shown["Pick C"].negativeMarks).toBe(1);
    expect(shown["Write a plan"].negativeMarks).toBe(0);
    expect(JSON.stringify(attempt.questions)).not.toMatch(/correctOptionId/);

    const id = (prompt) => assessment.questions.find((q) => q.prompt === prompt).id;
    await call.put(`/attempts/${attempt.id}/answers/${id("Pick C")}`, token).send({ optionId: "a" }); // wrong: -1
    await call.put(`/attempts/${attempt.id}/answers/${id("Pick A")}`, token).send({ optionId: "b" }); // wrong: -0.5 (default)
    const blocked = await call.post(`/attempts/${attempt.id}/submit`, token);
    expect(blocked.status).toBe(409);
    expect(blocked.body).toMatchObject({ code: "COMPULSORY_MISSING", questionIds: [id("Pick B")] });

    expect((await call.put(`/ops/assessments/${assessment._id}/questions`, admin.token).attach("file", await sheet(GOOD), "q.xlsx")).body.code).toBe("HAS_ATTEMPTS");
    expect((await call.patch(`/ops/assessments/${assessment._id}/marking`, admin.token).send({ negativeEnabled: false })).body.code).toBe("HAS_ATTEMPTS");

    await call.put(`/attempts/${attempt.id}/answers/${id("Pick B")}`, token).send({ optionId: "b" }); // right: +2
    expect((await call.post(`/attempts/${attempt.id}/submit`, token)).status).toBe(200);
    const saved = await CampusAttempt.findById(attempt.id);
    const mark = (prompt) => saved.marks.find((m) => m.questionId === id(prompt)).score;
    expect([mark("Pick B"), mark("Pick C"), mark("Pick A"), mark("Write a plan")]).toEqual([2, -1, -0.5, 0]);
    // Quant: 2 - 1 = 1; Reasoning: -0.5 becomes 0 (a section never goes below 0); total 1.
    expect(saved.scores.bySection.get(assessment.questions.find((q) => q.prompt === "Pick A").section).score).toBe(0);
    expect(saved.scores.total).toBe(1);
  });

  it("time-up still submits with compulsory questions blank, and negative marking can be off", async () => {
    const { uni, admin, batch, call } = await setUp();
    const created = await createTest(call, admin, batch, await sheet(GOOD), { negativeEnabled: "false" });
    const assessment = await CampusAssessment.findById(created.body.assessment.id);
    expect(assessment.instructions).toMatch(/no negative marking/);
    const token = await signIn(uni, "s1@fakeuni.test");
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    expect(attempt.questions.every((q) => q.negativeMarks === 0)).toBe(true);
    const wrong = assessment.questions.find((q) => q.prompt === "Pick C");
    await call.put(`/attempts/${attempt.id}/answers/${wrong.id}`, token).send({ optionId: "a" });
    await CampusAttempt.updateOne({ _id: attempt.id }, { deadlineAt: new Date(Date.now() - 60000) });
    const after = await call.get(`/attempts/${attempt.id}`, token);
    expect(after.body.attempt).toMatchObject({ status: "auto_submitted", submitReason: "time_up" });
    const saved = await CampusAttempt.findById(attempt.id);
    expect(saved.marks.find((m) => m.questionId === wrong.id).score).toBe(0);
  });

  it("exports a test's questions in the same format and replaces them before anyone starts", async () => {
    const { admin, batch, call } = await setUp();
    const created = await createTest(call, admin, batch, await sheet(GOOD));
    const id = created.body.assessment.id;
    const exported = await call.get(`/ops/assessments/${id}/questions.xlsx`, admin.token).buffer(true).parse(binary);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported.body);
    const ws = wb.getWorksheet("Questions");
    ws.getRow(2).getCell(3).value = "Pick B (edited)";
    const edited = Buffer.from(await wb.xlsx.writeBuffer());
    expect((await call.put(`/ops/assessments/${id}/questions`, admin.token).attach("file", edited, "q.xlsx")).body).toMatchObject({ questionCount: 4 });
    const saved = await CampusAssessment.findById(id);
    expect(saved.questions[0]).toMatchObject({ prompt: "Pick B (edited)", compulsory: true, correctOptionId: "b", points: 2 });
    expect(saved.questions[1].negativeMarks).toBe(1);
    expect((await call.patch(`/ops/assessments/${id}/marking`, admin.token).send({ negativeEnabled: true, negativeDefault: 0.25 })).body.negativeMarking).toEqual({ enabled: true, defaultMarks: 0.25 });
  });
});
