// University admin's test analysis: section-wise counts and each student's breakdown before
// publishing, the answer sheet, and publishing from the university dashboard.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const { api, createInstitution, createAdmin, importStudents, signIn, createAssessment } = require("../helpers/campus");
const CampusMember = require("../../campus/models/CampusMember");
const bank = require("../../campus/data/mba-assessment-v1");
const AuditLog = require("../../models/AuditLog");

describe("test analysis for the university admin", () => {
  it("shows section counts and the answer sheet before publishing, then lets the admin publish", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    const batch = await importStudents(uni, admin.token, [
      ["Student One", "one@fakeuni.test", "R1", "7.1", ""],
      ["Student Two", "two@fakeuni.test", "R2", "6.4", ""],
      ["Dean Office", "dean@fakeuni.test", "", "", ""],
    ]);
    await CampusMember.updateOne({ email: "dean@fakeuni.test" }, { role: "manager" });
    const assessment = await createAssessment(uni, batch);
    const call = api(uni);
    const take = async (email, answers) => {
      const token = await signIn(uni, email);
      const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
      for (const [qid, body] of Object.entries(answers)) await call.put(`/attempts/${attempt.id}/answers/${qid}`, token).send(body);
      await call.post(`/attempts/${attempt.id}/submit`, token);
      return token;
    };
    const one = await take("one@fakeuni.test", { q1: { optionId: "b" }, q2: { optionId: "b" } }); // right, wrong, q3 skipped
    await take("two@fakeuni.test", { q1: { optionId: "b" }, q2: { optionId: "a" }, q3: { optionId: "a" } }); // all right
    const dean = await signIn(uni, "dean@fakeuni.test");

    const res = await call.get("/manager/analysis", dean);
    expect(res.status).toBe(200);
    expect(res.body.publish).toMatchObject({ toRelease: 2, pendingMarking: 0, released: 0, submitted: 2 });
    const quant = res.body.sections.find((s) => s.key === "quant");
    expect(quant).toMatchObject({ questions: 3, correct: 4, wrong: 1, skipped: 1, accuracy: 80, avgAttempted: 2.5 });
    const first = res.body.students.find((s) => s.fullName === "Student One");
    expect(first.sections.find((s) => s.key === "quant")).toMatchObject({ attempted: 2, correct: 1, wrong: 1, skipped: 1, score: 1, max: 3 });
    expect(first.released).toBe(false);

    const sheet = await call.get(`/manager/attempts/${first.memberId}/answers`, dean);
    expect(sheet.status).toBe(200);
    const q2 = sheet.body.questions.find((q) => q.id === "q2");
    expect(q2).toMatchObject({ chosenOptionId: "b", correctOptionId: "a", correct: false, mark: { score: 0, max: 1 } });
    expect(sheet.body.questions.find((q) => q.id === "q3")).toMatchObject({ answered: false });

    const student = await signIn(uni, "two@fakeuni.test", { profile: false });
    expect((await call.get("/manager/analysis", student)).status).toBe(403);
    expect((await call.post("/manager/publish", student)).status).toBe(403);
    expect((await call.get(`/results/${assessment._id}`, one)).body.status).toBe("pending");

    const published = await call.post("/manager/publish", dean).send({ assessmentId: String(assessment._id) });
    expect(published.body).toMatchObject({ success: true, attempts: 2 });
    expect((await call.get(`/results/${assessment._id}`, one)).body.status).toBe("published");
    expect((await call.get("/manager/analysis", dean)).body.publish).toMatchObject({ toRelease: 0, released: 2 });

    // Who published, and the earlier import, are in the audit log.
    const logged = await AuditLog.findOne({ module: "Campus", action: "CAMPUS_RESULTS_PUBLISHED", target: String(assessment._id) }).lean();
    expect(logged).toMatchObject({ actorEmail: expect.stringMatching(/^dean@/) });
    expect(JSON.parse(logged.details)).toMatchObject({ attempts: 2, inProgress: 0 });
    expect(await AuditLog.countDocuments({ module: "Campus", action: "CAMPUS_IMPORT", target: String(uni._id) })).toBe(1);

    const other = await createInstitution();
    expect((await api(other).get(`/manager/attempts/${first.memberId}/answers`, admin.token)).status).toBe(404);
  });

  it("the question bank is 50 questions for 100 marks", () => {
    expect(bank.questions).toHaveLength(50);
    expect(bank.questions.reduce((s, q) => s + q.points, 0)).toBe(100);
  });
});
