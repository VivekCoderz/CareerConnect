// Campus portal: tenant, import, sign-in, consent, profile, bands, isolation, sessions, reports.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const ExcelJS = require("exceljs");
const { api, createInstitution, createAdmin, importStudents, signIn, csv, createAssessment } = require("../helpers/campus");
const CampusMember = require("../../campus/models/CampusMember");
const { CampusSession } = require("../../campus/models/CampusSession");
const { bandFor } = require("../../campus/utils/bands");

const ROWS = [
  ["Fake One", "one@fakeuni.test", "R1", "5.99", "9876500001"],
  ["Fake Two", "two@fakeuni.test", "R2", "6", "9876500002"],
  ["Fake Three", "three@fakeuni.test", "R3", "7.99", "9876500003"],
  ["Fake Four", "four@fakeuni.test", "R4", "8.0", "9876500004"],
];

describe("tenant", () => {
  it("is 404 for an unknown portal and returns public details for a known one", async () => {
    const uni = await createInstitution({ name: "Fake Sandip" });
    expect((await api({ slug: "nope" }).get("/tenant")).status).toBe(404);
    const res = await api(uni).get("/tenant");
    expect(res.status).toBe(200);
    expect(res.body.institution).toMatchObject({ name: "Fake Sandip" });
    expect(res.body.institution.allowedEmailDomains).toBeUndefined();
  });
});

describe("CGPA bands (PRD R7)", () => {
  it("puts 6.0 in Band 2 and 8.0 in Band 3", () => {
    expect([bandFor(5.99), bandFor(6), bandFor(7.99), bandFor(8), bandFor(null), bandFor(11)]).toEqual([1, 2, 2, 3, null, null]);
  });
});

describe("import (PRD R3)", () => {
  it("previews row errors, creates valid rows once, and sets bands", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    const bad = await api(uni).post("/ops/import/preview", admin.token)
      .attach("file", csv([...ROWS, ["", "x@gmail.com", "R9", "11", "12"], ["Dup", "one@fakeuni.test", "R1", "7", ""]]), "s.csv");
    expect(bad.status).toBe(200);
    expect(bad.body.summary).toMatchObject({ total: 6, valid: 4, invalid: 2 });
    expect(bad.body.rows[4].errors.join(" ")).toMatch(/Name is missing.*fakeuni\.test.*CGPA.*Phone/);
    expect(bad.body.rows[5].errors.join(" ")).toMatch(/Same email as line 2/);
    expect(await CampusMember.countDocuments({ institutionId: uni._id })).toBe(0);

    await importStudents(uni, admin.token, ROWS);
    await importStudents(uni, admin.token, ROWS);
    const members = await CampusMember.find({ institutionId: uni._id }).sort({ rollNo: 1 });
    expect(members.map((m) => m.band)).toEqual([1, 2, 2, 3]);
  });

  it("is for E2Job admins only", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    await importStudents(uni, admin.token, ROWS.slice(0, 1));
    const student = await signIn(uni, "one@fakeuni.test");
    expect((await api(uni).post("/ops/import/preview", student).attach("file", csv(ROWS), "s.csv")).status).toBe(403);
  });
});

describe("sign-in, consent and profile (PRD R4 to R6)", () => {
  it("refuses unregistered emails and asks for consent first", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    await importStudents(uni, admin.token, ROWS.slice(0, 1));
    expect((await api(uni).post("/auth/dev").send({ email: "stranger@fakeuni.test" })).body.code).toBe("NOT_REGISTERED");
    const token = await signIn(uni, "one@fakeuni.test", { consent: false });
    expect((await api(uni).get("/me", token)).body.needsConsent).toBe(true);
    expect((await api(uni).get("/assessments", token)).body.code).toBe("CONSENT_REQUIRED");
    await api(uni).post("/consent", token).send({ accepted: true });
    expect((await api(uni).get("/assessments", token)).status).toBe(200);
  });

  it("makes a verified CGPA pending again when the student edits it", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    await importStudents(uni, admin.token, ROWS.slice(0, 1));
    const member = await CampusMember.findOne({ institutionId: uni._id });
    await api(uni).post(`/ops/members/${member._id}/verify`, admin.token).send({ verified: true });
    const token = await signIn(uni, "one@fakeuni.test");
    const res = await api(uni).patch("/profile", token).send({ cgpa: 8.2 });
    expect(res.body.member).toMatchObject({ cgpa: 8.2, band: 3, verification: { status: "pending" } });
    expect((await api(uni).patch("/profile", token).send({ cgpa: 12 })).status).toBe(400);
  });

  it("keeps universities apart", async () => {
    const a = await createInstitution();
    const b = await createInstitution();
    const admin = await createAdmin();
    await importStudents(a, admin.token, ROWS.slice(0, 1));
    const token = await signIn(a, "one@fakeuni.test");
    expect((await api(b).get("/me", token)).body.code).toBe("NOT_A_MEMBER");
    expect((await api(b).post("/auth/dev").send({ email: "one@fakeuni.test" })).body.code).toBe("NOT_REGISTERED");
  });
});

describe("training sessions (PRD R13)", () => {
  it("shows a band's class only to that band, opens Join 15 minutes before, and records attendance once", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    await importStudents(uni, admin.token, ROWS);
    const soon = await api(uni).post("/ops/sessions", admin.token).send({
      title: "Band 1 class", band: 1, meetUrl: "https://meet.google.com/abc-defg-hij",
      startAt: new Date(Date.now() + 10 * 60 * 1000), endAt: new Date(Date.now() + 70 * 60 * 1000),
    });
    expect(soon.status).toBe(201);
    const later = await api(uni).post("/ops/sessions", admin.token).send({
      title: "Everyone", meetUrl: "https://meet.google.com/xyz-abcd-efg",
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000), endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });
    expect((await api(uni).post("/ops/sessions", admin.token).send({ title: "Bad", meetUrl: "https://evil.test/x", startAt: new Date(), endAt: new Date(Date.now() + 1000) })).status).toBe(400);

    const band1 = await signIn(uni, "one@fakeuni.test");
    const band3 = await signIn(uni, "four@fakeuni.test");
    expect((await api(uni).get("/sessions", band1)).body.upcoming.map((s) => s.title)).toEqual(["Band 1 class", "Everyone"]);
    expect((await api(uni).get("/sessions", band3)).body.upcoming.map((s) => s.title)).toEqual(["Everyone"]);

    const join = await api(uni).post(`/sessions/${soon.body.session._id}/join`, band1);
    expect(join.body.meetUrl).toBe("https://meet.google.com/abc-defg-hij");
    await api(uni).post(`/sessions/${soon.body.session._id}/join`, band1);
    expect((await api(uni).post(`/sessions/${later.body.session._id}/join`, band1)).body.code).toBe("NOT_YET");
    expect((await api(uni).post(`/sessions/${soon.body.session._id}/join`, band3)).status).toBe(404);
    const { CampusAttendance } = require("../../campus/models/CampusSession");
    expect(await CampusAttendance.countDocuments({ sessionId: soon.body.session._id })).toBe(1);
    expect(await CampusSession.countDocuments({ institutionId: uni._id })).toBe(2);
  });
});

describe("university dashboard and reports (PRD R14)", () => {
  it("is for the university's manager and E2Job admins, and the Excel matches the students", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    const batch = await importStudents(uni, admin.token, ROWS);
    await createAssessment(uni, batch);
    const managerRow = await CampusMember.findOne({ institutionId: uni._id, email: "four@fakeuni.test" });
    managerRow.role = "manager";
    await managerRow.save();
    const manager = await signIn(uni, "four@fakeuni.test");
    const student = await signIn(uni, "one@fakeuni.test");

    expect((await api(uni).get("/manager/overview", student)).status).toBe(403);
    const overview = await api(uni).get("/manager/overview", manager);
    expect(overview.body.summary).toMatchObject({ students: 3, published: false });

    const xlsx = await api(uni).get("/manager/reports/results.xlsx", admin.token).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(xlsx.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx.body);
    expect(wb.getWorksheet("Results").rowCount).toBe(4); // header + 3 students

    const pdf = await api(uni).get("/manager/reports/summary.pdf", manager).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("campus sign-in uses only the Authorization header", () => {
  it("ignores an E2Job token cookie from the same browser", async () => {
    const uni = await createInstitution();
    const admin = await createAdmin();
    await importStudents(uni, admin.token, ROWS.slice(0, 1));
    const student = await signIn(uni, "one@fakeuni.test");
    // A cookie for the admin plus the student's header: the student must win.
    const res = await api(uni).get("/me", student).set("Cookie", `token=${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.member.email).toBe("one@fakeuni.test");
    // A cookie alone does not sign anyone in.
    expect((await api(uni).get("/me").set("Cookie", `token=${admin.token}`)).status).toBe(401);
  });
});
