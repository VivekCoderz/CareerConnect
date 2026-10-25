// Campus student profile: personal and academic details, photo and resume, completion and the
// 90% rule for starting a test, semester on the batch, and the university admin's view.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const request = require("supertest");
const { app, api, createInstitution, createAdmin, importStudents, signIn, completeProfile, createAssessment, PNG, PDF } = require("../helpers/campus");
const CampusMember = require("../../campus/models/CampusMember");

const ROW = ["Fake Student", "s1@fakeuni.test", "R1", "7.1", "9876500001"];

const setUp = async () => {
  const uni = await createInstitution();
  const admin = await createAdmin();
  const batch = await importStudents(uni, admin.token, [ROW]);
  const token = await signIn(uni, "s1@fakeuni.test", { profile: false });
  return { uni, admin, batch, token, call: api(uni) };
};

describe("student profile", () => {
  it("validates details, counts completion and needs 90% to start a new test", async () => {
    const { uni, batch, token, call } = await setUp();
    const assessment = await createAssessment(uni, batch);

    const first = await call.get("/profile", token);
    expect(first.body.completion).toMatchObject({ percent: 27, required: 90, complete: false }); // name, phone, MBA CGPA
    expect(first.body.completion.missing.map((m) => m.key)).toEqual(["dob", "gender", "photo", "linkedin", "resume", "class10", "class12", "graduation"]);
    const blocked = await call.post(`/assessments/${assessment._id}/start`, token);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PROFILE_INCOMPLETE");

    const bad = await call.patch("/profile", token).send({
      gender: "robot", linkedinUrl: "https://example.com/me", dob: "2020-01-01",
      class10: { board: "CBSE", maxMarks: 500, obtainedMarks: 600, year: 2018 },
      graduation: { cgpa: 11 },
    });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors).sort()).toEqual(["class10.obtainedMarks", "dob", "gender", "graduation.cgpa", "linkedinUrl"]);

    // A diploma counts in place of 12th; partial saves are fine.
    const partial = await call.patch("/profile", token).send({ linkedinUrl: "www.linkedin.com/in/fake-student", diploma: { course: "Diploma in Mechanical", institute: "Fake Polytechnic", maxMarks: 1000, obtainedMarks: 720, year: 2021 } });
    expect(partial.body.profile.linkedinUrl).toBe("https://www.linkedin.com/in/fake-student");
    expect(partial.body.completion.missing.map((m) => m.key)).not.toContain("class12");

    expect((await call.post("/profile/photo", token).attach("file", Buffer.from("not an image"), { filename: "x.png", contentType: "image/png" })).status).toBe(400);
    expect((await call.post("/profile/resume", token).attach("file", PNG, { filename: "cv.pdf", contentType: "application/pdf" })).status).toBe(400);

    await completeProfile(uni, token);
    const done = await call.get("/profile", token);
    expect(done.body.completion).toMatchObject({ percent: 100, complete: true });
    expect(done.body.profile.class10).toMatchObject({ board: "CBSE", maxMarks: 500, obtainedMarks: 430 });
    expect(done.body.member.verification.status).toBe("pending");
    expect((await call.post(`/assessments/${assessment._id}/start`, token)).status).toBe(200);

    // A started test can always continue, even if the profile drops below 90% later.
    await CampusMember.updateOne({ email: "s1@fakeuni.test" }, { $set: { "profile.resumeFileId": null, "profile.photoFileId": null } });
    expect((await call.post(`/assessments/${assessment._id}/start`, token)).status).toBe(200);
  });

  it("serves the photo and resume through short-lived links to the student and the university admin only", async () => {
    const { uni, admin, token, call } = await setUp();
    await call.post("/profile/photo", token).attach("file", PNG, { filename: "me.png", contentType: "image/png" });
    const withResume = await call.post("/profile/resume", token).attach("file", PDF, { filename: "cv.pdf", contentType: "application/pdf" });
    const link = new URL(withResume.body.profile.resume.url);
    const file = await request(app).get(link.pathname + link.search);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toMatch(/application\/pdf/);
    expect((await request(app).get(link.pathname + link.search.replace(/sig=[^&]+/, "sig=bad"))).status).toBe(403);

    const member = await CampusMember.findOne({ email: "s1@fakeuni.test" });
    const otherStudent = await (async () => {
      await importStudents(uni, admin.token, [["Other", "s2@fakeuni.test", "R2", "6.5", ""]]);
      return signIn(uni, "s2@fakeuni.test", { profile: false });
    })();
    expect((await call.get(`/manager/students/${member._id}/profile`, otherStudent)).status).toBe(403);
    const asAdmin = await call.get(`/manager/students/${member._id}/profile`, admin.token);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.profile.photo.url).toMatch(/\/files\/.+\/raw\?exp=/);

    const elsewhere = await createInstitution();
    expect((await api(elsewhere).get(`/manager/students/${member._id}/profile`, admin.token)).status).toBe(404);
  });

  it("shows the batch and the semester staff set for it", async () => {
    const { admin, batch, token, call } = await setUp();
    expect((await call.patch(`/ops/batches/${batch._id}`, token).send({ semester: 3 })).status).toBe(403);
    expect((await call.patch(`/ops/batches/${batch._id}`, admin.token).send({ semester: 13 })).status).toBe(400);
    expect((await call.patch(`/ops/batches/${batch._id}`, admin.token).send({ semester: 3 })).body.batch.semester).toBe(3);
    expect((await call.get("/ops/batches", admin.token)).body.batches).toEqual([{ id: String(batch._id), name: "MBA 2025-27", semester: 3 }]);
    expect((await call.get("/profile", token)).body.batch).toMatchObject({ name: "MBA 2025-27", semester: 3 });
    const me = await call.get("/me", token);
    expect(me.body.batch.semester).toBe(3);
    expect(me.body.profileCompletion.percent).toBe(27);
  });
});
