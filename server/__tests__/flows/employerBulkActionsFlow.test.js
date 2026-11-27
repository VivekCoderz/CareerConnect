jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));

const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Notification = require("../../models/Notification");
const { createTestJob } = require("../helpers/createTestJob");
const { createTestUser, createEmployerProfile, createTestEmployer } = require("../helpers/createTestUser");

// Flow 4: students apply, then the employer shortlists some and rejects others in bulk.
const PASSWORD = "Password@123";
const BULK = "/api/applications/bulk-status";

const signIn = async (email) => {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ emailOrUsername: email, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
};

const statusOf = async (ids) => {
  const apps = await Application.find({ _id: { $in: ids } }).lean();
  return Object.fromEntries(apps.map((a) => [String(a._id), a.status]));
};

describe("employer bulk shortlist / reject flow", () => {
  let employer;
  let job;
  let students;
  let applicationIds;

  beforeEach(async () => {
    const employerUser = await createTestEmployer({ email: "flow-bulk-hr@example.com", phone: "9300000001" });
    const profile = await createEmployerProfile(employerUser._id, { companyName: "Bulk Labs" });
    job = await createTestJob(profile._id, { title: "Flow Bulk Job", companyName: "Bulk Labs", createdBy: employerUser._id });

    // Four students apply through the real endpoint.
    students = [];
    applicationIds = [];
    for (let i = 0; i < 4; i++) {
      const user = await createTestUser({ email: `flow-bulk-student${i}@example.com`, phone: `930000001${i}` });
      const agent = await signIn(user.email);
      const res = await agent.post(`/api/applications/job/${job._id}`).send({});
      expect(res.status).toBe(201);
      students.push({ user, agent });
      applicationIds.push(String(res.body.application._id));
    }

    employer = await signIn(employerUser.email);
    employer.user = employerUser;
  });

  it("shows the employer every applicant, then shortlists two and rejects two", async () => {
    const list = await employer.get(`/api/applications/employer/list?jobId=${job._id}`);
    expect(list.status).toBe(200);
    expect(list.body.applications.map((a) => String(a._id)).sort()).toEqual([...applicationIds].sort());

    const [toShortlist, toReject] = [applicationIds.slice(0, 2), applicationIds.slice(2)];

    const shortlist = await employer.patch(BULK).send({ applicationIds: toShortlist, status: "Shortlisted" });
    expect(shortlist.status).toBe(200);
    expect(shortlist.body).toMatchObject({ success: true, updated: 2, skipped: 0, notFound: 0 });

    const reject = await employer.patch(BULK).send({ applicationIds: toReject, status: "Rejected" });
    expect(reject.status).toBe(200);
    expect(reject.body).toMatchObject({ success: true, updated: 2, skipped: 0, notFound: 0 });

    // Every selected application changed in the database, with a history entry by this employer.
    const saved = await Application.find({ _id: { $in: applicationIds } }).lean();
    for (const app of saved) {
      const expected = toShortlist.includes(String(app._id)) ? "Shortlisted" : "Rejected";
      expect(app.status).toBe(expected);
      expect(app.stage).toBe(expected);
      expect(app.overallStatus).toBe(expected === "Rejected" ? "Rejected" : "In Progress");
      const last = app.stageHistory[app.stageHistory.length - 1];
      expect(last.stage).toBe(expected);
      expect(String(last.changedBy)).toBe(String(employer.user._id));
    }

    // Each student sees their new status and gets an in-app notification.
    for (const [i, { agent, user }] of students.entries()) {
      const mine = await agent.get("/api/applications/me");
      expect(mine.body.applications[0].status).toBe(i < 2 ? "Shortlisted" : "Rejected");
      const notes = await Notification.find({ relatedApplicationId: applicationIds[i] }).lean();
      expect(notes).toHaveLength(1);
      expect(String(notes[0].recipient)).toBe(String(user._id));
    }
  });

  it("accepts the short action names the bulk bar sends", async () => {
    const shortlist = await employer.patch(BULK).send({ applicationIds: applicationIds.slice(0, 2), status: "Shortlist" });
    const reject = await employer.patch(BULK).send({ applicationIds: applicationIds.slice(2), status: "Reject" });

    expect(shortlist.body.updated).toBe(2);
    expect(reject.body.updated).toBe(2);
    expect(Object.values(await statusOf(applicationIds)).sort())
      .toEqual(["Rejected", "Rejected", "Shortlisted", "Shortlisted"]);
  });

  it("skips applications already at that status or already final, and counts them", async () => {
    await employer.patch(BULK).send({ applicationIds: [applicationIds[0]], status: "Rejected" }).expect(200);
    await employer.patch(BULK).send({ applicationIds: [applicationIds[1]], status: "Shortlisted" }).expect(200);
    await students[2].agent.patch(`/api/applications/${applicationIds[2]}/withdraw`).send({}).expect(200);

    const res = await employer.patch(BULK).send({ applicationIds, status: "Shortlisted" });

    // Rejected and withdrawn can't be shortlisted; the shortlisted one is already there.
    expect(res.body).toMatchObject({ updated: 1, skipped: 3, notFound: 0 });
    expect(await statusOf(applicationIds)).toEqual({
      [applicationIds[0]]: "Rejected",
      [applicationIds[1]]: "Shortlisted",
      [applicationIds[2]]: "Withdrawn",
      [applicationIds[3]]: "Shortlisted",
    });
  });

  describe("authentication and authorization", () => {
    it("requires a signed-in employer", async () => {
      const signedOut = await request(app).patch(BULK).send({ applicationIds, status: "Shortlisted" });
      expect(signedOut.status).toBe(401);

      const asStudent = await students[0].agent.patch(BULK).send({ applicationIds, status: "Shortlisted" });
      expect(asStudent.status).toBe(403);

      expect(Object.values(await statusOf(applicationIds))).toEqual(["Applied", "Applied", "Applied", "Applied"]);
    });

    it("never changes another employer's applicants", async () => {
      const rivalUser = await createTestEmployer({ email: "flow-bulk-rival@example.com", phone: "9300000099" });
      await createEmployerProfile(rivalUser._id, { companyName: "Rival Co" });
      const rival = await signIn(rivalUser.email);

      const res = await rival.patch(BULK).send({ applicationIds, status: "Rejected" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ updated: 0, notFound: 4 });
      expect(Object.values(await statusOf(applicationIds))).toEqual(["Applied", "Applied", "Applied", "Applied"]);
      expect(await Notification.countDocuments({ relatedApplicationId: { $in: applicationIds } })).toBe(0);
    });

    it("only touches the employer's own applications in a mixed selection", async () => {
      const rivalUser = await createTestEmployer({ email: "flow-bulk-rival2@example.com", phone: "9300000098" });
      const rivalProfile = await createEmployerProfile(rivalUser._id, { companyName: "Rival Two" });
      const rivalJob = await createTestJob(rivalProfile._id, { title: "Rival Job", createdBy: rivalUser._id });
      const rivalApp = await students[0].agent.post(`/api/applications/job/${rivalJob._id}`).send({});
      expect(rivalApp.status).toBe(201);

      const res = await employer.patch(BULK)
        .send({ applicationIds: [...applicationIds, String(rivalApp.body.application._id)], status: "Rejected" });

      expect(res.body).toMatchObject({ updated: 4, notFound: 1 });
      expect((await Application.findById(rivalApp.body.application._id).lean()).status).toBe("Applied");
    });
  });

  it("refuses invalid requests without changing anything", async () => {
    const cases = [
      { applicationIds, status: "Hired" },
      { applicationIds, status: "Offered" },
      { applicationIds: [], status: "Shortlisted" },
      { applicationIds: "not-an-array", status: "Shortlisted" },
      { applicationIds: ["not-an-id"], status: "Shortlisted" },
      { applicationIds: Array(301).fill(applicationIds[0]), status: "Rejected" },
    ];
    for (const body of cases) {
      expect((await employer.patch(BULK).send(body)).status).toBe(400);
    }
    expect(Object.values(await statusOf(applicationIds))).toEqual(["Applied", "Applied", "Applied", "Applied"]);
  });
});
