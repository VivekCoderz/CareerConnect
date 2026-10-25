// Campus assessment engine: one attempt, server timer, fair-test events, AI queue, review, publish.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
jest.mock("../../campus/services/grader", () => ({ gradeWritten: jest.fn() }));
const grader = require("../../campus/services/grader");
const { api, createInstitution, createAdmin, importStudents, signIn, createAssessment } = require("../helpers/campus");
const CampusAttempt = require("../../campus/models/CampusAttempt");
const CampusGradingJob = require("../../campus/models/CampusGradingJob");
const worker = require("../../campus/services/gradingWorker");

const setUp = async () => {
  const uni = await createInstitution();
  const admin = await createAdmin();
  const batch = await importStudents(uni, admin.token, [["Fake Student", "s1@fakeuni.test", "R1", "7.1", ""]]);
  const assessment = await createAssessment(uni, batch);
  const token = await signIn(uni, "s1@fakeuni.test");
  return { uni, admin, assessment, token, call: api(uni) };
};

beforeEach(() => grader.gradeWritten.mockReset());

describe("taking the test (PRD R9)", () => {
  it("hides answers, keeps one attempt, saves answers and scores multiple choice from the key", async () => {
    const { assessment, token, call } = await setUp();
    const start = await call.post(`/assessments/${assessment._id}/start`, token);
    expect(start.status).toBe(200);
    const { attempt } = start.body;
    expect(attempt.questions).toHaveLength(5);
    expect(JSON.stringify(attempt.questions)).not.toMatch(/correctOptionId|rubric/);
    expect(attempt.remainingSeconds).toBeGreaterThan(59 * 60);

    const again = await call.post(`/assessments/${assessment._id}/start`, token);
    expect(again.body.attempt.id).toBe(attempt.id);

    await call.put(`/attempts/${attempt.id}/answers/q1`, token).send({ optionId: "b" });
    await call.put(`/attempts/${attempt.id}/answers/q2`, token).send({ optionId: "b" });
    await call.put(`/attempts/${attempt.id}/answers/q4`, token).send({ text: "A written answer" });
    expect((await call.put(`/attempts/${attempt.id}/answers/q1`, token).send({ optionId: "zzz" })).status).toBe(400);

    const resumed = await call.get(`/attempts/${attempt.id}`, token);
    expect(resumed.body.attempt.answers.find((a) => a.questionId === "q1").optionId).toBe("b");

    expect((await call.post(`/attempts/${attempt.id}/submit`, token)).body.status).toBe("submitted");
    const saved = await CampusAttempt.findById(attempt.id);
    expect(saved.marks.find((m) => m.questionId === "q1").score).toBe(1);
    expect(saved.marks.find((m) => m.questionId === "q2").score).toBe(0);
    expect(saved.marks.find((m) => m.questionId === "q4")).toMatchObject({ source: "ai", status: "pending" });
    expect(saved.marks.find((m) => m.questionId === "q5")).toMatchObject({ score: 0, status: "done" }); // no recording
    expect(await CampusGradingJob.countDocuments({ attemptId: saved._id })).toBe(1);

    expect((await call.put(`/attempts/${attempt.id}/answers/q3`, token).send({ optionId: "a" })).body.code).toBe("ATTEMPT_CLOSED");
    expect((await call.post(`/assessments/${assessment._id}/start`, token)).body.attempt.questions).toBeUndefined();
  });

  it("ends the test on the server when time is up, even without a submit", async () => {
    const { assessment, token, call } = await setUp();
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    await CampusAttempt.updateOne({ _id: attempt.id }, { deadlineAt: new Date(Date.now() - 60 * 1000) });
    const res = await call.get(`/attempts/${attempt.id}`, token);
    expect(res.body.attempt).toMatchObject({ status: "auto_submitted", submitReason: "time_up", remainingSeconds: 0 });
  });

  it("does not open before or after the window", async () => {
    const { assessment, token, call } = await setUp();
    assessment.opensAt = new Date(Date.now() + 60 * 60 * 1000);
    assessment.closesAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await assessment.save();
    expect((await call.post(`/assessments/${assessment._id}/start`, token)).body.code).toBe("NOT_OPEN");
  });
});

describe("fair-test events (PRD R10)", () => {
  it("auto-submits on the third counted event and ignores a duplicate fired at the same moment", async () => {
    const { assessment, token, call } = await setUp();
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    const send = (type) => call.post(`/attempts/${attempt.id}/events`, token).send({ type });
    expect((await send("tab_hidden")).body.countedEvents).toBe(1);
    expect((await send("window_blur")).body.countedEvents).toBe(1); // same switch, within 2 s
    await CampusAttempt.updateOne({ _id: attempt.id }, { $set: { "proctor.events.$[].at": new Date(Date.now() - 10000) } });
    expect((await send("fullscreen_exit")).body.countedEvents).toBe(2);
    await CampusAttempt.updateOne({ _id: attempt.id }, { $set: { "proctor.events.$[].at": new Date(Date.now() - 10000) } });
    const third = await send("tab_hidden");
    expect(third.body.autoSubmitted).toBe(true);
    expect((await CampusAttempt.findById(attempt.id)).submitReason).toBe("tab_switching");
    expect((await send("paste_blocked")).body.code).toBe("ATTEMPT_CLOSED");
  });
});

describe("AI marking, review and publishing (PRD R11, R12)", () => {
  it("marks written answers with the AI only, waits for review, then publishes", async () => {
    const { admin, assessment, token, call, uni } = await setUp();
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    await call.put(`/attempts/${attempt.id}/answers/q1`, token).send({ optionId: "b" });
    await call.put(`/attempts/${attempt.id}/answers/q4`, token).send({ text: "My plan is to fix the supply chain first." });
    await call.post(`/attempts/${attempt.id}/audio/q5`, token).attach("audio", Buffer.from("fake audio"), { filename: "a.webm", contentType: "audio/webm" });
    await call.post(`/attempts/${attempt.id}/submit`, token);

    grader.gradeWritten.mockResolvedValue({ score: 7, reason: "Clear plan.", model: "test" });
    expect(await worker.runOnce()).toBe(1);
    expect(grader.gradeWritten).toHaveBeenCalledTimes(1);
    const sent = grader.gradeWritten.mock.calls[0][0];
    expect(sent).toEqual({ prompt: "Fake scenario", rubric: "Fake rubric", maxScore: 10, answer: "My plan is to fix the supply chain first." });

    expect((await call.get(`/results/${assessment._id}`, token)).body.status).toBe("pending");
    const blocked = await call.post(`/ops/assessments/${assessment._id}/publish`, admin.token);
    expect(blocked.status).toBe(409); // speaking still needs a reviewer

    const detail = await call.get(`/ops/attempts/${attempt.id}`, admin.token);
    expect(detail.body.questions.find((q) => q.id === "q5").audioUrl).toMatch(/\/files\/.+\/raw\?exp=/);
    await call.patch(`/ops/attempts/${attempt.id}/marks/q5`, admin.token).send({ score: 6, note: "Clear but short" });
    expect((await call.post(`/ops/assessments/${assessment._id}/publish`, admin.token)).status).toBe(200);

    const result = await call.get(`/results/${assessment._id}`, token);
    expect(result.body.result).toMatchObject({ total: 14, max: 23 });
    expect(result.body.result.sections.map((s) => s.score)).toEqual([1, 7, 6]);
    expect(JSON.stringify(result.body)).not.toMatch(/correctOptionId|rubric/);
    expect(uni).toBeTruthy();
  });

  it("retries a failed AI call and finally leaves it for a person", async () => {
    const { assessment, token, call } = await setUp();
    const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
    await call.put(`/attempts/${attempt.id}/answers/q4`, token).send({ text: "Some answer" });
    await call.post(`/attempts/${attempt.id}/submit`, token);
    grader.gradeWritten.mockRejectedValue(new Error("rate limited"));
    for (let i = 0; i < worker.MAX_TRIES; i += 1) {
      await CampusGradingJob.updateMany({}, { nextRunAt: new Date(Date.now() - 1000) });
      await worker.runOnce();
    }
    const job = await CampusGradingJob.findOne({ attemptId: attempt.id });
    expect(job).toMatchObject({ status: "failed", tries: worker.MAX_TRIES });
    const saved = await CampusAttempt.findById(attempt.id);
    expect(saved.marks.find((m) => m.questionId === "q4").status).toBe("failed");
  });
});

describe("results released per test (PRD R11)", () => {
  it("keeps a test taken after publishing hidden until staff publish again", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    const batch = await importStudents(uni, admin.token, [
      ["Early Student", "early@fakeuni.test", "R1", "7.1", ""],
      ["Late Student", "late@fakeuni.test", "R2", "6.4", ""],
    ]);
    const assessment = await createAssessment(uni, batch);
    const call = api(uni);
    const takeQuickly = async (email) => {
      const token = await signIn(uni, email);
      const { attempt } = (await call.post(`/assessments/${assessment._id}/start`, token)).body;
      await call.put(`/attempts/${attempt.id}/answers/q1`, token).send({ optionId: "b" });
      await call.post(`/attempts/${attempt.id}/submit`, token); // written and speaking left blank: nothing to mark
      return token;
    };

    const early = await takeQuickly("early@fakeuni.test");
    const lateToken = await signIn(uni, "late@fakeuni.test");
    const late = (await call.post(`/assessments/${assessment._id}/start`, lateToken)).body.attempt;

    const first = await call.post(`/ops/assessments/${assessment._id}/publish`, admin.token);
    expect(first.body).toMatchObject({ attempts: 1, inProgress: 1 });
    expect((await call.get(`/results/${assessment._id}`, early)).body.status).toBe("published");

    await call.put(`/attempts/${late.id}/answers/q1`, lateToken).send({ optionId: "b" });
    await call.post(`/attempts/${late.id}/submit`, lateToken);
    expect((await call.get(`/results/${assessment._id}`, lateToken)).body.status).toBe("pending");
    const list = (await call.get("/assessments", lateToken)).body.assessments[0];
    expect(list.resultsPublished).toBe(false);

    const second = await call.post(`/ops/assessments/${assessment._id}/publish`, admin.token);
    expect(second.body).toMatchObject({ attempts: 1, inProgress: 0 });
    expect((await call.get(`/results/${assessment._id}`, lateToken)).body.status).toBe("published");
    expect((await call.post(`/ops/assessments/${assessment._id}/publish`, admin.token)).body.code).toBe("NOTHING_TO_PUBLISH");
  });
});
