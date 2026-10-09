// Tripti's 8 Oct bugs.
// BUG-001: the job page links to /companies/:id. Since CC-01 that page opens for unpublished
// profiles too, showing only the basics until the showcase is published.
// BUG-003/004: the welcome notification is plain text, has no same-page link and fits the role.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const Notification = require("../../models/Notification");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;
const phone = (lead) => `${lead}${String(Date.now() + ++seq).slice(-9)}`;

describe("BUG-001 company link on the job page", () => {
  it("tells the page whether the company profile is published", async () => {
    const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: phone(8) });
    const profile = await createEmployerProfile(employer.user._id, { companyName: "Fake Unpublished Co" });
    await EmployerProfile.updateOne({ _id: profile._id }, { $set: { isPublished: false, verificationStatus: "approved" } });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id });

    const before = await request(app).get(`/api/jobs/${job._id}`);
    expect(before.status).toBe(200);
    expect(before.body.job.employerId.isPublished).toBe(false);
    const basics = await request(app).get(`/api/companies/${profile._id}`);
    expect(basics.status).toBe(200);
    expect(basics.body.company.isShowcasePublic).toBe(false);

    await EmployerProfile.updateOne({ _id: profile._id }, { $set: { isPublished: true } });
    const after = await request(app).get(`/api/jobs/${job._id}`);
    expect(after.body.job.employerId.isPublished).toBe(true);
    const showcase = await request(app).get(`/api/companies/${profile._id}`);
    expect(showcase.status).toBe(200);
    expect(showcase.body.company.isShowcasePublic).toBe(true);
  });
});

describe("BUG-003/004 welcome notification", () => {
  const welcomeFor = async (user) => {
    const res = await as(user.token, "get", "/api/notifications");
    expect(res.status).toBe(200);
    return Notification.findOne({ recipient: user.user._id, title: "Welcome to E2Job" }).lean();
  };

  it("is plain text with no link back to the dashboard for a student", async () => {
    const student = await createUserWithToken({ email: `${uniq("stu")}@candidate.test`, phone: phone(7) });
    const welcome = await welcomeFor(student);
    expect(welcome).toBeTruthy();
    expect(welcome.content).not.toMatch(/\*\*/);
    expect(welcome.content).not.toMatch(/RAG|Retrieval/);
    expect(welcome.actionUrl || "").toBe("");
    expect(welcome.content).toMatch(/My Applications/);
  });

  it("speaks to employers about posting and applicants", async () => {
    const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: phone(8) });
    const welcome = await welcomeFor(employer);
    expect(welcome.content).toMatch(/Post a job or internship/);
    expect(welcome.content).not.toMatch(/Ask AI/);
  });

  it("is created once", async () => {
    const student = await createUserWithToken({ email: `${uniq("stu")}@candidate.test`, phone: phone(7) });
    await welcomeFor(student);
    await welcomeFor(student);
    expect(await Notification.countDocuments({ recipient: student.user._id, title: "Welcome to E2Job" })).toBe(1);
  });
});
